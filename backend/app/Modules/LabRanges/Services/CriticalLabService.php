<?php

namespace App\Modules\LabRanges\Services;

use App\Core\Database;
use App\Modules\Alerts\Services\AlertService;
use App\Modules\InpatientOrders\Services\MedOrderService;
use PDO;

/**
 * Critical lab results: instant notification (Critical lab values, Phase 2).
 *
 *   * A result flagged critical (saved or imported) raises a 'critical_lab' alert of urgency
 *     critical: it pops up with a sound for the ordering doctor and the patient's nurse (the
 *     nurse assigned this shift, else the ward's nurses) until one of them acknowledges it.
 *     Not acknowledged in time, it escalates by the alert escalation policy for critical_lab
 *     (Alerts > Escalation; module 1).
 *   * One alert per result value: saving the same results again doesn't alert twice; a
 *     corrected result (no longer critical, or a different value) closes the old alert.
 *   * The patient's chart shows a red banner with the critical results of the last days and
 *     whether each was acknowledged (forPatient()).
 */
class CriticalLabService
{
    /** Critical results stay on the chart banner this long after they're acknowledged. */
    public const BANNER_DAYS = 3;

    /**
     * After an order's results were saved. flags: [{result_id, name, value, units, flag, detail}].
     * Returns the alerts raised.
     */
    public function notify(int $orderId, array $flags, int $actorId): array
    {
        $db = Database::connection();
        $o = $this->order($db, $orderId);
        if (!$o) {
            return [];
        }
        $current = [];
        $raised = [];
        foreach ($flags as $f) {
            if (($f['flag'] ?? null) !== 'critical') {
                continue;
            }
            $key = self::key($orderId, $f);
            $current[$key] = true;
            $seen = $db->prepare("SELECT 1 FROM alerts WHERE dedupe_key = :k LIMIT 1");
            $seen->execute(['k' => $key]);
            if ($seen->fetchColumn()) {
                continue;   // this result was already alerted
            }
            $value = trim(($f['value'] ?? '') . ' ' . ($f['units'] ?? ''));
            $where = $o['admission_id'] ? " ({$o['ward_name']} {$o['bed_number']})" : '';
            $res = AlertService::raise([
                'type' => 'critical_lab', 'urgency' => 'critical',
                'title' => "CRITICAL LAB: {$f['name']} {$value} — {$o['patient_name']}{$where}",
                'body' => "{$f['detail']}. " . ($o['test_name'] ? "Test: {$o['test_name']}. " : '')
                    . 'Resulted by ' . ($this->userName($db, $actorId) ?: 'the lab') . '. Acknowledge that you have seen it and act on it.',
                'patient_id' => $o['patient_id'], 'link' => ['patient_id' => $o['patient_id']],
                'targets' => $this->targets($db, $o), 'source_type' => 'patient_procedure_results',
                'source_id' => (int) ($f['result_id'] ?? 0) ?: null, 'dedupe_key' => $key,
            ], $actorId ?: null);
            if (!empty($res['success'])) {
                $raised[] = ['key' => $key, 'name' => $f['name'], 'value' => $value];
            } else {
                error_log('critical lab alert not sent: ' . json_encode($res));
            }
        }
        // A result corrected or removed: its open alert is closed.
        $open = $db->prepare("SELECT dedupe_key FROM alerts WHERE dedupe_key LIKE :p AND resolved_at IS NULL AND acknowledged_at IS NULL");
        $open->execute(['p' => "critlab:{$orderId}:%"]);
        foreach ($open->fetchAll(PDO::FETCH_COLUMN) as $k) {
            if (!isset($current[$k])) {
                AlertService::resolveByKey($k, $actorId ?: null, 'Result corrected');
            }
        }
        return $raised;
    }

