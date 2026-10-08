<?php

namespace App\Modules\CodeBlue\Services;

use App\Core\Database;
use PDO;

/**
 * Code Blue (module 10, Phase 3): review and reports.
 *
 *   * report() -- codes per unit for a date range: how many, false alarms, outcomes, and the time
 *                 from the call to the first CPR, the first shock and the first adrenaline
 *                 (from the code record; struck-out entries don't count). Times are measured from
 *                 when the code was called (an entry timed before the call counts as 0:00).
 *   * metrics() -- the same times for one code (the code sheet).
 *   * forPatient() -- a patient's codes (the chart's code sheets).
 */
class CodeBlueReportService
{
    public const ROLES = ['admin', 'doctor', 'clinician', 'charge_nurse'];
    /** Common quality targets: first shock within 2 minutes, first adrenaline within 5 minutes. */
    public const SHOCK_TARGET_S = 120;
    public const EPI_TARGET_S = 300;
    private const SHOCKABLE = ['VF', 'pVT'];

    /** filters: from, to (YYYY-MM-DD; default the last 90 days), ward_id? ('none' = not on a ward) */
    public function report(array $filters): array
    {
        $db = Database::connection();
        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();
        $to = self::date($filters['to'] ?? '') ?? $today;
        $from = self::date($filters['from'] ?? '') ?? date('Y-m-d', strtotime("{$to} -89 days"));
        if ($from > $to) {
            [$from, $to] = [$to, $from];
        }
        $where = ['e.called_at >= :from', 'e.called_at < :to + INTERVAL 1 DAY'];
        $params = ['from' => $from, 'to' => $to];
        $ward = (string) ($filters['ward_id'] ?? '');
        if ($ward === 'none') {
            $where[] = 'e.ward_id IS NULL';
        } elseif ((int) $ward) {
            $where[] = 'e.ward_id = :w';
            $params['w'] = (int) $ward;
        }
        $st = $db->prepare(
            "SELECT e.id, e.status, e.ward_id, hw.ward_name, e.location, e.called_at, e.ended_at, e.outcome, e.outcome_at, e.patient_id,
                    TIMESTAMPDIFF(SECOND, e.called_at, COALESCE(e.ended_at, NOW())) AS seconds
             FROM code_blue_events e LEFT JOIN hospital_wards hw ON hw.id = e.ward_id
             WHERE " . implode(' AND ', $where) . " ORDER BY e.called_at DESC"
        );
        $st->execute($params);
        $events = $st->fetchAll(PDO::FETCH_ASSOC);
        $m = $this->metricsFor(array_map(fn($e) => (int) $e['id'], $events));

        $codes = [];
        $units = [];
        $all = self::blankUnit('All units');
        foreach ($events as $e) {
            $id = (int) $e['id'];
            $x = $m[$id] ?? self::noMetrics();
            $codes[] = [
                'id' => $id, 'status' => $e['status'], 'unit' => $e['ward_name'] ?: 'Not on a ward', 'location' => $e['location'],
                'called_at' => $e['called_at'], 'seconds' => (int) $e['seconds'], 'outcome' => $e['outcome'],
                'outcome_label' => $e['outcome'] ? (CodeBlueRecordService::OUTCOMES[$e['outcome']] ?? $e['outcome']) : null,
                'outcome_at' => $e['outcome_at'], 'has_patient' => $e['patient_id'] !== null,
            ] + $x;
            $key = $e['ward_id'] !== null ? (string) $e['ward_id'] : 'none';
            $units[$key] ??= self::blankUnit($e['ward_name'] ?: 'Not on a ward') + ['ward_id' => $e['ward_id'] !== null ? (int) $e['ward_id'] : null];
            self::add($units[$key], $e, $x);
            self::add($all, $e, $x);
        }
        $byUnit = array_map([self::class, 'finish'], array_values($units));
        usort($byUnit, fn($a, $b) => $b['codes'] <=> $a['codes'] ?: strcmp($a['unit'], $b['unit']));
        return [
            'from' => $from, 'to' => $to, 'ward_id' => $ward,
            'totals' => self::finish($all), 'by_unit' => $byUnit, 'codes' => $codes,
            'targets' => ['shock_s' => self::SHOCK_TARGET_S, 'epi_s' => self::EPI_TARGET_S],
            'wards' => $db->query("SELECT id, ward_name AS name FROM hospital_wards ORDER BY ward_name")->fetchAll(PDO::FETCH_ASSOC),
        ];
    }

    /** The times for one code (its sheet). */
    public function metrics(int $eventId): array
    {
        return $this->metricsFor([$eventId])[$eventId] ?? self::noMetrics();
    }

    /** A patient's codes, newest first (for the chart). */
    public function forPatient(int $patientId): array
    {
        $st = Database::connection()->prepare(
            "SELECT id, status, location, called_at, ended_at, outcome, outcome_at, TIMESTAMPDIFF(SECOND, called_at, COALESCE(ended_at, NOW())) AS seconds
             FROM code_blue_events WHERE patient_id = :p ORDER BY called_at DESC LIMIT 50"
        );
        $st->execute(['p' => $patientId]);
        return array_map(fn($r) => ['id' => (int) $r['id'], 'status' => $r['status'], 'location' => $r['location'], 'called_at' => $r['called_at'],
            'ended_at' => $r['ended_at'], 'seconds' => (int) $r['seconds'], 'outcome' => $r['outcome'],
            'outcome_label' => $r['outcome'] ? (CodeBlueRecordService::OUTCOMES[$r['outcome']] ?? $r['outcome']) : null, 'outcome_at' => $r['outcome_at']],
            $st->fetchAll(PDO::FETCH_ASSOC));
    }

