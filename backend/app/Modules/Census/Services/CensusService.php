<?php

namespace App\Modules\Census\Services;

use App\Core\Database;
use PDO;

/**
 * Census (module 11, Phase 1: the daily census).
 *
 *   * compute($date) -- the midnight census of one day, rebuilt from the admissions, ward transfers
 *     and discharges: per ward the patients at the start of the day, admitted, transferred in / out,
 *     discharged alive, died, patients at midnight and the beds; per attending doctor (matched to a
 *     provider when the name fits, which gives the specialization) the same.
 *   * save($date) -- stores it (census_days / census_wards / census_doctors) so later edits don't
 *     rewrite history. ensureSaved() saves yesterday (and any day missed in the last 31) -- run by
 *     the nightly job and, as a fallback, by the bell's poll at most every 10 minutes.
 *   * read($date) -- a saved day; today (or a day not saved yet) is computed live and marked so.
 *
 * A patient's ward at any moment: the ward of the last transfer before it, else the admitting ward
 * (the first transfer's "from" ward, or the admission's ward when never transferred).
 * Died: status Deceased, or a discharge disposition saying expired / deceased / died.
 * The attending doctor is the one on the admission now (the admission keeps no history of changes).
 */
class CensusService
{
    public const VIEW_ROLES = ['admin', 'receptionist', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'accountant'];
    public const SAVE_ROLES = ['admin'];
    private const BACKFILL_DAYS = 31;
    private const JOB_SECONDS = 600;
    private const DIED = '/expired|deceased|died|death/i';

    /** @var array<string, array>|null attending text => provider match */
    private ?array $providers = null;

    // ------------------------------------------------------------------
    // Computing a day
    // ------------------------------------------------------------------

