<?php

namespace App\Modules\Lab\Services;

use App\Core\Database;
use PDO;

/**
 * Lab department (module 14, Phase 3): the lab report for a date range (optionally one lab section).
 *
 *   * Turnaround, for the tests ordered in the period: order -> collection, collection -> release (the bench)
 *     and order -> release (what the ward sees), each with the median, the mean, the 90th percentile and the
 *     share within target. Targets: collection as on the worklist (STAT 30 / urgent 60 / routine 240 minutes)
 *     and release STAT 60 minutes / urgent 4 hours / routine 24 hours.
 *   * Workload: tests ordered, collected and released per day (per month over a long period), by priority, by
 *     lab section, by where the request came from, and the busiest tests. Still open (to collect, to result,
 *     waiting for verification), cancelled tests, results returned to the bench, corrections, critical values.
 *   * Charges: the lab charges posted in the period (gross, discounts, net, voided), by section, and the
 *     released tests that could not be charged because the test has no price.
 */
class LabReportService
{
    public const ROLES = ['admin', 'lab_technician'];
    /** Minutes from the order to the specimen (the worklist's own targets). */
    public const TARGET_COLLECT = LabService::OVERDUE;
    /** Minutes from the order to the released result. */
    public const TARGET_TOTAL = ['stat' => 60, 'urgent' => 240, 'routine' => 1440];
    /** Minutes from the specimen to the released result (the bench). */
    public const TARGET_BENCH = ['stat' => 30, 'urgent' => 180, 'routine' => 1200];

