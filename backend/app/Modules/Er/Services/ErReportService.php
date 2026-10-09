<?php

namespace App\Modules\Er\Services;

use App\Core\Database;
use PDO;

/**
 * ER report (module 12, Phase 4), for visits that arrived in a date range (registrations made in
 * error left out):
 *   * visits per day (or month), by hour of arrival, by level, by how they came;
 *   * waiting times: arrival to triage, arrival to doctor (against the target of the level), length of
 *     stay in the ER, boarding (admission decided -> in a ward bed);
 *   * dispositions: home, admitted (admit rate = admitted / visits), transferred, OR, died, left
 *     without being seen;
 *   * protocols: started, complete, and each timed step done on time.
 */
class ErReportService
{
    public const ROLES = ['admin', 'receptionist', 'doctor', 'clinician', 'charge_nurse'];
    private const OUTCOMES = ['discharged' => 'Discharged home', 'admitted' => 'Admitted', 'transferred' => 'Transferred', 'or' => 'To the OR',
        'died' => 'Died in the ER', 'left' => 'Left without being seen', 'open' => 'Still in the ER'];

    public function report(string $from, string $to): array
    {
        $db = Database::connection();
        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();
        $valid = fn($d) => preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) && date('Y-m-d', strtotime($d)) === $d;
        $from = $valid($from) ? $from : substr($today, 0, 8) . '01';
        $to = $valid($to) ? $to : $today;
        if ($to < $from) {
            [$from, $to] = [$to, $from];
        }
        $utc = new \DateTimeZone('UTC');
        $f = new \DateTimeImmutable($from, $utc);
        $t = new \DateTimeImmutable($to, $utc);
        if ($f->diff($t)->days > 366) {
            $from = $t->modify('-366 days')->format('Y-m-d');
            $f = new \DateTimeImmutable($from, $utc);
        }
        $end = $t->modify('+1 day')->format('Y-m-d');
        $span = $f->diff($t)->days + 1;
        $group = $span > 62 ? 'month' : 'day';

        $st = $db->prepare(
            "SELECT v.id, v.status, v.acuity, v.arrival_mode, v.arrived_at, v.disposition, v.er_diagnosis,
                    TIMESTAMPDIFF(MINUTE, v.arrived_at, v.triaged_at) AS to_triage,
                    TIMESTAMPDIFF(MINUTE, v.arrived_at, v.doctor_at) AS to_doctor,
                    TIMESTAMPDIFF(MINUTE, v.arrived_at, v.closed_at) AS los,
                    TIMESTAMPDIFF(MINUTE, v.arrived_at, v.disposition_at) AS to_decision,
                    IF(v.disposition = 'admit', TIMESTAMPDIFF(MINUTE, v.disposition_at, COALESCE(v.admitted_at, NOW())), NULL) AS boarding,
                    v.admitted_at
             FROM er_visits v WHERE v.arrived_at >= :f AND v.arrived_at < :e AND v.status <> 'cancelled' ORDER BY v.arrived_at"
        );
        $st->execute(['f' => $from, 'e' => $end]);
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
        $targets = ErBoardService::targets();

        $num = fn(array $list, string $k) => array_values(array_map('intval', array_filter(array_column($list, $k), fn($x) => $x !== null)));
        $summary = function (array $list) use ($num, $targets): array {
            $n = count($list);
            $closed = array_filter($list, fn($r) => !in_array($r['status'], ['waiting', 'triaged'], true));
            $seen = array_filter($list, fn($r) => $r['to_doctor'] !== null && $r['acuity'] !== null);
            $onTime = count(array_filter($seen, fn($r) => (int) $r['to_doctor'] <= ($targets[(int) $r['acuity']] ?? PHP_INT_MAX)));
            $triaged = $num($list, 'to_triage');
            $admitted = count(array_filter($list, fn($r) => $r['status'] === 'admitted'));
            $left = count(array_filter($list, fn($r) => $r['status'] === 'left'));
            return [
                'visits' => $n,
                'triage_median' => self::median($triaged), 'triage_on_time_pct' => self::pct(count(array_filter($triaged, fn($m) => $m <= $targets[0])), count($triaged)),
                'doctor_median' => self::median($num($list, 'to_doctor')), 'doctor_seen' => count($seen), 'doctor_on_time_pct' => self::pct($onTime, count($seen)),
                'decision_median' => self::median($num($list, 'to_decision')),
                'los_median' => self::median($num($closed, 'los')),
                'los_home_median' => self::median($num(array_filter($closed, fn($r) => $r['status'] === 'discharged'), 'los')),
                'los_admitted_median' => self::median($num(array_filter($closed, fn($r) => $r['status'] === 'admitted'), 'los')),
                'boarding_median' => self::median($num(array_filter($list, fn($r) => $r['status'] === 'admitted'), 'boarding')),
                'admitted' => $admitted, 'admit_rate_pct' => self::pct($admitted, $n),
                'left' => $left, 'lwbs_pct' => self::pct($left, $n),
            ];
        };