    public function compute(string $date): array
    {
        $db = Database::connection();
        $start = "{$date} 00:00:00";
        $end = date('Y-m-d', strtotime("{$date} +1 day")) . ' 00:00:00';

        $st = $db->prepare(
            "SELECT id, ward_id, status, admission_date, discharge_date, discharge_disposition, attending_physician
             FROM inpatient_admissions
             WHERE admission_date < :end AND (discharge_date IS NULL OR discharge_date >= :start)"
        );
        $st->execute(['start' => $start, 'end' => $end]);
        $adms = $st->fetchAll(PDO::FETCH_ASSOC);

        $moves = [];
        if ($adms) {
            $in = implode(',', array_map(fn($a) => (int) $a['id'], $adms));
            foreach ($db->query(
                "SELECT admission_id, from_ward_id, to_ward_id, transfer_time FROM inpatient_transfers
                 WHERE admission_id IN ({$in}) ORDER BY transfer_time, id"
            )->fetchAll(PDO::FETCH_ASSOC) as $t) {
                $moves[(int) $t['admission_id']][] = $t;
            }
        }

        $wards = [];
        foreach ($db->query("SELECT id, ward_name, ward_type, is_active FROM hospital_wards ORDER BY ward_name")->fetchAll(PDO::FETCH_ASSOC) as $w) {
            $wards[(int) $w['id']] = ['ward_id' => (int) $w['id'], 'ward_name' => $w['ward_name'], 'ward_type' => $w['ward_type'], 'is_active' => (int) $w['is_active'],
                'start_count' => 0, 'admitted' => 0, 'transferred_in' => 0, 'transferred_out' => 0, 'discharged' => 0, 'died' => 0, 'midnight_count' => 0];
        }
        $doctors = [];
        $bump = function (int $ward, string $field) use (&$wards) {
            if (isset($wards[$ward])) {
                $wards[$ward][$field]++;
            }
        };

        foreach ($adms as $a) {
            $id = (int) $a['id'];
            $m = $moves[$id] ?? [];
            $first = $m ? (int) $m[0]['from_ward_id'] : (int) $a['ward_id'];
            $wardAt = function (string $t, bool $before) use ($m, $first): int {
                $w = $first;
                foreach ($m as $x) {
                    if ($before ? $x['transfer_time'] < $t : $x['transfer_time'] <= $t) {
                        $w = (int) $x['to_ward_id'];
                    }
                }
                return $w;
            };
            $admittedToday = $a['admission_date'] >= $start;
            $left = $a['discharge_date'] !== null && $a['discharge_date'] < $end;
            $died = $left && ($a['status'] === 'Deceased' || preg_match(self::DIED, (string) $a['discharge_disposition']));
            $atMidnight = !$left;

            if (!$admittedToday) {
                $bump($wardAt($start, true), 'start_count');
            } else {
                $bump($first, 'admitted');
            }
            foreach ($m as $x) {
                if ($x['transfer_time'] >= $start && $x['transfer_time'] < $end && (int) $x['from_ward_id'] !== (int) $x['to_ward_id']) {
                    $bump((int) $x['from_ward_id'], 'transferred_out');
                    $bump((int) $x['to_ward_id'], 'transferred_in');
                }
            }
            if ($left) {
                $bump($wardAt($a['discharge_date'], false), $died ? 'died' : 'discharged');
            } else {
                $bump($wardAt($end, true), 'midnight_count');
            }

            // By doctor.
            $doc = $this->doctor((string) $a['attending_physician']);
            $doctors[$doc['doctor_key']] ??= $doc + ['patients' => 0, 'admitted' => 0, 'discharged' => 0, 'died' => 0];
            $d = &$doctors[$doc['doctor_key']];
            if ($atMidnight) {
                $d['patients']++;
            }
            if ($admittedToday) {
                $d['admitted']++;
            }
            if ($left) {
                $d[$died ? 'died' : 'discharged']++;
            }
            unset($d);
        }

        // Beds: total active beds per ward; out of service only when it reflects that day.
        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();
        $bedsNow = $date >= date('Y-m-d', strtotime("{$today} -1 day"));
        foreach ($db->query(
            "SELECT ward_id, COUNT(*) AS total, SUM(status IN ('Maintenance', 'Blocked')) AS oos FROM hospital_beds WHERE is_active = 1 GROUP BY ward_id"
        )->fetchAll(PDO::FETCH_ASSOC) as $b) {
            if (isset($wards[(int) $b['ward_id']])) {
                $wards[(int) $b['ward_id']]['total_beds'] = (int) $b['total'];
                $wards[(int) $b['ward_id']]['out_of_service_beds'] = $bedsNow ? (int) $b['oos'] : null;
            }
        }
        $out = [];
        foreach ($wards as $w) {
            $w['total_beds'] ??= 0;
            $w['out_of_service_beds'] ??= null;
            $busy = $w['start_count'] + $w['admitted'] + $w['transferred_in'] + $w['transferred_out'] + $w['discharged'] + $w['died'] + $w['midnight_count'];
            if (!$w['is_active'] && !$busy) {
                continue;   // a closed ward with nothing that day
            }
            unset($w['is_active']);
            $out[] = self::beds($w);
        }
        uasort($doctors, fn($x, $y) => $y['patients'] <=> $x['patients'] ?: strcmp($x['doctor_name'], $y['doctor_name']));
        return ['date' => $date, 'wards' => $out, 'doctors' => array_values($doctors)];
    }

    /** available = total − patients at midnight − out of service; occupancy = patients at midnight / total beds. */
    private static function beds(array $w): array
    {
        $w['available_beds'] = $w['total_beds'] ? max(0, $w['total_beds'] - $w['midnight_count'] - (int) ($w['out_of_service_beds'] ?? 0)) : 0;
        $w['occupancy_pct'] = $w['total_beds'] ? round(100 * $w['midnight_count'] / $w['total_beds'], 1) : null;
        return $w;
    }

    // ------------------------------------------------------------------
    // Saving
    // ------------------------------------------------------------------

