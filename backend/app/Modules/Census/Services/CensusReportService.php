<?php

namespace App\Modules\Census\Services;

use App\Core\Database;
use PDO;

/**
 * Census (module 11, Phase 2): the census reports, from the saved daily census.
 *
 *   * Bed occupancy rate = patient days (patients at midnight, summed) ÷ bed days (beds, summed) × 100.
 *   * Average length of stay = days in hospital of the patients who left in the period (discharged
 *     or died) ÷ how many left. Days = discharge date − admission date; a same-day stay counts 1.
 *     By ward: the ward they left from.
 *   * Admissions, discharges, deaths and ward transfers per month (or per day for one month).
 *   * Death rate = died ÷ (discharged + died) × 100.
 * Days not saved (before the census started) are left out and shown as "days saved".
 */
class CensusReportService
{
    public const ROLES = ['admin', 'receptionist', 'doctor', 'clinician', 'charge_nurse', 'accountant'];
    private const MAX_MONTHS = 36;

    /** filters: from, to (YYYY-MM; default the last 12 months), ward_id?, group (month | day; day = the "from" month only) */
    public function report(array $f): array
    {
        $db = Database::connection();
        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();
        $month = fn($v) => preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', (string) $v) ? (string) $v : null;
        $to = $month($f['to'] ?? '') ?? substr($today, 0, 7);
        $from = $month($f['from'] ?? '') ?? date('Y-m', strtotime("{$to}-01 -11 months"));
        if ($from > $to) {
            [$from, $to] = [$to, $from];
        }
        $group = ($f['group'] ?? '') === 'day' ? 'day' : 'month';
        if ($group === 'day') {
            $to = $from;
        } elseif ($this->months($from, $to) > self::MAX_MONTHS) {
            $from = date('Y-m', strtotime("{$to}-01 -" . (self::MAX_MONTHS - 1) . " months"));
        }
        $start = "{$from}-01";
        $end = date('Y-m-d', strtotime("{$to}-01 +1 month"));   // exclusive
        $ward = (int) ($f['ward_id'] ?? 0) ?: null;
        $wardSql = $ward ? ' AND ward_id = :w' : '';
        $params = ['s' => $start, 'e' => $end] + ($ward ? ['w' => $ward] : []);
        $period = $group === 'day' ? 'census_date' : "DATE_FORMAT(census_date, '%Y-%m')";

        $st = $db->prepare(
            "SELECT {$period} AS p, COUNT(DISTINCT census_date) AS days, SUM(midnight_count) AS patient_days, SUM(total_beds) AS bed_days,
                    SUM(admitted) AS admitted, SUM(discharged) AS discharged, SUM(died) AS died, SUM(transferred_in) AS transfers
             FROM census_wards WHERE census_date >= :s AND census_date < :e{$wardSql} GROUP BY p ORDER BY p"
        );
        $st->execute($params);
        $rows = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $rows[$r['p']] = $r;
        }
        $stays = $this->stays($db, $start, $end, $ward, $group === 'day' ? 'DATE(discharge_date)' : "DATE_FORMAT(discharge_date, '%Y-%m')", false);

        // Every period in the range, saved or not.
        $periods = [];
        if ($group === 'day') {
            for ($d = $start; $d < $end && $d <= $today; $d = date('Y-m-d', strtotime("{$d} +1 day"))) {
                $periods[] = $d;
            }
        } else {
            for ($m = $from; $m <= $to; $m = date('Y-m', strtotime("{$m}-01 +1 month"))) {
                $periods[] = $m;
            }
        }
        $series = [];
        foreach ($periods as $p) {
            $r = $rows[$p] ?? null;
            $calendar = $group === 'day' ? 1 : $this->daysSoFar($p, $today);
            $series[] = self::metrics($r, $stays[$p] ?? null) + ['period' => $p, 'calendar_days' => $calendar];
        }