        $outcomes = array_fill_keys(array_keys(self::OUTCOMES), 0);
        $byAcuity = [];
        $modes = [];
        $hours = array_fill(0, 24, 0);
        $periods = [];
        foreach ($rows as $r) {
            $outcomes[in_array($r['status'], ['waiting', 'triaged'], true) ? 'open' : $r['status']] = ($outcomes[in_array($r['status'], ['waiting', 'triaged'], true) ? 'open' : $r['status']] ?? 0) + 1;
            $byAcuity[$r['acuity'] !== null ? (int) $r['acuity'] : 0][] = $r;
            $modes[$r['arrival_mode']] = ($modes[$r['arrival_mode']] ?? 0) + 1;
            $hours[(int) substr($r['arrived_at'], 11, 2)]++;
            $periods[$group === 'day' ? substr($r['arrived_at'], 0, 10) : substr($r['arrived_at'], 0, 7)][] = $r;
        }
        $series = [];
        for ($d = $f; $d <= $t; $d = $d->modify($group === 'day' ? '+1 day' : 'first day of next month')) {
            $key = $d->format($group === 'day' ? 'Y-m-d' : 'Y-m');
            $list = $periods[$key] ?? [];
            $s = $summary($list);
            $series[] = ['period' => $key, 'visits' => $s['visits'], 'admitted' => $s['admitted'], 'doctor_median' => $s['doctor_median'], 'doctor_on_time_pct' => $s['doctor_on_time_pct'],
                'los_median' => $s['los_median'], 'left' => $s['left']];
        }
        $acuityRows = [];
        foreach ([1, 2, 3, 4, 5, 0] as $a) {
            if (!isset($byAcuity[$a]) && $a === 0) {
                continue;
            }
            $acuityRows[] = ['acuity' => $a ?: null, 'label' => $a ? ErService::ACUITY[$a]['label'] : 'Not triaged', 'target' => $a ? $targets[$a] : null] + $summary($byAcuity[$a] ?? []);
        }
        arsort($modes);

        return [
            'from' => $from, 'to' => $to, 'group' => $group, 'days' => $span, 'targets' => $targets,
            'totals' => $summary($rows) + ['per_day' => round(count($rows) / $span, 1)],
            'outcomes' => array_map(fn($k, $label) => ['key' => $k, 'label' => $label, 'count' => $outcomes[$k], 'pct' => self::pct($outcomes[$k], count($rows))],
                array_keys(self::OUTCOMES), self::OUTCOMES),
            'by_acuity' => $acuityRows,
            'series' => $series,
            'by_hour' => $hours,
            'arrival_modes' => array_map(fn($m, $c) => ['mode' => $m, 'count' => $c], array_keys($modes), $modes),
            'diagnoses' => $this->diagnoses($rows),
            'protocols' => $this->protocols($db, $from, $end),
        ];
    }

    /** The commonest ER diagnoses (as written, case-insensitive). */
    private function diagnoses(array $rows): array
    {
        $c = [];
        foreach ($rows as $r) {
            if ($r['er_diagnosis'] === null || trim($r['er_diagnosis']) === '') {
                continue;
            }
            $k = mb_strtolower(trim($r['er_diagnosis']));
            $c[$k] ??= ['diagnosis' => trim($r['er_diagnosis']), 'count' => 0, 'admitted' => 0];
            $c[$k]['count']++;
            $c[$k]['admitted'] += (int) ($r['status'] === 'admitted');
        }
        usort($c, fn($a, $b) => $b['count'] <=> $a['count'] ?: strcmp($a['diagnosis'], $b['diagnosis']));
        return array_slice($c, 0, 10);
    }

    /** Per protocol: started / complete / stopped; per timed step: done, median minutes from the clock, on time. */
    private function protocols(PDO $db, string $from, string $end): array
    {
        $st = $db->prepare(
            "SELECT p.id, p.protocol, p.status, s.step_key, s.status AS step_status, TIMESTAMPDIFF(MINUTE, p.clock_at, s.done_at) AS minutes
             FROM er_protocols p JOIN er_visits v ON v.id = p.visit_id AND v.status <> 'cancelled' LEFT JOIN er_protocol_steps s ON s.protocol_id = p.id
             WHERE v.arrived_at >= :f AND v.arrived_at < :e"
        );
        $st->execute(['f' => $from, 'e' => $end]);
        $targets = ErProtocolService::targets();
        $out = [];
        $seen = [];
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $k = $r['protocol'];
            if (!isset(ErProtocolService::PROTOCOLS[$k])) {
                continue;
            }
            $out[$k] ??= ['protocol' => $k, 'label' => ErProtocolService::PROTOCOLS[$k]['label'], 'started' => 0, 'complete' => 0, 'stopped' => 0, 'steps' => []];
            if (!isset($seen[$r['id']])) {
                $seen[$r['id']] = true;
                $out[$k]['started']++;
                if (in_array($r['status'], ['complete', 'stopped'], true)) {
                    $out[$k][$r['status']]++;
                }
            }
            $target = $targets[$k][$r['step_key']] ?? null;
            if ($target === null || $r['status'] === 'stopped') {
                continue;
            }
            $out[$k]['steps'][$r['step_key']] ??= ['step' => $r['step_key'], 'label' => ErProtocolService::PROTOCOLS[$k]['steps'][$r['step_key']]['label'], 'target' => $target, 'minutes' => []];
            if ($r['step_status'] === 'done' && $r['minutes'] !== null) {
                $out[$k]['steps'][$r['step_key']]['minutes'][] = max(0, (int) $r['minutes']);
            }
        }
        foreach ($out as &$p) {
            $p['steps'] = array_values(array_map(fn($s) => ['step' => $s['step'], 'label' => $s['label'], 'target' => $s['target'], 'done' => count($s['minutes']),
                'median' => self::median($s['minutes']), 'on_time_pct' => self::pct(count(array_filter($s['minutes'], fn($m) => $m <= $s['target'])), count($s['minutes']))],
                $p['steps']));
        }
        unset($p);
        return array_values($out);
    }

    private static function median(array $v): ?float
    {
        if (!$v) {
            return null;
        }
        sort($v);
        $n = count($v);
        return $n % 2 ? (float) $v[intdiv($n, 2)] : ($v[$n / 2 - 1] + $v[$n / 2]) / 2;
    }

    private static function pct(int $part, int $whole): ?float
    {
        return $whole ? round($part * 100 / $whole, 1) : null;
    }
}