    /** Save (or re-save) a finished day. source: auto | manual | backfill */
    public function save(string $date, string $source, ?int $userId, ?string $note = null): array
    {
        $db = Database::connection();
        if (!self::validDate($date)) {
            return ['success' => false, 'message' => 'Choose a date.', 'errors' => ['date' => 'Invalid.']];
        }
        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();
        if ($date >= $today) {
            return ['success' => false, 'message' => 'A day is saved after midnight, once it is over.', 'errors' => ['date' => 'Not over yet.']];
        }
        $c = $this->compute($date);
        // Re-saving: keep the beds out of service recorded when the day was first saved.
        $old = $db->prepare("SELECT ward_id, out_of_service_beds FROM census_wards WHERE census_date = :d AND out_of_service_beds IS NOT NULL");
        $old->execute(['d' => $date]);
        $oos = array_column($old->fetchAll(PDO::FETCH_ASSOC), 'out_of_service_beds', 'ward_id');

        $owns = !$db->inTransaction();
        $owns ? $db->beginTransaction() : $db->exec('SAVEPOINT census_save');
        try {
            $db->prepare("DELETE FROM census_wards WHERE census_date = :d")->execute(['d' => $date]);
            $db->prepare("DELETE FROM census_doctors WHERE census_date = :d")->execute(['d' => $date]);
            $iw = $db->prepare(
                "INSERT INTO census_wards (census_date, ward_id, ward_name, ward_type, start_count, admitted, transferred_in, transferred_out, discharged, died,
                                           midnight_count, total_beds, out_of_service_beds, available_beds, occupancy_pct)
                 VALUES (:d, :w, :n, :t, :s, :a, :ti, :to, :dis, :died, :m, :tb, :oos, :av, :occ)"
            );
            foreach ($c['wards'] as $w) {
                if (isset($oos[$w['ward_id']])) {
                    $w['out_of_service_beds'] = (int) $oos[$w['ward_id']];
                    $w = self::beds($w);
                }
                $iw->execute(['d' => $date, 'w' => $w['ward_id'], 'n' => $w['ward_name'], 't' => $w['ward_type'], 's' => $w['start_count'], 'a' => $w['admitted'],
                    'ti' => $w['transferred_in'], 'to' => $w['transferred_out'], 'dis' => $w['discharged'], 'died' => $w['died'], 'm' => $w['midnight_count'],
                    'tb' => $w['total_beds'], 'oos' => $w['out_of_service_beds'], 'av' => $w['available_beds'], 'occ' => $w['occupancy_pct']]);
            }
            $id = $db->prepare(
                "INSERT INTO census_doctors (census_date, doctor_key, doctor_name, provider_id, specialization, patients, admitted, discharged, died)
                 VALUES (:d, :k, :n, :p, :s, :pt, :a, :dis, :died)"
            );
            foreach ($c['doctors'] as $d) {
                $id->execute(['d' => $date, 'k' => $d['doctor_key'], 'n' => $d['doctor_name'], 'p' => $d['provider_id'], 's' => $d['specialization'],
                    'pt' => $d['patients'], 'a' => $d['admitted'], 'dis' => $d['discharged'], 'died' => $d['died']]);
            }
            $db->prepare(
                "INSERT INTO census_days (census_date, source, saved_at, saved_by, note) VALUES (:d, :s, NOW(), :u, :n)
                 ON DUPLICATE KEY UPDATE source = VALUES(source), saved_at = NOW(), saved_by = VALUES(saved_by), note = VALUES(note)"
            )->execute(['d' => $date, 's' => $source, 'u' => $userId, 'n' => $note !== null && trim($note) !== '' ? mb_substr(trim($note), 0, 255) : null]);
            $owns ? $db->commit() : $db->exec('RELEASE SAVEPOINT census_save');
        } catch (\Throwable $e) {
            $owns ? $db->rollBack() : $db->exec('ROLLBACK TO SAVEPOINT census_save');
            throw $e;
        }
        return ['success' => true, 'message' => $source === 'manual' ? "Census for {$date} recalculated and saved." : "Census for {$date} saved.", 'data' => $this->read($date)];
    }

    /**
     * Save yesterday and any day missed in the last BACKFILL_DAYS (from the first admission on).
     * Throttled unless $force (the nightly job). Returns the dates saved.
     */
    public function ensureSaved(bool $force = false): array
    {
        $db = Database::connection();
        if (!$force) {
            $db->exec("INSERT IGNORE INTO alert_job_runs (job, last_run_at) VALUES ('daily_census', '2000-01-01 00:00:00')");
            $claim = $db->prepare("UPDATE alert_job_runs SET last_run_at = NOW() WHERE job = 'daily_census' AND last_run_at <= NOW() - INTERVAL " . self::JOB_SECONDS . " SECOND");
            $claim->execute();
            if ($claim->rowCount() !== 1) {
                return [];
            }
        }
        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();
        $yesterday = date('Y-m-d', strtotime("{$today} -1 day"));
        $first = (string) ($db->query("SELECT DATE(MIN(admission_date)) FROM inpatient_admissions")->fetchColumn() ?: $yesterday);
        $from = max($first, date('Y-m-d', strtotime("{$today} -" . self::BACKFILL_DAYS . " days")));
        $st = $db->prepare("SELECT census_date FROM census_days WHERE census_date BETWEEN :f AND :t");
        $st->execute(['f' => $from, 't' => $yesterday]);
        $have = array_flip($st->fetchAll(PDO::FETCH_COLUMN));
        $saved = [];
        for ($d = $from; $d <= $yesterday; $d = date('Y-m-d', strtotime("{$d} +1 day"))) {
            if (!isset($have[$d])) {
                $this->save($d, $d === $yesterday ? 'auto' : 'backfill', null);
                $saved[] = $d;
            }
        }
        return $saved;
    }

    // ------------------------------------------------------------------
    // Reading
    // ------------------------------------------------------------------

    /** One day: saved, or computed live (today, or a past day not saved yet). Plus the 14 days up to it. */
    public function read(string $date): array
    {
        $db = Database::connection();
        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();
        if (!self::validDate($date) || $date > $today) {
            $date = $today;
        }
        $st = $db->prepare(
            "SELECT d.*, (SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                          FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE u.id = d.saved_by LIMIT 1) AS saved_by_name
             FROM census_days d WHERE d.census_date = :d"
        );
        $st->execute(['d' => $date]);
        $day = $st->fetch(PDO::FETCH_ASSOC) ?: null;
        if ($day) {
            $w = $db->prepare("SELECT * FROM census_wards WHERE census_date = :d ORDER BY ward_name");
            $w->execute(['d' => $date]);
            $wards = array_map([self::class, 'intWard'], $w->fetchAll(PDO::FETCH_ASSOC));
            $dc = $db->prepare("SELECT * FROM census_doctors WHERE census_date = :d ORDER BY patients DESC, doctor_name");
            $dc->execute(['d' => $date]);
            $doctors = array_map(fn($r) => ['doctor_key' => $r['doctor_key'], 'doctor_name' => $r['doctor_name'], 'provider_id' => $r['provider_id'] !== null ? (int) $r['provider_id'] : null,
                'specialization' => $r['specialization'], 'patients' => (int) $r['patients'], 'admitted' => (int) $r['admitted'],
                'discharged' => (int) $r['discharged'], 'died' => (int) $r['died']], $dc->fetchAll(PDO::FETCH_ASSOC));
        } else {
            $c = $this->compute($date);
            $wards = $c['wards'];
            $doctors = $c['doctors'];
        }
        return [
            'date' => $date, 'today' => $today, 'is_today' => $date === $today,
            'saved' => $day ? ['source' => $day['source'], 'saved_at' => $day['saved_at'], 'saved_by_name' => $day['saved_by'] ? $day['saved_by_name'] : null, 'note' => $day['note']] : null,
            'wards' => $wards, 'totals' => self::totals($wards), 'doctors' => $doctors, 'specializations' => self::bySpecialization($doctors),
            'trend' => $this->trend($date, 14),
            'prev' => date('Y-m-d', strtotime("{$date} -1 day")), 'next' => $date < $today ? date('Y-m-d', strtotime("{$date} +1 day")) : null,
        ];
    }

    /** The saved days up to $date (oldest first): totals per day. */
    public function trend(string $date, int $days): array
    {
        $st = Database::connection()->prepare(
            "SELECT census_date, SUM(start_count) s, SUM(admitted) a, SUM(transferred_in) ti, SUM(discharged) dis, SUM(died) died,
                    SUM(midnight_count) m, SUM(total_beds) tb
             FROM census_wards WHERE census_date BETWEEN :f AND :t GROUP BY census_date ORDER BY census_date"
        );
        $st->execute(['f' => date('Y-m-d', strtotime("{$date} -" . ($days - 1) . " days")), 't' => $date]);
        return array_map(fn($r) => ['date' => $r['census_date'], 'start_count' => (int) $r['s'], 'admitted' => (int) $r['a'], 'transfers' => (int) $r['ti'],
            'discharged' => (int) $r['dis'], 'died' => (int) $r['died'], 'midnight_count' => (int) $r['m'], 'total_beds' => (int) $r['tb'],
            'occupancy_pct' => (int) $r['tb'] ? round(100 * (int) $r['m'] / (int) $r['tb'], 1) : null], $st->fetchAll(PDO::FETCH_ASSOC));
    }

    private static function totals(array $wards): array
    {
        $t = ['start_count' => 0, 'admitted' => 0, 'transferred_in' => 0, 'transferred_out' => 0, 'discharged' => 0, 'died' => 0, 'midnight_count' => 0,
            'total_beds' => 0, 'out_of_service_beds' => 0, 'available_beds' => 0, 'oos_known' => true];
        foreach ($wards as $w) {
            foreach (['start_count', 'admitted', 'transferred_in', 'transferred_out', 'discharged', 'died', 'midnight_count', 'total_beds', 'available_beds'] as $k) {
                $t[$k] += (int) $w[$k];
            }
            if ($w['out_of_service_beds'] === null) {
                $t['oos_known'] = false;
            } else {
                $t['out_of_service_beds'] += (int) $w['out_of_service_beds'];
            }
        }
        $t['occupancy_pct'] = $t['total_beds'] ? round(100 * $t['midnight_count'] / $t['total_beds'], 1) : null;
        return $t;
    }

    private static function bySpecialization(array $doctors): array
    {
        $s = [];
        foreach ($doctors as $d) {
            $k = $d['specialization'] ?: '';
            $s[$k] ??= ['specialization' => $d['specialization'], 'doctors' => 0, 'patients' => 0, 'admitted' => 0, 'discharged' => 0, 'died' => 0];
            $s[$k]['doctors']++;
            foreach (['patients', 'admitted', 'discharged', 'died'] as $f) {
                $s[$k][$f] += $d[$f];
            }
        }
        uasort($s, fn($a, $b) => ($a['specialization'] === null) <=> ($b['specialization'] === null) ?: $b['patients'] <=> $a['patients'] ?: strcmp((string) $a['specialization'], (string) $b['specialization']));
        return array_values($s);
    }

    private static function intWard(array $r): array
    {
        foreach (['ward_id', 'start_count', 'admitted', 'transferred_in', 'transferred_out', 'discharged', 'died', 'midnight_count', 'total_beds', 'available_beds'] as $k) {
            $r[$k] = (int) $r[$k];
        }
        $r['out_of_service_beds'] = $r['out_of_service_beds'] !== null ? (int) $r['out_of_service_beds'] : null;
        $r['occupancy_pct'] = $r['occupancy_pct'] !== null ? (float) $r['occupancy_pct'] : null;
        unset($r['id'], $r['census_date']);
        return $r;
    }

    // ------------------------------------------------------------------
    // Doctors
    // ------------------------------------------------------------------

    /** The attending as written, matched to a provider when the first and last names are both in it. */
    private function doctor(string $written): array
    {
        $written = trim($written) !== '' ? trim($written) : 'Not recorded';
        if ($this->providers === null) {
            $this->providers = Database::connection()->query(
                "SELECT p.id, e.first_name, e.last_name,
                        COALESCE((SELECT s.name FROM provider_specializations ps JOIN specializations s ON s.id = ps.specialization_id
                                  WHERE ps.provider_id = p.id ORDER BY ps.is_primary DESC, ps.id LIMIT 1), NULLIF(TRIM(p.specialty), '')) AS specialization
                 FROM providers p JOIN employees e ON e.id = p.employee_id AND e.deleted_at IS NULL WHERE p.deleted_at IS NULL"
            )->fetchAll(PDO::FETCH_ASSOC);
        }
        $words = preg_split('/[^\p{L}\p{N}]+/u', mb_strtolower($written), -1, PREG_SPLIT_NO_EMPTY);
        foreach ($this->providers as $p) {
            $f = mb_strtolower(trim((string) $p['first_name']));
            $l = mb_strtolower(trim((string) $p['last_name']));
            $lw = preg_split('/[^\p{L}\p{N}]+/u', $l, -1, PREG_SPLIT_NO_EMPTY);
            $fw = preg_split('/[^\p{L}\p{N}]+/u', $f, -1, PREG_SPLIT_NO_EMPTY);
            if ($lw && $fw && !array_diff($lw, $words) && in_array($fw[0], $words, true)) {
                return ['doctor_key' => 'provider:' . (int) $p['id'], 'doctor_name' => trim("{$p['first_name']} {$p['last_name']}"), 'provider_id' => (int) $p['id'],
                    'specialization' => $p['specialization'] ?: null];
            }
        }
        return ['doctor_key' => mb_substr($written, 0, 160), 'doctor_name' => mb_substr($written, 0, 160), 'provider_id' => null, 'specialization' => null];
    }

    public static function validDate(string $d): bool
    {
        return (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) && strtotime($d) !== false && date('Y-m-d', strtotime($d)) === $d;
    }
}
