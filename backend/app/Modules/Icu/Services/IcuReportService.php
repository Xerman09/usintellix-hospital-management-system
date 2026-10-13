<?php

namespace App\Modules\Icu\Services;

use App\Core\Database;
use PDO;

/**
 * ICU (module 13, Phase 3): the ICU report for a date range (optionally one ICU ward).
 *
 *   * Stays: admissions to the ICU (by where from), patients who left (to a ward, home, died), length of stay,
 *     bed occupancy, readmission to the ICU within 48 h.
 *   * Mortality: died in the ICU; died in hospital (the ICU stay's admission ended in death); against the
 *     APACHE II predicted mortality (standardised mortality ratio = observed / expected), by APACHE II band.
 *   * Severity: APACHE II (first 24 h), SOFA on the first ICU day and the highest SOFA.
 *   * Devices (CDC/NHSN way of counting -- a calendar day counts when the device was in at any time that day while
 *     the patient was in the ICU): patient days, ventilator days, central line days, urinary catheter days, the
 *     device utilisation ratios, and CLABSI / CAUTI / VAP from the HAI/SSI log (onset in the ICU stay or the day
 *     after leaving) per 1,000 device days. devices() is the same block for the HAI/SSI report.
 */
class IcuReportService
{
    public const ROLES = ['admin', 'doctor', 'clinician', 'charge_nurse'];
    private const OUTCOMES = ['ward' => 'To a ward', 'discharged' => 'Discharged from hospital', 'died' => 'Died in the ICU', 'other' => 'Other'];
    private const HAI = ['CLABSI' => 'central', 'CAUTI' => 'urinary', 'VAP' => 'ventilator'];