    public function report(?string $from, ?string $to, ?string $section = null): array
    {
        $db = Database::connection();
        [$from, $to, $now] = $this->period($db, $from, $to);
        $start = "{$from} 00:00:00";
        $stop = "{$to} 23:59:59";
        $section = $section !== null && isset(LabService::SECTIONS[$section]) ? $section : null;
        $rows = $this->tests($db, $start, $stop, $section);
        $days = count(self::range($from, $to));
        $month = $days > 62;

        $open = ['to_collect' => 0, 'to_result' => 0, 'to_verify' => 0];
        $cancelled = 0;
        $returns = 0;
        $corrections = 0;
        $criticals = 0;
        $collectedN = 0;
        $releasedN = 0;
        $agg = ['priority' => [], 'section' => [], 'test' => [], 'source' => []];
        $series = [];
        foreach (self::range($from, $to) as $d) {
            $k = $month ? substr($d, 0, 7) : $d;
            $series[$k] ??= ['period' => $month ? "{$k}-01" : $k, 'ordered' => 0, 'collected' => 0, 'released' => 0, 'stat' => 0, 'tat_sum' => 0, 'tat_n' => 0];
        }
        $key = fn($dt) => $month ? substr((string) $dt, 0, 7) : substr((string) $dt, 0, 10);

        foreach ($rows as $r) {
            $p = isset(LabService::PRIORITIES[$r['priority']]) ? $r['priority'] : 'routine';
            $collect = $r['collected_at'] ? self::mins($r['ordered_at'], $r['collected_at']) : null;
            $total = $r['released_at'] ? self::mins($r['ordered_at'], $r['released_at']) : null;
            $bench = $r['collected_at'] && $r['released_at'] ? self::mins($r['collected_at'], $r['released_at']) : null;
            $isCancelled = $r['status'] === 'cancelled';
            $cancelled += (int) $isCancelled;
            $returns += (int) $r['returns'];
            $corrections += (int) ((int) $r['released_versions'] > 1);
            $criticals += (int) $r['criticals'];
            $collectedN += (int) ($collect !== null);
            $releasedN += (int) ($total !== null);
            if (!$isCancelled && $total === null) {
                $open[$r['collected_at'] === null ? 'to_collect' : ($r['entered_at'] !== null ? 'to_verify' : 'to_result')]++;
            }

            $where = ['priority' => $p, 'section' => $r['section'] ?: 'other', 'test' => $r['test_name'], 'source' => $r['source'] ?: 'other'];
            foreach ($where as $which => $k) {
                $b = &$agg[$which][$k];
                $b ??= ['tests' => 0, 'collected' => 0, 'released' => 0, 'criticals' => 0, 'cancelled' => 0, 'collect' => [], 'bench' => [], 'total' => [],
                    'in_collect' => 0, 'in_total' => 0, 'charged' => 0.0];
                $b['tests']++;
                $b['cancelled'] += (int) $isCancelled;
                $b['criticals'] += (int) $r['criticals'];
                if ($collect !== null) {
                    $b['collected']++;
                    $b['collect'][] = $collect;
                    $b['in_collect'] += (int) ($collect <= self::TARGET_COLLECT[$p]);
                }
                if ($total !== null) {
                    $b['released']++;
                    $b['total'][] = $total;
                    $b['in_total'] += (int) ($total <= self::TARGET_TOTAL[$p]);
                }
                if ($bench !== null) {
                    $b['bench'][] = $bench;
                }
                if ($r['charge_net'] !== null) {
                    $b['charged'] += (float) $r['charge_net'];
                }
                unset($b);
            }

            $k = $key($r['ordered_at']);
            if (isset($series[$k])) {
                $series[$k]['ordered']++;
                $series[$k]['stat'] += (int) ($p === 'stat');
            }
            if ($r['collected_at'] && isset($series[$key($r['collected_at'])])) {
                $series[$key($r['collected_at'])]['collected']++;
            }
            if ($r['released_at'] && isset($series[$key($r['released_at'])])) {
                $series[$key($r['released_at'])]['released']++;
                $series[$key($r['released_at'])]['tat_sum'] += $total;
                $series[$key($r['released_at'])]['tat_n']++;
            }
        }

        $all = ['collect' => [], 'bench' => [], 'total' => []];
        $within = ['collect' => 0, 'total' => 0];
        foreach ($agg['priority'] as $b) {
            foreach ($all as $k => $_) {
                $all[$k] = array_merge($all[$k], $b[$k]);
            }
            $within['collect'] += $b['in_collect'];
            $within['total'] += $b['in_total'];
        }

        $priorities = [];
        foreach (LabService::PRIORITIES as $k => $label) {
            $b = $agg['priority'][$k] ?? null;
            $priorities[] = ['key' => $k, 'label' => $label, 'target_collect' => self::TARGET_COLLECT[$k], 'target_total' => self::TARGET_TOTAL[$k],
                'tests' => $b['tests'] ?? 0, 'collected' => $b['collected'] ?? 0, 'released' => $b['released'] ?? 0,
                'collect' => self::stats($b['collect'] ?? []), 'bench' => self::stats($b['bench'] ?? []), 'total' => self::stats($b['total'] ?? []),
                'within_collect_pct' => !empty($b['collected']) ? round(100 * $b['in_collect'] / $b['collected'], 1) : null,
                'within_total_pct' => !empty($b['released']) ? round(100 * $b['in_total'] / $b['released'], 1) : null];
        }

        $sections = [];
        foreach ($agg['section'] as $k => $b) {
            $sections[] = ['key' => $k, 'label' => LabService::SECTIONS[$k] ?? $k, 'tests' => $b['tests'], 'released' => $b['released'], 'criticals' => $b['criticals'],
                'total' => self::stats($b['total']), 'bench' => self::stats($b['bench']),
                'within_total_pct' => $b['released'] ? round(100 * $b['in_total'] / $b['released'], 1) : null, 'charged' => round($b['charged'], 2)];
        }
        usort($sections, fn($a, $b) => $b['tests'] <=> $a['tests']);

        $tests = [];
        foreach ($agg['test'] as $name => $b) {
            $tests[] = ['name' => $name, 'tests' => $b['tests'], 'released' => $b['released'], 'cancelled' => $b['cancelled'], 'criticals' => $b['criticals'],
                'total' => self::stats($b['total']), 'within_total_pct' => $b['released'] ? round(100 * $b['in_total'] / $b['released'], 1) : null,
                'charged' => round($b['charged'], 2)];
        }
        usort($tests, fn($a, $b) => [$b['tests'], $a['name']] <=> [$a['tests'], $b['name']]);

        $sources = [];
        foreach ($agg['source'] as $k => $b) {
            $sources[] = ['key' => $k, 'label' => LabService::SOURCES[$k] ?? $k, 'tests' => $b['tests'], 'released' => $b['released'],
                'total' => self::stats($b['total']), 'within_total_pct' => $b['released'] ? round(100 * $b['in_total'] / $b['released'], 1) : null];
        }
        usort($sources, fn($a, $b) => $b['tests'] <=> $a['tests']);

        $n = count($rows);
        $elapsed = max(1, count(array_filter(self::range($from, $to), fn($d) => $d <= substr($now, 0, 10))));
        return [
            'from' => $from, 'to' => $to, 'days' => $days, 'now' => $now, 'section' => $section, 'group' => $month ? 'month' : 'day',
            'sections_list' => LabService::SECTIONS, 'priorities' => LabService::PRIORITIES,
            'totals' => [
                'requests' => count(array_unique(array_column($rows, 'request_id'))),
                'tests' => $n, 'per_day' => round($n / $elapsed, 1),
                'collected' => $collectedN, 'released' => $releasedN, 'cancelled' => $cancelled,
                'stat' => $agg['priority']['stat']['tests'] ?? 0, 'criticals' => $criticals, 'returns' => $returns, 'corrections' => $corrections,
                'to_collect' => $open['to_collect'], 'to_result' => $open['to_result'], 'to_verify' => $open['to_verify'],
                'collect' => self::stats($all['collect']), 'bench' => self::stats($all['bench']), 'total' => self::stats($all['total']),
                'within_collect_pct' => $collectedN ? round(100 * $within['collect'] / $collectedN, 1) : null,
                'within_total_pct' => $releasedN ? round(100 * $within['total'] / $releasedN, 1) : null,
            ],
            'priority_rows' => $priorities,
            'sections' => $sections,
            'tests' => array_slice($tests, 0, 40),
            'test_count' => count($tests),
            'sources' => $sources,
            'series' => array_values(array_map(fn($x) => $x + ['mean_tat' => $x['tat_n'] ? (int) round($x['tat_sum'] / $x['tat_n']) : null], $series)),
            'charges' => $this->charges($db, $from, $to, $section),
        ];
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    /** One row per lab test ordered in the period, with when it was collected, entered and first released. */
    private function tests(PDO $db, string $start, string $stop, ?string $section): array
    {
        $st = $db->prepare(
            "SELECT o.id AS order_id, o.status, o.collected_at, o.specimen_id, COALESCE(o.priority, r.priority) AS priority,
                    c.name AS test_name, c.identifying_code AS code, c.lab_section AS section, c.lab_price,
                    r.id AS request_id, r.ordered_at, r.source,
                    (SELECT MIN(x.entered_at) FROM lab_result_sets x WHERE x.order_id = o.id AND x.entered_at IS NOT NULL) AS entered_at,
                    (SELECT MIN(x.verified_at) FROM lab_result_sets x WHERE x.order_id = o.id AND x.verified_at IS NOT NULL) AS released_at,
                    (SELECT COALESCE(MAX(x.version), 0) FROM lab_result_sets x WHERE x.order_id = o.id AND x.status IN ('released', 'superseded')) AS released_versions,
                    (SELECT COUNT(*) FROM lab_result_sets x WHERE x.order_id = o.id AND x.returned_at IS NOT NULL) AS returns,
                    (SELECT COUNT(*) FROM lab_result_values v JOIN lab_result_sets x ON x.id = v.set_id
                       WHERE x.order_id = o.id AND x.status IN ('released', 'superseded') AND v.flag = 'critical') AS criticals,
                    (SELECT ch.net_amount FROM lab_charges ch WHERE ch.order_id = o.id AND ch.status = 'charged' LIMIT 1) AS charge_net
             FROM patient_procedure_orders o
             JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             JOIN lab_requests r ON r.id = o.lab_request_id
             WHERE o.deleted_at IS NULL AND r.ordered_at >= :start AND r.ordered_at <= :stop"
            . ($section ? " AND c.lab_section = :sec" : '')
        );
        $st->execute(['start' => $start, 'stop' => $stop] + ($section ? ['sec' => $section] : []));
        return $st->fetchAll(PDO::FETCH_ASSOC);
    }

    /** The lab charges posted in the period (by charge date), and the released tests that have no price. */
    private function charges(PDO $db, string $from, string $to, ?string $section): array
    {
        $st = $db->prepare(
            "SELECT ch.status, ch.gross_amount, ch.discount_amount, ch.net_amount, ch.discount_type, c.lab_section
             FROM lab_charges ch
             JOIN patient_procedure_orders o ON o.id = ch.order_id
             JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             WHERE ch.charge_date >= :from AND ch.charge_date <= :to" . ($section ? " AND c.lab_section = :sec" : '')
        );
        $st->execute(['from' => $from, 'to' => $to] + ($section ? ['sec' => $section] : []));
        $charged = 0;
        $voided = 0;
        $gross = 0.0;
        $discount = 0.0;
        $net = 0.0;
        $discounted = 0;
        foreach ($st->fetchAll(PDO::FETCH_ASSOC) as $c) {
            if ($c['status'] !== 'charged') {
                $voided++;
                continue;
            }
            $charged++;
            $gross += (float) $c['gross_amount'];
            $discount += (float) $c['discount_amount'];
            $net += (float) $c['net_amount'];
            $discounted += (int) ($c['discount_type'] !== null);
        }
        // Released in the period but not charged: the test has no price (or the charge was voided).
        $st = $db->prepare(
            "SELECT c.name, COUNT(*) AS tests FROM lab_result_sets s
             JOIN patient_procedure_orders o ON o.id = s.order_id AND o.deleted_at IS NULL
             JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             WHERE s.status = 'released' AND s.verified_at >= :from AND s.verified_at <= :stop
               AND NOT EXISTS (SELECT 1 FROM lab_charges ch WHERE ch.order_id = o.id AND ch.status = 'charged')"
            . ($section ? " AND c.lab_section = :sec" : '')
            . " GROUP BY c.id, c.name ORDER BY tests DESC, c.name"
        );
        $st->execute(['from' => "{$from} 00:00:00", 'stop' => "{$to} 23:59:59"] + ($section ? ['sec' => $section] : []));
        $uncharged = $st->fetchAll(PDO::FETCH_ASSOC);
        return ['charged' => $charged, 'voided' => $voided, 'gross' => round($gross, 2), 'discount' => round($discount, 2), 'net' => round($net, 2),
            'discounted' => $discounted, 'uncharged' => array_map(fn($u) => ['name' => $u['name'], 'tests' => (int) $u['tests']], $uncharged),
            'uncharged_total' => array_sum(array_map(fn($u) => (int) $u['tests'], $uncharged))];
    }

    /** ['count', 'median', 'mean', 'p90'] in minutes. */
    private static function stats(array $v): array
    {
        if (!$v) {
            return ['count' => 0, 'median' => null, 'mean' => null, 'p90' => null];
        }
        sort($v);
        $n = count($v);
        $median = $n % 2 ? $v[intdiv($n, 2)] : ($v[$n / 2 - 1] + $v[$n / 2]) / 2;
        return ['count' => $n, 'median' => round($median), 'mean' => round(array_sum($v) / $n), 'p90' => $v[min($n - 1, (int) ceil(0.9 * $n) - 1)]];
    }

    private static function mins(string $a, string $b): int
    {
        return max(0, intdiv(self::ts($b) - self::ts($a), 60));
    }

    private static function ts(string $dt): int
    {
        return (new \DateTimeImmutable(substr($dt, 0, 19), new \DateTimeZone('UTC')))->getTimestamp();
    }

    /** Every date from $from to $to (both ISO dates / datetimes). */
    private static function range(string $from, string $to): array
    {
        $out = [];
        $d = substr($from, 0, 10);
        $end = substr($to, 0, 10);
        while ($d <= $end && count($out) < 1000) {
            $out[] = $d;
            $d = self::shift($d, 1);
        }
        return $out;
    }

    private static function shift(string $date, int $days): string
    {
        return (new \DateTimeImmutable(substr($date, 0, 10), new \DateTimeZone('UTC')))->modify(($days >= 0 ? '+' : '') . "{$days} day")->format('Y-m-d');
    }

    /** [from, to, now]: dates (default the last 30 days); at most 2 years. */
    private function period(PDO $db, ?string $from, ?string $to): array
    {
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $today = substr($now, 0, 10);
        $ok = fn($d) => $d && preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) && date('Y-m-d', strtotime($d)) === $d;
        $to = $ok($to) ? $to : $today;
        $from = $ok($from) ? $from : self::shift($to, -29);
        if ($from > $to) {
            [$from, $to] = [$to, $from];
        }
        if (self::shift($from, 731) < $to) {
            $from = self::shift($to, -730);
        }
        return [$from, $to, $now];
    }
}
