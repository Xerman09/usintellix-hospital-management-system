<?php

namespace App\Modules\Alerts\Services;

use App\Core\Database;
use PDO;

/**
 * Alert log report: how fast alerts were acknowledged, which are still waiting,
 * how often they escalated -- by type, urgency and responder.
 */
class AlertReportService
{
    /** "Acknowledged on time" means within this many minutes (shown in the report). */
    public const ON_TIME_MINUTES = 5;

    /** Filters: from, to (dates, default last 30 days), type?, urgency? */
    public function report(array $filters): array
    {
        $db = Database::connection();
        // "Today" by the database clock -- alerts are stamped with NOW() there, and PHP's
        // timezone can differ (e.g. UTC vs Manila), which would drop today's alerts after midnight.
        $today = (string) $db->query("SELECT CURDATE()")->fetchColumn();
        $from = $this->date($filters['from'] ?? null);
        // No end date: today (or the start date itself, if that is later).
        $to = $this->date($filters['to'] ?? null) ?? max($today, $from ?? '');
        $from ??= date('Y-m-d', strtotime($to . ' -29 days'));
        if ($from > $to) {
            [$from, $to] = [$to, $from];
        }
        $where = "a.created_at >= :from AND a.created_at < DATE_ADD(:to, INTERVAL 1 DAY)";
        $params = ['from' => $from, 'to' => $to];
        if (!empty($filters['type']) && is_string($filters['type'])) {
            $where .= " AND a.alert_type = :type";
            $params['type'] = $filters['type'];
        }
        if (in_array($filters['urgency'] ?? '', AlertService::URGENCIES, true)) {
            $where .= " AND a.urgency = :urg";
            $params['urg'] = $filters['urgency'];
        }

        $stmt = $db->prepare(
            "SELECT a.id, a.alert_type, a.urgency, a.title, a.created_at, a.requires_ack, a.acknowledged_at, a.acknowledged_by,
                    a.resolved_at, a.escalation_level, a.patient_id,
                    TIMESTAMPDIFF(SECOND, a.created_at, a.acknowledged_at) AS ack_seconds,
                    TIMESTAMPDIFF(MINUTE, a.created_at, NOW()) AS age_minutes,
                    (a.expires_at IS NOT NULL AND a.expires_at <= NOW()) AS expired,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name,
                    " . self::userNameSql('a.acknowledged_by') . " AS acknowledged_by_name,
                    (SELECT GROUP_CONCAT(CASE t.target_type WHEN 'everyone' THEN 'Everyone'
                                  WHEN 'role' THEN CONCAT('All ', t.target_role, 's')
                                  WHEN 'department' THEN (SELECT d.name FROM departments d WHERE d.id = t.target_id)
                                  ELSE " . self::userNameSql('t.target_id') . " END ORDER BY t.id SEPARATOR ', ')
                     FROM alert_targets t WHERE t.alert_id = a.id) AS sent_to
             FROM alerts a LEFT JOIN patients p ON p.id = a.patient_id
             WHERE {$where} ORDER BY a.id DESC"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $label = fn($t) => AlertService::TYPES[$t] ?? ucwords(str_replace('_', ' ', $t));
        $needAck = array_filter($rows, fn($r) => (int) $r['requires_ack'] === 1);
        $acked = array_filter($needAck, fn($r) => $r['acknowledged_at'] !== null);
        $open = array_filter($needAck, fn($r) => !$r['acknowledged_at'] && !$r['resolved_at'] && !$r['expired']);

        $byType = [];
        $byUrgency = [];
        $byResponder = [];
        $add = function (array &$bucket, string $key, string $name, array $r): void {
            $bucket[$key] ??= ['key' => $key, 'label' => $name, 'total' => 0, 'acknowledged' => 0, 'open' => 0, 'escalated' => 0, 'times' => []];
            $bucket[$key]['total']++;
            $bucket[$key]['escalated'] += (int) $r['escalation_level'] > 0 ? 1 : 0;
            if ($r['acknowledged_at']) {
                $bucket[$key]['acknowledged']++;
                $bucket[$key]['times'][] = (int) $r['ack_seconds'];
            } elseif (!$r['resolved_at'] && !$r['expired']) {
                $bucket[$key]['open']++;
            }
        };
        foreach ($needAck as $r) {
            $add($byType, $r['alert_type'], $label($r['alert_type']), $r);
            $add($byUrgency, $r['urgency'], ucfirst($r['urgency']), $r);
            if ($r['acknowledged_at'] && $r['acknowledged_by']) {
                $k = (int) $r['acknowledged_by'];
                $byResponder[$k] ??= ['name' => $r['acknowledged_by_name'] ?: 'User #' . $k, 'count' => 0, 'times' => []];
                $byResponder[$k]['count']++;
                $byResponder[$k]['times'][] = (int) $r['ack_seconds'];
            }
        }
        $finish = function (array $b): array {
            $s = $this->stats($b['times']);
            unset($b['times']);
            return $b + $s;
        };

        $times = array_map(fn($r) => (int) $r['ack_seconds'], $acked);
        $slowest = array_values($acked);
        usort($slowest, fn($a, $b) => (int) $b['ack_seconds'] <=> (int) $a['ack_seconds']);
        $openList = array_values($open);
        usort($openList, fn($a, $b) => (int) $b['age_minutes'] <=> (int) $a['age_minutes']);

        $row = fn($r) => [
            'id' => (int) $r['id'], 'type_label' => $label($r['alert_type']), 'urgency' => $r['urgency'], 'title' => $r['title'],
            'patient_name' => $r['patient_id'] ? ($r['patient_name'] ?: null) : null, 'created_at' => $r['created_at'],
            'sent_to' => $r['sent_to'], 'escalation_level' => (int) $r['escalation_level'],
            'acknowledged_at' => $r['acknowledged_at'], 'acknowledged_by_name' => $r['acknowledged_by'] ? $r['acknowledged_by_name'] : null,
            'ack_minutes' => $r['acknowledged_at'] ? round((int) $r['ack_seconds'] / 60, 1) : null,
            'age_minutes' => (int) $r['age_minutes'],
        ];

        return [
            'from' => $from, 'to' => $to, 'on_time_minutes' => self::ON_TIME_MINUTES,
            'summary' => [
                'total' => count($rows),
                'needs_ack' => count($needAck),
                'acknowledged' => count($acked),
                'open' => count($open),
                'closed_by_system' => count(array_filter($needAck, fn($r) => !$r['acknowledged_at'] && ($r['resolved_at'] || $r['expired']))),
                'escalated' => count(array_filter($needAck, fn($r) => (int) $r['escalation_level'] > 0)),
            ] + $this->stats($times),
            'by_type' => array_values(array_map($finish, $byType)),
            'by_urgency' => array_values(array_map($finish, $byUrgency)),
            'by_responder' => array_values(array_map($finish, $byResponder)),
            'open' => array_map($row, $openList),
            'slowest' => array_map($row, array_slice($slowest, 0, 10)),
            'rows' => array_map($row, $rows),
        ];
    }

    /** avg / median / longest minutes to acknowledge, and % on time. */
    private function stats(array $seconds): array
    {
        if (!$seconds) {
            return ['avg_minutes' => null, 'median_minutes' => null, 'max_minutes' => null, 'on_time_pct' => null];
        }
        sort($seconds);
        $n = count($seconds);
        $median = $n % 2 ? $seconds[intdiv($n, 2)] : ($seconds[$n / 2 - 1] + $seconds[$n / 2]) / 2;
        $onTime = count(array_filter($seconds, fn($s) => $s <= self::ON_TIME_MINUTES * 60));
        return [
            'avg_minutes' => round(array_sum($seconds) / $n / 60, 1),
            'median_minutes' => round($median / 60, 1),
            'max_minutes' => round(max($seconds) / 60, 1),
            'on_time_pct' => (int) round($onTime / $n * 100),
        ];
    }

    private function date($v): ?string
    {
        if (!is_string($v) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $v)) {
            return null;
        }
        [$y, $m, $d] = array_map('intval', explode('-', $v));
        return checkdate($m, $d, $y) ? $v : null;
    }

    private static function userNameSql(string $column): string
    {
        // Own aliases (nu / ne) so a caller's "u.id" can't be captured by this subquery.
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL
                 WHERE nu.id = {$column} LIMIT 1)";
    }
}