    public function report(?string $from, ?string $to, ?int $wardId = null): array
    {
        $db = Database::connection();
        (new IcuBoardService())->syncStays($db);
        [$from, $to, $now] = $this->period($db, $from, $to);
        $start = "{$from} 00:00:00";
        $stop = "{$to} 23:59:59";
        $stays = $this->stays($db, $start, $stop, $wardId);
        $scores = new IcuScoreService();
        foreach ($stays as $s) {
            $scores->ensure($db, $s, $now);
        }
        $sum = $scores->summaries($db, array_column($stays, 'id'));
        $dev = $this->deviceDays($db, $stays, $start, min($stop, $now), $now);

        $admitted = array_values(array_filter($stays, fn($s) => $s['in_at'] >= $start && $s['in_at'] <= $stop));
        $ended = array_values(array_filter($stays, fn($s) => $s['out_at'] && $s['out_at'] >= $start && $s['out_at'] <= $stop));
        $los = array_map(fn($s) => (self::ts($s['out_at']) - self::ts($s['in_at'])) / 86400, $ended);
        $days = count(IcuLinesService::range($from, $to));
        $beds = $this->beds($db, $wardId);
        $bedDays = 0.0;
        foreach ($stays as $s) {
            $a = max(self::ts($s['in_at']), self::ts($start));
            $b = min(self::ts($s['out_at'] ?: $now), self::ts($stop) + 1, self::ts($now));
            $bedDays += max(0, $b - $a) / 86400;
        }
        // Elapsed part of the period only (a period running into the future isn't empty beds).
        $elapsed = max(0, min(self::ts($stop) + 1, self::ts($now)) - self::ts($start)) / 86400;

        $outcomes = array_fill_keys(array_keys(self::OUTCOMES), 0);
        $hospDied = 0;
        $stillIn = 0;
        $readmit = 0;
        $toWard = 0;
        $observed = 0;
        $expected = 0.0;
        $withApache = 0;
        $bands = array_map(fn($b) => ['label' => $b[2], 'stays' => 0, 'died' => 0, 'predicted_sum' => 0.0], IcuScoreService::APACHE_BANDS);
        $rows = [];
        // Hospital outcome (and the APACHE II comparison) once per hospital admission: its last ICU stay.
        $lastIn = $stays ? $db->query("SELECT admission_id, MAX(in_at) FROM icu_stays WHERE admission_id IN ("
            . implode(',', array_unique(array_map(fn($s) => (int) $s['admission_id'], $stays))) . ") GROUP BY admission_id")->fetchAll(PDO::FETCH_KEY_PAIR) : [];
        $finals = 0;
        foreach ($stays as $s) {
            $sc = $sum[(int) $s['id']] ?? ['apache' => null, 'predicted' => null, 'sofa_first' => null, 'sofa_max' => null, 'sofa_days' => 0];
            $diedHosp = IcuBoardService::died($s);
            $isEnded = $s['out_at'] && $s['out_at'] >= $start && $s['out_at'] <= $stop;
            $re = null;
            if ($s['out_at'] && $s['out_to'] === 'ward') {
                $next = $db->prepare("SELECT in_at FROM icu_stays WHERE patient_id = :p AND in_at > :o AND in_at <= :o2 + INTERVAL 48 HOUR ORDER BY in_at LIMIT 1");
                $next->execute(['p' => $s['patient_id'], 'o' => $s['out_at'], 'o2' => $s['out_at']]);
                $re = $next->fetchColumn() ?: null;
            }
            if ($isEnded) {
                $outcomes[isset(self::OUTCOMES[$s['out_to']]) ? $s['out_to'] : 'other']++;
                if ($s['out_to'] === 'ward') {
                    $toWard++;
                    $readmit += (int) (bool) $re;
                }
                $final = ($lastIn[$s['admission_id']] ?? null) === $s['in_at'];
                if ($final) {
                    $finals++;
                    $hospDied += (int) ($diedHosp || $s['out_to'] === 'died');
                    $stillIn += (int) in_array($s['adm_status'], ['Admitted', 'Pending Discharge'], true);
                }
                if ($final && $sc['apache'] !== null && $sc['predicted'] !== null) {
                    $withApache++;
                    $d = (int) ($diedHosp || $s['out_to'] === 'died');
                    $observed += $d;
                    $expected += $sc['predicted'] / 100;
                    foreach (IcuScoreService::APACHE_BANDS as $i => [$lo, $hi]) {
                        if ($sc['apache'] >= $lo && $sc['apache'] <= $hi) {
                            $bands[$i]['stays']++;
                            $bands[$i]['died'] += $d;
                            $bands[$i]['predicted_sum'] += $sc['predicted'];
                        }
                    }
                }
            }
            $aid = (int) $s['admission_id'];
            $rows[] = [
                'stay_id' => (int) $s['id'], 'admission_id' => $aid, 'name' => $s['patient_name'], 'mrn' => $s['patient_mrn'], 'age' => $s['patient_age'],
                'ward' => $s['ward_name'], 'bed' => $s['bed_number'], 'in_at' => $s['in_at'], 'out_at' => $s['out_at'], 'source' => IcuBoardService::SOURCES[$s['source']] ?? $s['source'],
                'los_days' => round(((self::ts($s['out_at'] ?: $now)) - self::ts($s['in_at'])) / 86400, 1),
                'outcome' => $s['out_at'] ? (self::OUTCOMES[$s['out_to']] ?? ($s['out_to'] ?: 'Other')) : 'Still in the ICU',
                'died_in_hospital' => $diedHosp || $s['out_to'] === 'died', 'readmitted_48h' => (bool) $re,
                'apache' => $sc['apache'], 'predicted' => $sc['predicted'], 'sofa_first' => $sc['sofa_first'], 'sofa_max' => $sc['sofa_max'],
                'vent_days' => count($dev['by_admission'][$aid]['ventilator'] ?? []), 'central_days' => count($dev['by_admission'][$aid]['central'] ?? []),
                'urinary_days' => count($dev['by_admission'][$aid]['urinary'] ?? []), 'patient_days' => count($dev['by_admission'][$aid]['patient'] ?? []),
                'diagnosis' => $s['admitting_diagnosis'],
            ];
        }
        $nEnded = count($ended);
        $apacheAdm = array_values(array_filter(array_map(fn($s) => $sum[(int) $s['id']]['apache'] ?? null, $admitted), fn($x) => $x !== null));
        $sofaFirst = array_values(array_filter(array_map(fn($s) => $sum[(int) $s['id']]['sofa_first'] ?? null, $admitted), fn($x) => $x !== null));
        $sources = [];
        foreach ($admitted as $s) {
            $k = IcuBoardService::SOURCES[$s['source']] ?? $s['source'];
            $sources[$k] = ($sources[$k] ?? 0) + 1;
        }
        arsort($sources);

        return [
            'from' => $from, 'to' => $to, 'days' => $days, 'now' => $now, 'ward_id' => $wardId,
            'wards' => $db->query("SELECT id, ward_name FROM hospital_wards WHERE ward_type = 'ICU' AND is_active = 1 ORDER BY id")->fetchAll(PDO::FETCH_ASSOC),
            'totals' => [
                'admitted' => count($admitted), 'ended' => $nEnded, 'beds' => $beds, 'bed_days' => round($bedDays, 1),
                'occupancy_pct' => $beds && $elapsed > 0 ? round(100 * $bedDays / ($beds * $elapsed), 1) : null,
                'avg_census' => $elapsed > 0 ? round($bedDays / $elapsed, 1) : null,
                'los_median' => self::median($los), 'los_mean' => $los ? round(array_sum($los) / count($los), 1) : null, 'los_over_7' => count(array_filter($los, fn($x) => $x > 7)),
                'icu_deaths' => $outcomes['died'], 'icu_mortality_pct' => $nEnded ? round(100 * $outcomes['died'] / $nEnded, 1) : null,
                'hospital_deaths' => $hospDied, 'hospital_mortality_pct' => $finals ? round(100 * $hospDied / $finals, 1) : null, 'patients_left' => $finals, 'still_in_hospital' => $stillIn,
                'readmitted_48h' => $readmit, 'to_ward' => $toWard, 'readmit_pct' => $toWard ? round(100 * $readmit / $toWard, 1) : null,
                'apache_median' => self::median($apacheAdm), 'apache_mean' => $apacheAdm ? round(array_sum($apacheAdm) / count($apacheAdm), 1) : null, 'apache_count' => count($apacheAdm),
                'sofa_first_median' => self::median($sofaFirst),
                'smr' => $expected > 0 ? round($observed / $expected, 2) : null, 'observed' => $observed, 'expected' => round($expected, 1), 'with_apache' => $withApache,
            ],
            'outcomes' => array_map(fn($k, $l) => ['key' => $k, 'label' => $l, 'count' => $outcomes[$k], 'pct' => $nEnded ? round(100 * $outcomes[$k] / $nEnded, 1) : null],
                array_keys(self::OUTCOMES), self::OUTCOMES),
            'sources' => array_map(fn($k, $v) => ['source' => $k, 'count' => $v], array_keys($sources), $sources),
            'apache_bands' => array_map(fn($b) => ['label' => $b['label'], 'stays' => $b['stays'], 'died' => $b['died'],
                'observed_pct' => $b['stays'] ? round(100 * $b['died'] / $b['stays'], 1) : null, 'predicted_pct' => $b['stays'] ? round($b['predicted_sum'] / $b['stays'], 1) : null], $bands),
            'devices' => $dev['summary'],
            'series' => $this->series($from, $to, $stays, $dev, $now),
            'group' => $days > 62 ? 'month' : 'day',
            'stays' => $rows,
        ];
    }