        // By ward, for the whole range.
        $bw = $db->prepare(
            "SELECT ward_id, MAX(ward_name) AS ward_name, COUNT(DISTINCT census_date) AS days, SUM(midnight_count) AS patient_days, SUM(total_beds) AS bed_days,
                    SUM(admitted) AS admitted, SUM(discharged) AS discharged, SUM(died) AS died, SUM(transferred_in) AS transfers
             FROM census_wards WHERE census_date >= :s AND census_date < :e{$wardSql} GROUP BY ward_id ORDER BY ward_name"
        );
        $bw->execute($params);
        $wardStays = $this->stays($db, $start, $end, $ward, 'ward_id', true);
        $byWard = array_map(fn($r) => ['ward_id' => (int) $r['ward_id'], 'ward_name' => $r['ward_name']] + self::metrics($r, $wardStays[(int) $r['ward_id']] ?? null),
            $bw->fetchAll(PDO::FETCH_ASSOC));

        $tot = $db->prepare(
            "SELECT COUNT(DISTINCT census_date) AS days, SUM(midnight_count) AS patient_days, SUM(total_beds) AS bed_days,
                    SUM(admitted) AS admitted, SUM(discharged) AS discharged, SUM(died) AS died, SUM(transferred_in) AS transfers
             FROM census_wards WHERE census_date >= :s AND census_date < :e{$wardSql}"
        );
        $tot->execute($params);
        $allStays = $this->stays($db, $start, $end, $ward, "'all'", false);
        return [
            'from' => $from, 'to' => $to, 'group' => $group, 'ward_id' => $ward, 'today' => $today,
            'series' => $series, 'by_ward' => $byWard,
            'totals' => self::metrics($tot->fetch(PDO::FETCH_ASSOC) ?: null, $allStays['all'] ?? null) + ['calendar_days' => array_sum(array_column($series, 'calendar_days'))],
            'wards' => $db->query("SELECT id, ward_name AS name FROM hospital_wards ORDER BY ward_name")->fetchAll(PDO::FETCH_ASSOC),
        ];
    }

    /**
     * Stays of the patients who left in [start, end): period => [stays, days]. By ward: the ward they
     * left from (the last transfer's ward, else the admission's ward -- inpatient_admissions.ward_id is kept current).
     */
    private function stays(PDO $db, string $start, string $end, ?int $ward, string $groupExpr, bool $byWard): array
    {
        $st = $db->prepare(
            "SELECT {$groupExpr} AS g, COUNT(*) AS n, SUM(GREATEST(1, DATEDIFF(DATE(discharge_date), DATE(admission_date)))) AS days
             FROM inpatient_admissions WHERE discharge_date >= :s AND discharge_date < :e" . ($ward ? ' AND ward_id = :w' : '') . " GROUP BY g"
        );
        $st->execute(['s' => $start, 'e' => $end] + ($ward ? ['w' => $ward] : []));
        $out = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $out[$byWard ? (int) $r['g'] : (string) $r['g']] = ['n' => (int) $r['n'], 'days' => (int) $r['days']];
        }
        return $out;
    }

    private static function metrics(?array $r, ?array $stay): array
    {
        $pd = (int) ($r['patient_days'] ?? 0);
        $bd = (int) ($r['bed_days'] ?? 0);
        $dis = (int) ($r['discharged'] ?? 0);
        $died = (int) ($r['died'] ?? 0);
        return [
            'days_saved' => (int) ($r['days'] ?? 0),
            'patient_days' => $pd, 'bed_days' => $bd,
            'occupancy_pct' => $bd ? round(100 * $pd / $bd, 1) : null,
            'admitted' => (int) ($r['admitted'] ?? 0), 'discharged' => $dis, 'died' => $died, 'transfers' => (int) ($r['transfers'] ?? 0),
            'death_rate_pct' => $dis + $died ? round(100 * $died / ($dis + $died), 1) : null,
            'left' => $stay['n'] ?? 0, 'alos_days' => !empty($stay['n']) ? round($stay['days'] / $stay['n'], 1) : null,
        ];
    }

    private function months(string $from, string $to): int
    {
        [$fy, $fm] = array_map('intval', explode('-', $from));
        [$ty, $tm] = array_map('intval', explode('-', $to));
        return ($ty - $fy) * 12 + ($tm - $fm) + 1;
    }

    /** Calendar days of the month up to today (a month in the future: 0). */
    private function daysSoFar(string $month, string $today): int
    {
        $first = "{$month}-01";
        if ($first > $today) {
            return 0;
        }
        $last = date('Y-m-t', strtotime($first));
        return (int) round((strtotime(min($last, $today)) - strtotime($first)) / 86400) + 1;
    }
}