    /**
     * For the chart's red banner: critical results of the patient not acknowledged yet, or
     * acknowledged in the last few days. Each with its alert's acknowledgement.
     */
    public function forPatient(int $patientId, array $viewer): array
    {
        $db = Database::connection();
        // Results are re-saved as new rows, so the alert is found by its key (order + test + value).
        $stmt = $db->prepare(
            "SELECT r.id, r.name, r.value, r.units, r.flag_detail, r.created_at, r.patient_procedure_order_id AS order_id
             FROM patient_procedure_results r JOIN patient_procedure_orders o ON o.id = r.patient_procedure_order_id
             WHERE o.patient_id = :p AND r.flag = 'critical' AND r.deleted_at IS NULL AND o.deleted_at IS NULL
             ORDER BY r.created_at DESC, r.id DESC LIMIT 50"
        );
        $stmt->execute(['p' => $patientId]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $alerts = [];
        if ($results) {
            $keys = array_map(fn($r) => self::key((int) $r['order_id'], $r), $results);
            $in = implode(',', array_fill(0, count($keys), '?'));
            $q = $db->prepare(
                "SELECT a.id, a.dedupe_key, a.created_at AS alerted_at, a.acknowledged_at, a.ack_note, a.escalation_level, a.resolved_at, " . self::nameSql('a.acknowledged_by') . " AS acknowledged_by_name,
                        (SELECT COUNT(*) FROM alert_targets t WHERE t.alert_id = a.id AND ((t.target_type = 'user' AND t.target_id = ?)
                            OR (t.target_type = 'role' AND t.target_role = ?))) AS is_mine,
                        (a.acknowledged_at >= NOW() - INTERVAL " . self::BANNER_DAYS . " DAY) AS recent_ack
                 FROM alerts a WHERE a.alert_type = 'critical_lab' AND a.dedupe_key IN ({$in}) ORDER BY a.id"
            );
            $q->execute(array_merge([(int) ($viewer['id'] ?? 0), (string) ($viewer['role'] ?? '')], $keys));
            foreach ($q->fetchAll(PDO::FETCH_ASSOC) as $a) {
                $alerts[$a['dedupe_key']] = $a;
            }
        }
        $rows = [];
        foreach ($results as $r) {
            $a = $alerts[self::key((int) $r['order_id'], $r)] ?? null;
            // Shown while not acknowledged, and for a few days after.
            if ($a && ($a['resolved_at'] && !$a['acknowledged_at'] || ($a['acknowledged_at'] && !(int) $a['recent_ack']))) {
                continue;
            }
            $rows[] = [
                'result_id' => (int) $r['id'], 'order_id' => (int) $r['order_id'], 'name' => $r['name'],
                'value' => trim(($r['value'] ?? '') . ' ' . ($r['units'] ?? '')), 'detail' => $r['flag_detail'],
                // The alert's time (DB clock, like the acknowledgement); results are stamped by PHP.
                'resulted_at' => $a['alerted_at'] ?? $r['created_at'],
                'alert_id' => $a ? (int) $a['id'] : null, 'acknowledged_at' => $a['acknowledged_at'] ?? null,
                'acknowledged_by_name' => $a && $a['acknowledged_at'] ? $a['acknowledged_by_name'] : null, 'ack_note' => $a['ack_note'] ?? null,
                'escalation_level' => (int) ($a['escalation_level'] ?? 0),
                'can_acknowledge' => $a !== null && !$a['acknowledged_at'] && (int) $a['is_mine'] > 0,
            ];
        }
        usort($rows, fn($x, $y) => [$x['acknowledged_at'] !== null, $y['resulted_at']] <=> [$y['acknowledged_at'] !== null, $x['resulted_at']]);
        return ['results' => array_slice($rows, 0, 20), 'unacknowledged' => count(array_filter($rows, fn($r) => !$r['acknowledged_at']))];
    }

    // ------------------------------------------------------------------

    /** One key per order + result + value: the same critical value isn't alerted twice. */
    public static function key(int $orderId, array $f): string
    {
        return "critlab:{$orderId}:" . substr(md5(strtolower(trim((string) $f['name'])) . '|' . trim((string) ($f['value'] ?? '')) . '|' . strtolower(trim((string) ($f['units'] ?? '')))), 0, 16);
    }

    /** The ordering doctor (else the patient's own provider, else all doctors) and the patient's nurse when admitted. */
    private function targets(PDO $db, array $o): array
    {
        $t = [];
        $doctor = null;
        foreach ([$o['order_provider_id'], $o['patient_provider_id']] as $providerId) {
            if (!$providerId) {
                continue;
            }
            $stmt = $db->prepare(
                "SELECT e.user_id FROM providers p JOIN employees e ON e.id = p.employee_id AND e.deleted_at IS NULL
                 JOIN users u ON u.id = e.user_id AND u.deleted_at IS NULL WHERE p.id = :id"
            );
            $stmt->execute(['id' => $providerId]);
            if ($doctor = $stmt->fetchColumn()) {
                break;
            }
        }
        $t[] = $doctor ? ['user' => (int) $doctor] : ['role' => 'doctor'];
        if ($o['admission_id']) {
            foreach ((new MedOrderService())->nurseTargets((int) $o['admission_id']) as $n) {
                $t[] = $n;
            }
        }
        return $t;
    }

    private function order(PDO $db, int $orderId): ?array
    {
        $stmt = $db->prepare(
            "SELECT o.id, o.patient_id, o.provider_id AS order_provider_id, c.name AS test_name,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name, p.provider_id AS patient_provider_id,
                    a.id AS admission_id, w.ward_name, b.bed_number
             FROM patient_procedure_orders o JOIN patients p ON p.id = o.patient_id
             LEFT JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN inpatient_admissions a ON a.id = (SELECT MAX(x.id) FROM inpatient_admissions x WHERE x.patient_id = o.patient_id AND x.status IN ('Admitted', 'Pending Discharge'))
             LEFT JOIN hospital_wards w ON w.id = a.ward_id LEFT JOIN hospital_beds b ON b.id = a.bed_id
             WHERE o.id = :id"
        );
        $stmt->execute(['id' => $orderId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function userName(PDO $db, int $userId): ?string
    {
        if (!$userId) {
            return null;
        }
        $stmt = $db->prepare("SELECT " . self::nameSql(':id'));
        $stmt->execute(['id' => $userId]);
        return $stmt->fetchColumn() ?: null;
    }

    private static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL
                 WHERE nu.id = {$column} LIMIT 1)";
    }
}