    /** The ICU device-day block of the HAI/SSI report (date range, default this month). */
    public function devices(?string $from, ?string $to): array
    {
        $db = Database::connection();
        (new IcuBoardService())->syncStays($db);
        [$from, $to, $now] = $this->period($db, $from, $to, true);
        $start = "{$from} 00:00:00";
        $stop = "{$to} 23:59:59";
        $stays = $this->stays($db, $start, $stop, null);
        return ['from' => $from, 'to' => $to] + $this->deviceDays($db, $stays, $start, min($stop, $now), $now)['summary'];
    }

    // ------------------------------------------------------------------
    // Device days
    // ------------------------------------------------------------------

    /**
     * Calendar days in the ICU and with each device (only while in the ICU, only in the period), per admission and in all;
     * CLABSI / CAUTI / VAP of the HAI log attributed to these stays.
     */
    private function deviceDays(PDO $db, array $stays, string $start, string $stop, string $now): array
    {
        $byAdm = [];
        $aids = array_values(array_unique(array_map(fn($s) => (int) $s['admission_id'], $stays)));
        $lines = new IcuLinesService();
        $groups = [];
        foreach (['central', 'urinary', 'ventilator'] as $g) {
            $groups[$g] = $lines->dates($db, $aids, $g, $start, $stop);
        }
        $ventPatients = [];
        foreach ($stays as $s) {
            $aid = (int) $s['admission_id'];
            $a = max($s['in_at'], $start);
            $b = min($s['out_at'] ?: $now, $stop);
            if ($a > $b) {
                continue;
            }
            $inDays = array_fill_keys(IcuLinesService::range($a, $b), true);
            $byAdm[$aid]['patient'] = ($byAdm[$aid]['patient'] ?? []) + $inDays;
            foreach ($groups as $g => $dates) {
                // Only while in the ICU: the device's dates within this stay.
                $own = array_intersect_key($dates[$aid] ?? [], $inDays);
                $byAdm[$aid][$g] = ($byAdm[$aid][$g] ?? []) + $own;
                if ($g === 'ventilator' && $own) {
                    $ventPatients[$aid] = true;
                }
            }
        }
        $total = fn($g) => array_sum(array_map(fn($x) => count($x[$g] ?? []), $byAdm));
        $pd = $total('patient');
        $sum = ['patient_days' => $pd, 'ventilator_days' => $total('ventilator'), 'central_days' => $total('central'), 'urinary_days' => $total('urinary'),
            'ventilated_patients' => count($ventPatients), 'patients' => count($byAdm)];
        foreach (['ventilator', 'central', 'urinary'] as $g) {
            $sum["{$g}_ratio"] = $pd ? round($sum["{$g}_days"] / $pd, 2) : null;
        }

        // Infections: onset in the period, the patient in the ICU then (or the day after leaving: CDC transfer rule).
        $hai = [];
        $q = $db->prepare(
            "SELECT id, tracking_number, infection_type, onset_date, patient_id, patient_name, status FROM hai_ssi_infections
             WHERE infection_type IN ('CLABSI', 'CAUTI', 'VAP') AND onset_date >= :f AND onset_date <= :t"
        );
        $q->execute(['f' => substr($start, 0, 10), 't' => substr($stop, 0, 10)]);
        $unlinked = 0;
        foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $h) {
            $in = false;
            foreach ($stays as $s) {
                if ((int) $s['patient_id'] === (int) $h['patient_id'] && $h['onset_date'] >= substr($s['in_at'], 0, 10)
                    && $h['onset_date'] <= IcuLinesService::shift(substr($s['out_at'] ?: $now, 0, 10), 1)) {
                    $in = true;
                    break;
                }
            }
            if ($in) {
                $hai[$h['infection_type']][] = ['id' => (int) $h['id'], 'tracking_number' => $h['tracking_number'], 'onset_date' => $h['onset_date'], 'patient' => $h['patient_name']];
            } elseif (!$h['patient_id']) {
                $unlinked++;
            }
        }
        $sum['infections'] = [];
        foreach (self::HAI as $type => $g) {
            $n = count($hai[$type] ?? []);
            $denom = $sum["{$g}_days"];
            $sum['infections'][] = ['type' => $type, 'device' => ['central' => 'Central line days', 'urinary' => 'Urinary catheter days', 'ventilator' => 'Ventilator days'][$g],
                'count' => $n, 'device_days' => $denom, 'rate' => $denom ? round(1000 * $n / $denom, 2) : null, 'cases' => $hai[$type] ?? []];
        }
        $sum['unlinked'] = $unlinked;
        return ['summary' => $sum, 'by_admission' => $byAdm];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** ICU stays overlapping the period, with the admission. */
    private function stays(PDO $db, string $start, string $stop, ?int $wardId): array
    {
        $st = $db->prepare(
            "SELECT s.*, a.patient_name, a.patient_mrn, a.patient_age, a.admitting_diagnosis, a.status, a.status AS adm_status, a.discharge_disposition, w.ward_name, b.bed_number
             FROM icu_stays s JOIN inpatient_admissions a ON a.id = s.admission_id LEFT JOIN hospital_wards w ON w.id = s.ward_id LEFT JOIN hospital_beds b ON b.id = s.bed_id
             WHERE s.in_at <= :stop AND (s.out_at IS NULL OR s.out_at >= :start)" . ($wardId ? " AND s.ward_id = :w" : '') . " ORDER BY s.in_at"
        );
        $st->execute(['stop' => $stop, 'start' => $start] + ($wardId ? ['w' => $wardId] : []));
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    private function beds(PDO $db, ?int $wardId): int
    {
        return (int) $db->query(
            "SELECT COUNT(*) FROM hospital_beds b JOIN hospital_wards w ON w.id = b.ward_id AND w.ward_type = 'ICU' AND w.is_active = 1 WHERE b.is_active = 1"
            . ($wardId ? ' AND w.id = ' . (int) $wardId : '')
        )->fetchColumn();
    }

    /** Per day (or month): ICU admissions, deaths in the ICU, average census, ventilator days. */
    private function series(string $from, string $to, array $stays, array $dev, string $now): array
    {
        $month = count(IcuLinesService::range($from, $to)) > 62;
        $key = fn($d) => $month ? substr($d, 0, 7) : substr($d, 0, 10);
        $out = [];
        foreach (IcuLinesService::range($from, $to) as $d) {
            $k = $key($d);
            $out[$k] ??= ['period' => $month ? "{$k}-01" : $k, 'admitted' => 0, 'died' => 0, 'patient_days' => 0, 'ventilator_days' => 0, 'days' => 0];
            $out[$k]['days'] += (int) ($d <= substr($now, 0, 10));
        }
        foreach ($stays as $s) {
            if (isset($out[$key($s['in_at'])]) && substr($s['in_at'], 0, 10) >= $from) {
                $out[$key($s['in_at'])]['admitted']++;
            }
            if ($s['out_at'] && $s['out_to'] === 'died' && isset($out[$key($s['out_at'])]) && substr($s['out_at'], 0, 10) <= $to) {
                $out[$key($s['out_at'])]['died']++;
            }
        }
        foreach ($dev['by_admission'] as $x) {
            foreach ($x['patient'] ?? [] as $d => $_) {
                if (isset($out[$key($d)])) {
                    $out[$key($d)]['patient_days']++;
                }
            }
            foreach ($x['ventilator'] ?? [] as $d => $_) {
                if (isset($out[$key($d)])) {
                    $out[$key($d)]['ventilator_days']++;
                }
            }
        }
        return array_values(array_map(fn($x) => $x + ['avg_census' => $x['days'] ? round($x['patient_days'] / $x['days'], 1) : null], $out));
    }

    /** [from, to, now]: dates (default the last 30 days, or this month for the HAI block); at most 2 years. */
    private function period(PDO $db, ?string $from, ?string $to, bool $month = false): array
    {
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $today = substr($now, 0, 10);
        $ok = fn($d) => $d && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) && date('Y-m-d', strtotime($d)) === $d;
        $to = $ok($to) ? $to : $today;
        $from = $ok($from) ? $from : ($month ? substr($to, 0, 8) . '01' : IcuLinesService::shift($to, -29));
        if ($from > $to) {
            [$from, $to] = [$to, $from];
        }
        if (IcuLinesService::shift($from, 731) < $to) {
            $from = IcuLinesService::shift($to, -730);
        }
        return [$from, $to, $now];
    }

    private static function median(array $v): ?float
    {
        if (!$v) {
            return null;
        }
        sort($v);
        $n = count($v);
        return round($n % 2 ? $v[intdiv($n, 2)] : ($v[$n / 2 - 1] + $v[$n / 2]) / 2, 1);
    }

    private static function ts(string $dt): int
    {
        return (new \DateTimeImmutable(substr($dt, 0, 19), new \DateTimeZone('UTC')))->getTimestamp();
    }
}
