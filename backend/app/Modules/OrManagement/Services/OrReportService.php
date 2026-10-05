<?php

namespace App\Modules\OrManagement\Services;

use App\Core\Database;
use App\Modules\Specializations\Services\SpecializationService;
use PDO;

/**
 * OR Reports (Surgery Phase 6). Every report takes the same filters:
 * date_from, date_to (the booked date), specialization_id?, suite_id?.
 *
 *   * utilization()   -- in-room time against staffed time, by suite and
 *                        by specialization (with block time allocated)
 *   * timeliness()    -- first-case on-time starts and turnover time
 *   * cancellations() -- how many, why, how late
 *   * volume()        -- completed cases by surgeon, specialization and
 *                        procedure
 *   * compliance()    -- WHO checklist done, and done at the right time
 *   * ssi()           -- surgical-site infections (HAI/SSI register)
 *                        within 30 days (90 with an implant)
 */
class OrReportService
{
    /** Minutes after the booked start that still count as on time. */
    public const ON_TIME_GRACE = 5;

    public const SSI_DAYS = 30;
    public const SSI_DAYS_IMPLANT = 90;

    private const DONE = "(c.actual_out_room_time IS NOT NULL OR c.perioperative_stage IN ('In PACU', 'Transferred / Discharged'))";

    public function options(): array
    {
        $db = Database::connection();
        return [
            'specializations' => (new SpecializationService())->list(),
            'suites' => $db->query("SELECT id, suite_code, suite_name FROM or_suites WHERE is_active = 1 ORDER BY suite_code")->fetchAll(PDO::FETCH_ASSOC),
            'grace_minutes' => self::ON_TIME_GRACE
        ];
    }

    /** [where SQL, params, normalized filters] for or_surgical_cases c. */
    private function filters(array $f): array
    {
        $from = OrLiveService::validDate($f['date_from'] ?? null) ?? date('Y-m-01');
        $to = OrLiveService::validDate($f['date_to'] ?? null) ?? date('Y-m-d');
        if ($to < $from) {
            [$from, $to] = [$to, $from];
        }
        $where = ['c.scheduled_date BETWEEN :from AND :to'];
        $params = ['from' => $from, 'to' => $to];
        $spec = (int) ($f['specialization_id'] ?? 0) ?: null;
        $suite = (int) ($f['suite_id'] ?? 0) ?: null;
        if ($spec) {
            $where[] = 'c.specialization_id = :spec';
            $params['spec'] = $spec;
        }
        if ($suite) {
            $where[] = 'c.or_suite_id = :suite';
            $params['suite'] = $suite;
        }
        return [implode(' AND ', $where), $params, ['date_from' => $from, 'date_to' => $to, 'specialization_id' => $spec, 'suite_id' => $suite]];
    }