    // ------------------------------------------------------------------

    /** id => first rhythm, seconds from the call to the first CPR / shock / adrenaline, counts. */
    private function metricsFor(array $ids): array
    {
        if (!$ids) {
            return [];
        }
        $in = implode(',', array_map('intval', $ids));
        $rows = Database::connection()->query(
            "SELECT r.event_id, r.kind, r.value, r.note, GREATEST(0, TIMESTAMPDIFF(SECOND, e.called_at, r.event_at)) AS s
             FROM code_blue_record r JOIN code_blue_events e ON e.id = r.event_id
             WHERE r.event_id IN ({$in}) AND r.voided_at IS NULL ORDER BY r.event_id, r.event_at, r.id"
        )->fetchAll(PDO::FETCH_ASSOC);
        $out = [];
        foreach ($rows as $r) {
            $id = (int) $r['event_id'];
            $out[$id] ??= self::noMetrics();
            $x = &$out[$id];
            $s = (int) $r['s'];
            switch ($r['kind']) {
                case 'cpr_start':
                    $x['to_cpr_s'] ??= $s;
                    break;
                case 'rhythm':
                    $x['first_rhythm'] ??= ($r['value'] === 'Other' && $r['note'] ? $r['note'] : $r['value']);
                    $x['shockable'] ??= in_array($r['value'], self::SHOCKABLE, true);
                    break;
                case 'shock':
                    $x['to_shock_s'] ??= $s;
                    $x['shocks']++;
                    break;
                case 'drug':
                    if (preg_match('/adrenaline|epinephrine/i', (string) $r['value'])) {
                        $x['to_epi_s'] ??= $s;
                        $x['epi_doses']++;
                    }
                    break;
            }
            unset($x);
        }
        return $out;
    }

    private static function noMetrics(): array
    {
        return ['first_rhythm' => null, 'shockable' => null, 'to_cpr_s' => null, 'to_shock_s' => null, 'to_epi_s' => null, 'shocks' => 0, 'epi_doses' => 0];
    }

    private static function blankUnit(string $name): array
    {
        return ['unit' => $name, 'codes' => 0, 'false_alarms' => 0, 'on_now' => 0, 'rosc' => 0, 'icu' => 0, 'died' => 0, 'no_outcome' => 0,
            '_len' => [], '_cpr' => [], '_shock' => [], '_epi' => []];
    }

    private static function add(array &$u, array $e, array $x): void
    {
        if ($e['status'] === 'cancelled') {
            $u['false_alarms']++;
            return;
        }
        $u['codes']++;
        if ($e['status'] === 'active') {
            $u['on_now']++;
        } elseif ($e['outcome'] && isset($u[$e['outcome']])) {
            $u[$e['outcome']]++;
        } else {
            $u['no_outcome']++;
        }
        if ($e['status'] === 'ended') {
            $u['_len'][] = (int) $e['seconds'];
        }
        foreach (['cpr' => 'to_cpr_s', 'shock' => 'to_shock_s', 'epi' => 'to_epi_s'] as $k => $f) {
            if ($x[$f] !== null) {
                $u["_{$k}"][] = $x[$f];
            }
        }
    }

    private static function finish(array $u): array
    {
        $med = function (array $v): ?int {
            if (!$v) {
                return null;
            }
            sort($v);
            $n = count($v);
            return (int) round($n % 2 ? $v[intdiv($n, 2)] : ($v[$n / 2 - 1] + $v[$n / 2]) / 2);
        };
        $within = fn(array $v, int $t) => $v ? (int) round(100 * count(array_filter($v, fn($s) => $s <= $t)) / count($v)) : null;
        $withOutcome = $u['rosc'] + $u['icu'] + $u['died'];
        $out = [
            'unit' => $u['unit'], 'codes' => $u['codes'], 'false_alarms' => $u['false_alarms'], 'on_now' => $u['on_now'],
            'rosc' => $u['rosc'], 'icu' => $u['icu'], 'died' => $u['died'], 'no_outcome' => $u['no_outcome'],
            // Survived the code: ROSC or transferred to ICU, of the codes with an outcome.
            'survived_pct' => $withOutcome ? (int) round(100 * ($u['rosc'] + $u['icu']) / $withOutcome) : null,
            'median_length_s' => $med($u['_len']),
            'median_to_cpr_s' => $med($u['_cpr']), 'cpr_n' => count($u['_cpr']),
            'median_to_shock_s' => $med($u['_shock']), 'shock_n' => count($u['_shock']), 'shock_within_pct' => $within($u['_shock'], self::SHOCK_TARGET_S),
            'median_to_epi_s' => $med($u['_epi']), 'epi_n' => count($u['_epi']), 'epi_within_pct' => $within($u['_epi'], self::EPI_TARGET_S),
        ];
        if (array_key_exists('ward_id', $u)) {
            $out['ward_id'] = $u['ward_id'];
        }
        return $out;
    }

    private static function date(string $d): ?string
    {
        return preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) && strtotime($d) ? $d : null;
    }
}