    private function rows(string $sql, array $params): array
    {
        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function minutes(?string $a, ?string $b): ?int
    {
        return $a && $b ? max(0, (int) round((strtotime($b) - strtotime($a)) / 60)) : null;
    }

    private static function pct(float $part, float $whole): ?float
    {
        return $whole > 0 ? round($part * 100 / $whole, 1) : null;
    }

    private static function avg(array $v): ?float
    {
        $v = array_values(array_filter($v, fn($x) => $x !== null));
        return $v ? round(array_sum($v) / count($v), 1) : null;
    }

    private static function median(array $v): ?float
    {
        $v = array_values(array_filter($v, fn($x) => $x !== null));
        if (!$v) {
            return null;
        }
        sort($v);
        $n = count($v);
        return $n % 2 ? (float) $v[intdiv($n, 2)] : round(($v[$n / 2 - 1] + $v[$n / 2]) / 2, 1);
    }

    /* ---------------------------------------------------------------
     * Utilization
     * ------------------------------------------------------------- */

    /** Extra filters: hours_per_day (default 8), operating_days (mon_fri | mon_sat | all; default mon_sat). */
    public function utilization(array $f): array
    {
        [$where, $params, $nf] = $this->filters($f);
        $hours = (float) ($f['hours_per_day'] ?? 8);
        $hours = $hours > 0 && $hours <= 24 ? $hours : 8;
        $daysMode = in_array($f['operating_days'] ?? '', ['mon_fri', 'mon_sat', 'all'], true) ? $f['operating_days'] : 'mon_sat';
        $lastDow = ['mon_fri' => 5, 'mon_sat' => 6, 'all' => 7][$daysMode];

        $dates = [];
        for ($d = strtotime($nf['date_from']); $d <= strtotime($nf['date_to']); $d = strtotime('+1 day', $d)) {
            if ((int) date('N', $d) <= $lastDow) {
                $dates[] = date('Y-m-d', $d);
            }
        }
        $staffed = (int) round(count($dates) * $hours * 60);

        $cases = $this->rows(
            "SELECT c.id, c.or_suite_id, c.specialization_id, c.surgical_specialty, c.estimated_duration_minutes, c.actual_in_room_time, c.actual_out_room_time
             FROM or_surgical_cases c WHERE {$where} AND c.perioperative_stage <> 'Cancelled'",
            $params
        );
        $suites = $this->rows(
            "SELECT id, suite_code, suite_name FROM or_suites WHERE is_active = 1" . ($nf['suite_id'] ? " AND id = " . (int) $nf['suite_id'] : '') . " ORDER BY suite_code",
            []
        );

        $bySuite = [];
        foreach ($suites as $s) {
            $mine = array_filter($cases, fn($c) => (int) $c['or_suite_id'] === (int) $s['id']);
            $used = array_sum(array_map(fn($c) => self::minutes($c['actual_in_room_time'], $c['actual_out_room_time']) ?? 0, $mine));
            $booked = array_sum(array_map(fn($c) => (int) $c['estimated_duration_minutes'], $mine));
            $bySuite[] = [
                'suite_id' => (int) $s['id'], 'suite' => $s['suite_name'], 'code' => $s['suite_code'], 'cases' => count($mine),
                'booked_minutes' => $booked, 'used_minutes' => $used, 'staffed_minutes' => $staffed,
                'booked_pct' => self::pct($booked, $staffed), 'used_pct' => self::pct($used, $staffed)
            ];
        }

        // Block time allocated in the range, per specialization.
        $blocks = $this->rows(
            "SELECT b.*, s.name AS specialization FROM or_block_times b JOIN specializations s ON s.id = b.specialization_id
             WHERE b.is_active = 1" . ($nf['specialization_id'] ? " AND b.specialization_id = " . (int) $nf['specialization_id'] : '')
            . ($nf['suite_id'] ? " AND b.or_suite_id = " . (int) $nf['suite_id'] : ''),
            []
        );
        $allocated = [];
        foreach ($blocks as $b) {
            $len = (OrSchedulingService::minutes($b['end_time']) ?? 0) - (OrSchedulingService::minutes($b['start_time']) ?? 0);
            foreach ($dates as $d) {
                if ((int) date('N', strtotime($d)) === (int) $b['day_of_week'] && (!$b['effective_from'] || $d >= $b['effective_from']) && (!$b['effective_to'] || $d <= $b['effective_to'])) {
                    $allocated[(int) $b['specialization_id']] = ($allocated[(int) $b['specialization_id']] ?? 0) + max(0, $len);
                }
            }
        }

        $totalUsed = array_sum(array_column($bySuite, 'used_minutes'));
        $specs = [];
        foreach ($cases as $c) {
            $k = (int) $c['specialization_id'];
            $specs[$k] ??= ['specialization_id' => $k ?: null, 'specialization' => $c['surgical_specialty'] ?: 'Not set', 'cases' => 0, 'used_minutes' => 0, 'booked_minutes' => 0];
            $specs[$k]['cases']++;
            $specs[$k]['used_minutes'] += self::minutes($c['actual_in_room_time'], $c['actual_out_room_time']) ?? 0;
            $specs[$k]['booked_minutes'] += (int) $c['estimated_duration_minutes'];
        }
        foreach ($blocks as $b) {
            $k = (int) $b['specialization_id'];
            $specs[$k] ??= ['specialization_id' => $k, 'specialization' => $b['specialization'], 'cases' => 0, 'used_minutes' => 0, 'booked_minutes' => 0];
        }
        $bySpec = array_map(fn($s) => $s + [
            'share_pct' => self::pct($s['used_minutes'], $totalUsed),
            'block_minutes' => $allocated[(int) $s['specialization_id']] ?? 0,
            'block_use_pct' => !empty($allocated[(int) $s['specialization_id']]) ? self::pct($s['used_minutes'], $allocated[(int) $s['specialization_id']]) : null
        ], array_values($specs));
        usort($bySpec, fn($a, $b) => $b['used_minutes'] <=> $a['used_minutes']);

        $totalStaffed = $staffed * count($suites);
        return [
            'filters' => $nf + ['hours_per_day' => $hours, 'operating_days' => $daysMode],
            'operating_days' => count($dates),
            'summary' => [
                'cases' => count($cases), 'used_minutes' => $totalUsed, 'staffed_minutes' => $totalStaffed,
                'used_pct' => self::pct($totalUsed, $totalStaffed), 'booked_pct' => self::pct(array_sum(array_column($bySuite, 'booked_minutes')), $totalStaffed),
                'missing_times' => count(array_filter($cases, fn($c) => !$c['actual_in_room_time'] || !$c['actual_out_room_time']))
            ],
            'by_suite' => $bySuite,
            'by_specialization' => $bySpec
        ];
    }

    /* ---------------------------------------------------------------
     * First-case on-time starts and turnover
     * ------------------------------------------------------------- */

    public function timeliness(array $f): array
    {
        [$where, $params, $nf] = $this->filters($f);
        $cases = $this->rows(
            "SELECT c.id, c.case_number, c.scheduled_date, c.scheduled_start_time, c.actual_in_room_time, c.or_suite_id, c.or_suite_name, c.lead_surgeon,
                    c.procedure_name, c.surgical_specialty, c.delay_reason, c.turnover_duration_minutes, s.turnover_minutes AS turnover_target
             FROM or_surgical_cases c JOIN or_suites s ON s.id = c.or_suite_id
             WHERE {$where} AND c.perioperative_stage <> 'Cancelled' AND c.actual_in_room_time IS NOT NULL
             ORDER BY c.scheduled_date, c.or_suite_id, c.scheduled_start_time",
            $params
        );

        // The first case of each suite on each day.
        $first = [];
        foreach ($cases as $c) {
            $k = $c['or_suite_id'] . '|' . $c['scheduled_date'];
            if (!isset($first[$k])) {
                $first[$k] = $c;
            }
        }
        $firstRows = array_map(function ($c) {
            $late = (int) round((strtotime($c['actual_in_room_time']) - strtotime("{$c['scheduled_date']} {$c['scheduled_start_time']}")) / 60);
            return [
                'case_id' => (int) $c['id'], 'case_number' => $c['case_number'], 'date' => $c['scheduled_date'], 'suite' => $c['or_suite_name'],
                'surgeon' => $c['lead_surgeon'], 'procedure' => $c['procedure_name'], 'specialization' => $c['surgical_specialty'],
                'booked' => substr($c['scheduled_start_time'], 0, 5), 'in_room' => substr($c['actual_in_room_time'], 11, 5),
                'minutes_late' => $late, 'on_time' => $late <= self::ON_TIME_GRACE, 'delay_reason' => $c['delay_reason']
            ];
        }, array_values($first));
        $onTime = count(array_filter($firstRows, fn($r) => $r['on_time']));
        $lateRows = array_values(array_filter($firstRows, fn($r) => !$r['on_time']));

        $suiteStats = [];
        foreach ($firstRows as $r) {
            $suiteStats[$r['suite']] ??= ['suite' => $r['suite'], 'first_cases' => 0, 'on_time' => 0, 'turnovers' => [], 'target' => null, 'over_target' => 0];
            $suiteStats[$r['suite']]['first_cases']++;
            $suiteStats[$r['suite']]['on_time'] += $r['on_time'] ? 1 : 0;
        }
        $turnovers = array_values(array_filter($cases, fn($c) => $c['turnover_duration_minutes'] !== null));
        foreach ($turnovers as $c) {
            $suiteStats[$c['or_suite_name']] ??= ['suite' => $c['or_suite_name'], 'first_cases' => 0, 'on_time' => 0, 'turnovers' => [], 'target' => null, 'over_target' => 0];
            $suiteStats[$c['or_suite_name']]['turnovers'][] = (int) $c['turnover_duration_minutes'];
            $suiteStats[$c['or_suite_name']]['target'] = (int) $c['turnover_target'];
            if ((int) $c['turnover_duration_minutes'] > (int) $c['turnover_target']) {
                $suiteStats[$c['or_suite_name']]['over_target']++;
            }
        }
        $bySuite = array_map(fn($s) => [
            'suite' => $s['suite'], 'first_cases' => $s['first_cases'], 'on_time' => $s['on_time'], 'on_time_pct' => self::pct($s['on_time'], $s['first_cases']),
            'turnovers' => count($s['turnovers']), 'turnover_avg' => self::avg($s['turnovers']), 'turnover_median' => self::median($s['turnovers']),
            'turnover_target' => $s['target'], 'over_target' => $s['over_target']
        ], array_values($suiteStats));
        usort($bySuite, fn($a, $b) => strcmp($a['suite'], $b['suite']));

        $tv = array_map(fn($c) => (int) $c['turnover_duration_minutes'], $turnovers);
        return [
            'filters' => $nf, 'grace_minutes' => self::ON_TIME_GRACE,
            'summary' => [
                'first_cases' => count($firstRows), 'on_time' => $onTime, 'on_time_pct' => self::pct($onTime, count($firstRows)),
                'avg_minutes_late' => self::avg(array_column($lateRows, 'minutes_late')),
                'turnovers' => count($tv), 'turnover_avg' => self::avg($tv), 'turnover_median' => self::median($tv),
                'turnover_over_target' => count(array_filter($turnovers, fn($c) => (int) $c['turnover_duration_minutes'] > (int) $c['turnover_target']))
            ],
            'by_suite' => $bySuite,
            'late_first_cases' => $lateRows
        ];
    }

    /* ---------------------------------------------------------------
     * Cancellations
     * ------------------------------------------------------------- */

    public function cancellations(array $f): array
    {
        [$where, $params, $nf] = $this->filters($f);
        $all = $this->rows(
            "SELECT c.id, c.case_number, c.scheduled_date, c.scheduled_start_time, c.perioperative_stage, c.cancellation_reason, c.cancelled_at,
                    c.procedure_name, c.patient_name, c.lead_surgeon, c.surgical_specialty, c.or_suite_name,
                    (SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                     FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL WHERE u.id = c.cancelled_by LIMIT 1) AS cancelled_by_name
             FROM or_surgical_cases c WHERE {$where} ORDER BY c.scheduled_date DESC, c.scheduled_start_time",
            $params
        );
        $cancelled = array_values(array_filter($all, fn($c) => $c['perioperative_stage'] === 'Cancelled'));
        $rows = array_map(function ($c) {
            $reason = trim((string) $c['cancellation_reason']);
            $abandoned = str_starts_with($reason, 'Abandoned in the room: ');
            $reason = $abandoned ? substr($reason, strlen('Abandoned in the room: ')) : $reason;
            $sameDay = $abandoned || ($c['cancelled_at'] && substr($c['cancelled_at'], 0, 10) >= $c['scheduled_date']);
            return [
                'case_id' => (int) $c['id'], 'case_number' => $c['case_number'], 'date' => $c['scheduled_date'], 'start' => substr($c['scheduled_start_time'], 0, 5),
                'procedure' => $c['procedure_name'], 'patient' => $c['patient_name'], 'surgeon' => $c['lead_surgeon'], 'specialization' => $c['surgical_specialty'],
                'suite' => $c['or_suite_name'], 'reason' => $reason !== '' ? $reason : 'No reason recorded', 'abandoned' => $abandoned, 'same_day' => $sameDay,
                'cancelled_at' => $c['cancelled_at'], 'cancelled_by' => $c['cancelled_by_name']
            ];
        }, $cancelled);

        $byReason = [];
        foreach ($rows as $r) {
            $k = mb_strtolower(rtrim($r['reason'], '. '));
            $byReason[$k] ??= ['reason' => rtrim($r['reason'], '. '), 'count' => 0, 'same_day' => 0];
            $byReason[$k]['count']++;
            $byReason[$k]['same_day'] += $r['same_day'] ? 1 : 0;
        }
        $byReason = array_values($byReason);
        usort($byReason, fn($a, $b) => $b['count'] <=> $a['count']);

        $bySpec = [];
        foreach ($all as $c) {
            $k = $c['surgical_specialty'] ?: 'Not set';
            $bySpec[$k] ??= ['specialization' => $k, 'booked' => 0, 'cancelled' => 0];
            $bySpec[$k]['booked']++;
            $bySpec[$k]['cancelled'] += $c['perioperative_stage'] === 'Cancelled' ? 1 : 0;
        }
        $bySpec = array_map(fn($s) => $s + ['rate_pct' => self::pct($s['cancelled'], $s['booked'])], array_values($bySpec));
        usort($bySpec, fn($a, $b) => $b['cancelled'] <=> $a['cancelled']);

        return [
            'filters' => $nf,
            'summary' => [
                'booked' => count($all), 'cancelled' => count($rows), 'rate_pct' => self::pct(count($rows), count($all)),
                'same_day' => count(array_filter($rows, fn($r) => $r['same_day'])), 'abandoned' => count(array_filter($rows, fn($r) => $r['abandoned']))
            ],
            'by_reason' => $byReason,
            'by_specialization' => $bySpec,
            'cases' => $rows
        ];
    }

    /* ---------------------------------------------------------------
     * Volume
     * ------------------------------------------------------------- */

    public function volume(array $f): array
    {
        [$where, $params, $nf] = $this->filters($f);
        $cases = $this->rows(
            "SELECT c.id, c.lead_surgeon_user_id, c.lead_surgeon, c.specialization_id, c.surgical_specialty, c.surgery_id, c.procedure_name, c.case_priority,
                    c.estimated_duration_minutes, c.actual_in_room_time, c.actual_out_room_time, c.actual_incision_time, c.actual_closing_time, su.name AS surgery_name
             FROM or_surgical_cases c LEFT JOIN surgeries su ON su.id = c.surgery_id
             WHERE {$where} AND " . self::DONE,
            $params
        );
        $group = function (callable $key, callable $label) use ($cases) {
            $out = [];
            foreach ($cases as $c) {
                $k = $key($c);
                $out[$k] ??= ['label' => $label($c), 'cases' => 0, 'emergency' => 0, 'in_room' => [], 'surgery' => [], 'planned' => []];
                $out[$k]['cases']++;
                $out[$k]['emergency'] += $c['case_priority'] === 'Elective' ? 0 : 1;
                $out[$k]['in_room'][] = self::minutes($c['actual_in_room_time'], $c['actual_out_room_time']);
                $out[$k]['surgery'][] = self::minutes($c['actual_incision_time'], $c['actual_closing_time']);
                $out[$k]['planned'][] = (int) $c['estimated_duration_minutes'];
            }
            $rows = array_map(fn($g) => [
                'label' => $g['label'], 'cases' => $g['cases'], 'urgent_or_emergency' => $g['emergency'],
                'avg_in_room' => self::avg($g['in_room']), 'avg_surgery' => self::avg($g['surgery']), 'avg_planned' => self::avg($g['planned']),
                'total_in_room' => array_sum(array_filter($g['in_room']))
            ], array_values($out));
            usort($rows, fn($a, $b) => $b['cases'] <=> $a['cases'] ?: strcmp($a['label'], $b['label']));
            return $rows;
        };

        return [
            'filters' => $nf,
            'summary' => ['completed' => count($cases), 'surgeons' => count(array_unique(array_column($cases, 'lead_surgeon'))),
                'procedures' => count(array_unique(array_map(fn($c) => $c['surgery_id'] ?: $c['procedure_name'], $cases)))],
            'by_surgeon' => $group(fn($c) => $c['lead_surgeon_user_id'] ?: $c['lead_surgeon'], fn($c) => $c['lead_surgeon']),
            'by_specialization' => $group(fn($c) => $c['specialization_id'] ?: $c['surgical_specialty'], fn($c) => $c['surgical_specialty'] ?: 'Not set'),
            'by_procedure' => $group(fn($c) => $c['surgery_id'] ? "s{$c['surgery_id']}" : mb_strtolower($c['procedure_name']), fn($c) => $c['surgery_name'] ?: $c['procedure_name'])
        ];
    }

    /* ---------------------------------------------------------------
     * Safety checklist compliance
     * ------------------------------------------------------------- */

    public function compliance(array $f): array
    {
        [$where, $params, $nf] = $this->filters($f);
        $cases = $this->rows(
            "SELECT c.id, c.case_number, c.scheduled_date, c.procedure_name, c.lead_surgeon, c.surgical_specialty, c.count_issue,
                    c.actual_in_room_time, c.actual_incision_time, c.actual_out_room_time
             FROM or_surgical_cases c WHERE {$where} AND " . self::DONE . " ORDER BY c.scheduled_date, c.id",
            $params
        );
        $checks = [];
        if ($cases) {
            foreach (Database::connection()->query(
                "SELECT case_id, phase, completed_at, answers FROM or_case_safety_checks WHERE case_id IN (" . implode(',', array_map(fn($c) => (int) $c['id'], $cases)) . ")"
            )->fetchAll(PDO::FETCH_ASSOC) as $k) {
                $checks[(int) $k['case_id']][$k['phase']] = $k;
            }
        }

        $rows = [];
        $tot = ['sign_in' => 0, 'time_out' => 0, 'sign_out' => 0, 'sign_in_on_time' => 0, 'time_out_on_time' => 0, 'sign_out_on_time' => 0, 'full' => 0,
            'count_issues' => 0, 'near_misses' => 0, 'equipment' => 0];
        $bySpec = [];
        foreach ($cases as $c) {
            $k = $checks[(int) $c['id']] ?? [];
            $onTime = fn(string $phase, ?string $before) => isset($k[$phase]) && (!$before || $k[$phase]['completed_at'] <= $before);
            $flags = [
                'sign_in' => isset($k['sign_in']), 'time_out' => isset($k['time_out']), 'sign_out' => isset($k['sign_out']),
                'sign_in_on_time' => $onTime('sign_in', $c['actual_in_room_time']), 'time_out_on_time' => $onTime('time_out', $c['actual_incision_time']),
                'sign_out_on_time' => $onTime('sign_out', $c['actual_out_room_time'])
            ];
            $answers = isset($k['sign_out']) ? (json_decode($k['sign_out']['answers'], true) ?: []) : [];
            $full = $flags['sign_in_on_time'] && $flags['time_out_on_time'] && $flags['sign_out_on_time'];
            foreach ($flags as $f2 => $v) {
                $tot[$f2] += $v ? 1 : 0;
            }
            $tot['full'] += $full ? 1 : 0;
            $tot['count_issues'] += (int) $c['count_issue'];
            $tot['near_misses'] += ($answers['near_miss'] ?? 'no') === 'yes' ? 1 : 0;
            $tot['equipment'] += ($answers['equipment_problems'] ?? 'no') === 'yes' ? 1 : 0;

            $s = $c['surgical_specialty'] ?: 'Not set';
            $bySpec[$s] ??= ['specialization' => $s, 'cases' => 0, 'full' => 0, 'time_out' => 0];
            $bySpec[$s]['cases']++;
            $bySpec[$s]['full'] += $full ? 1 : 0;
            $bySpec[$s]['time_out'] += $flags['time_out_on_time'] ? 1 : 0;

            if (!$full || (int) $c['count_issue'] || ($answers['near_miss'] ?? 'no') === 'yes') {
                $gaps = [];
                foreach (['sign_in' => 'Sign-In', 'time_out' => 'Time-Out', 'sign_out' => 'Sign-Out'] as $p => $label) {
                    if (!$flags[$p]) {
                        $gaps[] = "{$label} missing";
                    } elseif (!$flags["{$p}_on_time"]) {
                        $gaps[] = "{$label} late";
                    }
                }
                if ((int) $c['count_issue']) {
                    $gaps[] = 'Count discrepancy';
                }
                if (($answers['near_miss'] ?? 'no') === 'yes') {
                    $gaps[] = 'Near miss: ' . ($answers['near_miss_detail'] ?? '');
                }
                $rows[] = ['case_id' => (int) $c['id'], 'case_number' => $c['case_number'], 'date' => $c['scheduled_date'], 'procedure' => $c['procedure_name'],
                    'surgeon' => $c['lead_surgeon'], 'specialization' => $c['surgical_specialty'], 'issues' => $gaps, 'compliant' => $full];
            }
        }
        $n = count($cases);
        return [
            'filters' => $nf,
            'summary' => ['cases' => $n, 'full' => $tot['full'], 'full_pct' => self::pct($tot['full'], $n),
                'sign_in_pct' => self::pct($tot['sign_in_on_time'], $n), 'time_out_pct' => self::pct($tot['time_out_on_time'], $n), 'sign_out_pct' => self::pct($tot['sign_out_on_time'], $n),
                'sign_in_done' => $tot['sign_in'], 'time_out_done' => $tot['time_out'], 'sign_out_done' => $tot['sign_out'],
                'count_issues' => $tot['count_issues'], 'near_misses' => $tot['near_misses'], 'equipment_problems' => $tot['equipment']],
            'by_specialization' => array_map(fn($s) => $s + ['full_pct' => self::pct($s['full'], $s['cases']), 'time_out_pct' => self::pct($s['time_out'], $s['cases'])], array_values($bySpec)),
            'exceptions' => $rows
        ];
    }

    /* ---------------------------------------------------------------
     * Surgical-site infections (from the HAI/SSI register)
     * ------------------------------------------------------------- */

    public function ssi(array $f): array
    {
        [$where, $params, $nf] = $this->filters($f);
        $cases = $this->rows(
            "SELECT c.id, c.case_number, c.patient_id, c.patient_name, c.scheduled_date, c.actual_incision_time, c.procedure_name, c.surgical_specialty,
                    c.lead_surgeon, su.wound_class,
                    EXISTS (SELECT 1 FROM or_case_items i WHERE i.case_id = c.id AND i.kind = 'implant' AND i.voided_at IS NULL) AS has_implant
             FROM or_surgical_cases c LEFT JOIN surgeries su ON su.id = c.surgery_id
             WHERE {$where} AND " . self::DONE . " ORDER BY c.scheduled_date",
            $params
        );
        $patients = array_values(array_unique(array_filter(array_map(fn($c) => (int) $c['patient_id'], $cases))));
        $infections = $patients ? Database::connection()->query(
            "SELECT id, tracking_number, patient_id, infection_category, onset_date, pathogen_isolated, severity, outcome, status
             FROM hai_ssi_infections WHERE infection_type = 'SSI' AND patient_id IN (" . implode(',', $patients) . ") ORDER BY onset_date"
        )->fetchAll(PDO::FETCH_ASSOC) : [];

        $today = date('Y-m-d');
        $rows = [];
        $watch = [];
        $bySpec = [];
        $byWound = [];
        $infectedCases = 0;
        foreach ($cases as $c) {
            $surgeryDate = $c['actual_incision_time'] ? substr($c['actual_incision_time'], 0, 10) : $c['scheduled_date'];
            $window = (int) $c['has_implant'] ? self::SSI_DAYS_IMPLANT : self::SSI_DAYS;
            $end = date('Y-m-d', strtotime("{$surgeryDate} +{$window} days"));
            $mine = array_values(array_filter($infections, fn($i) => (int) $i['patient_id'] === (int) $c['patient_id'] && $i['onset_date'] >= $surgeryDate && $i['onset_date'] <= $end));
            $spec = $c['surgical_specialty'] ?: 'Not set';
            $wound = $c['wound_class'] ?: 'Not set';
            $bySpec[$spec] ??= ['specialization' => $spec, 'cases' => 0, 'infections' => 0];
            $byWound[$wound] ??= ['wound_class' => $wound, 'cases' => 0, 'infections' => 0];
            $bySpec[$spec]['cases']++;
            $byWound[$wound]['cases']++;
            if ($mine) {
                $infectedCases++;
                $bySpec[$spec]['infections']++;
                $byWound[$wound]['infections']++;
                foreach ($mine as $i) {
                    $rows[] = ['case_id' => (int) $c['id'], 'case_number' => $c['case_number'], 'patient' => $c['patient_name'], 'procedure' => $c['procedure_name'],
                        'surgeon' => $c['lead_surgeon'], 'specialization' => $spec, 'surgery_date' => $surgeryDate, 'tracking_number' => $i['tracking_number'],
                        'category' => $i['infection_category'], 'onset_date' => $i['onset_date'],
                        'days_after' => (int) round((strtotime($i['onset_date']) - strtotime($surgeryDate)) / 86400),
                        'pathogen' => $i['pathogen_isolated'], 'severity' => $i['severity'], 'status' => $i['status']];
                }
            } elseif ($end >= $today) {
                $watch[] = ['case_id' => (int) $c['id'], 'case_number' => $c['case_number'], 'patient' => $c['patient_name'], 'procedure' => $c['procedure_name'],
                    'surgeon' => $c['lead_surgeon'], 'surgery_date' => $surgeryDate, 'watch_until' => $end, 'implant' => (bool) $c['has_implant']];
            }
        }
        $rate = fn($rows) => array_map(fn($r) => $r + ['rate_pct' => self::pct($r['infections'], $r['cases'])], array_values($rows));
        usort($watch, fn($a, $b) => strcmp($a['watch_until'], $b['watch_until']));

        return [
            'filters' => $nf, 'window_days' => self::SSI_DAYS, 'window_days_implant' => self::SSI_DAYS_IMPLANT,
            'summary' => ['cases' => count($cases), 'infected' => $infectedCases, 'rate_pct' => self::pct($infectedCases, count($cases)), 'in_follow_up' => count($watch)],
            'by_specialization' => $rate($bySpec),
            'by_wound_class' => $rate($byWound),
            'infections' => $rows,
            'follow_up' => $watch
        ];
    }
}
