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
 *   * Read-back (Phase 3): the alert is acknowledged only with who was told, when, how, that
 *     they read the result back, and what was done (acknowledge()). Every alert has a row in
 *     the Critical TAT report (critical_result_turnaround, source 'auto'): made when the alert
 *     goes out, completed by the read-back, marked when it escalates or the result is corrected.
 */
class CriticalLabService
{
    /** Critical results stay on the chart banner this long after they're acknowledged. */
    public const BANNER_DAYS = 3;
    /** How the person responsible was told. */
    public const METHODS = ['In-Person' => 'In person', 'Phone' => 'Phone', 'EHR Alert' => 'Read the alert in the system', 'SMS' => 'SMS / text', 'Pager' => 'Pager'];
    /** Minutes within which a critical result must reach the person responsible (the report's limit). */
    public const POLICY_MINUTES = 30;

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
                try {
                    $this->openTat($db, (int) $res['data']['id'], $o, $f, $actorId);
                } catch (\Throwable $e) {
                    error_log('critical TAT row failed: ' . $e->getMessage());
                }
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
                $db->prepare(
                    "UPDATE critical_result_turnaround t JOIN alerts a ON a.id = t.alert_id SET t.notes = CONCAT(COALESCE(CONCAT(t.notes, ' '), ''), :n), t.updated_at = NOW()
                     WHERE a.dedupe_key = :k AND t.acknowledged_at IS NULL"
                )->execute(['n' => 'Result corrected by the lab before it was acknowledged; alert closed.', 'k' => $k]);
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

    /**
     * Acknowledge a critical lab alert with its read-back.
     * data: told_self (1: I am the one responsible) | told_name + told_role?, told_at? (default now),
     *       method (METHODS), read_back (must be 1), action (what was done)
     */
    public function acknowledge(int $alertId, array $data, array $actor): array
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT id, alert_type, created_at, acknowledged_at FROM alerts WHERE id = :id");
        $stmt->execute(['id' => $alertId]);
        $a = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$a || $a['alert_type'] !== 'critical_lab') {
            return ['success' => false, 'message' => 'Critical lab alert not found.', 'not_found' => true];
        }
        $errors = [];
        $self = !empty($data['told_self']);
        $me = $this->userName($db, (int) $actor['id']) ?: 'me';
        $toldName = $self ? $me : trim((string) ($data['told_name'] ?? ''));
        $toldRole = $self ? self::roleLabel((string) ($actor['role'] ?? '')) : trim((string) ($data['told_role'] ?? ''));
        if ($toldName === '') {
            $errors['told_name'] = 'Who was told (e.g. Dr Santos, the attending)?';
        }
        $method = (string) ($data['method'] ?? '');
        if (!array_key_exists($method, self::METHODS)) {
            $errors['method'] = 'How were they told?';
        }
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        $at = $now;
        if (!empty($data['told_at'])) {
            $raw = str_replace('T', ' ', trim((string) $data['told_at']));
            $at = preg_match('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/', $raw) ? substr($raw . ':00', 0, 19) : '';
            if ($at === '') {
                $errors['told_at'] = 'Invalid time.';
            } elseif ($at > date('Y-m-d H:i:s', strtotime($now) + 300)) {
                $errors['told_at'] = 'That time is in the future.';
            } elseif ($at < substr($a['created_at'], 0, 16) . ':00') {
                $errors['told_at'] = 'That is before the result came out.';
            }
        }
        if (empty($data['read_back'])) {
            $errors['read_back'] = 'The person told must read the result back to you (patient, test, value); confirm that they did.';
        }
        $action = trim((string) ($data['action'] ?? ''));
        if ($action === '') {
            $errors['action'] = 'What was done about it (e.g. repeat test, medicine given, doctor coming)?';
        } elseif (mb_strlen($action) > 1000) {
            $errors['action'] = 'Keep it under 1000 characters.';
        }
        if ($errors) {
            return ['success' => false, 'message' => reset($errors), 'errors' => $errors];
        }
        $note = "Read-back: {$toldName}" . ($toldRole !== '' ? " ({$toldRole})" : '') . ', ' . self::METHODS[$method] . ', ' . date('g:i A', strtotime($at))
            . ". Action: {$action}";
        $ack = (new AlertService())->acknowledge($alertId, $actor, mb_substr($note, 0, 500), true);
        if (empty($ack['success']) || !empty($ack['data']['already'])) {
            return $ack;
        }
        $tat = $db->prepare("SELECT id FROM critical_result_turnaround WHERE alert_id = :a");
        $tat->execute(['a' => $alertId]);
        if ($tid = (int) $tat->fetchColumn()) {
            $reports = new \App\Modules\Reports\Services\ReportService();
            $row = $reports->updateCriticalTATRecord($tid, [
                'acknowledged_at' => $at, 'acknowledged_by' => mb_substr($toldName, 0, 200), 'acknowledged_by_role' => $toldRole !== '' ? mb_substr($toldRole, 0, 150) : null,
                'read_back_confirmed' => 1, 'documented_in_chart_at' => $now, 'action_taken' => $action,
                'first_call_method' => $method,
            ]);
            $db->prepare("UPDATE critical_result_turnaround SET status = :s, recorded_by = :u WHERE id = :id")
                ->execute(['s' => (int) ($row['jcaho_compliant'] ?? 0) === 1 ? 'Documented' : 'Breached', 'u' => (int) $actor['id'], 'id' => $tid]);
        }
        return ['success' => true, 'message' => "Read-back recorded: {$toldName} was told at " . date('g:i A', strtotime($at)) . '.', 'data' => ['tat_id' => $tid ?: null]];
    }

    /** The alert escalated: the report row shows it. */
    public function onEscalated(int $alertId, string $to): void
    {
        Database::connection()->prepare(
            "UPDATE critical_result_turnaround SET status = 'Escalated', escalated_to = TRIM(BOTH '; ' FROM CONCAT(COALESCE(escalated_to, ''), '; ', :to)), updated_at = NOW()
             WHERE alert_id = :a AND acknowledged_at IS NULL"
        )->execute(['to' => mb_substr($to, 0, 150), 'a' => $alertId]);
    }

    /** The report row for a new alert: result time, first notification (the EHR alert), who it went to. */
    private function openTat(PDO $db, int $alertId, array $o, array $f, int $actorId): void
    {
        $a = $db->prepare("SELECT created_at FROM alerts WHERE id = :id");
        $a->execute(['id' => $alertId]);
        $at = (string) $a->fetchColumn();
        $to = $db->prepare(
            "SELECT GROUP_CONCAT(CASE WHEN t.target_type = 'user' THEN " . self::nameSql('t.target_id') . " ELSE CONCAT('all ', t.target_role, 's') END SEPARATOR '; ')
             FROM alert_targets t WHERE t.alert_id = :id AND t.escalation_level = 0"
        );
        $to->execute(['id' => $alertId]);
        $range = null;
        if (!empty($f['range_id'])) {
            $r = $db->prepare("SELECT normal_low, normal_high, units FROM lab_result_ranges WHERE id = :id");
            $r->execute(['id' => $f['range_id']]);
            if ($x = $r->fetch(PDO::FETCH_ASSOC)) {
                $n = fn($v) => $v !== null ? rtrim(rtrim(number_format((float) $v, 4, '.', ''), '0'), '.') : null;
                $range = $x['normal_low'] !== null || $x['normal_high'] !== null
                    ? trim(($n($x['normal_low']) ?? '') . ' – ' . ($n($x['normal_high']) ?? '') . ' ' . $x['units']) : null;
            }
        }
        $actor = $db->prepare("SELECT LOWER(r.name) FROM users u LEFT JOIN roles r ON r.id = u.role_id WHERE u.id = :id");
        $actor->execute(['id' => $actorId]);
        $row = (new \App\Modules\Reports\Services\ReportService())->createCriticalTATRecord([
            'result_date' => $at, 'result_available_at' => $at, 'first_call_at' => $at, 'first_call_method' => 'EHR Alert',
            'first_call_to' => mb_substr((string) $to->fetchColumn(), 0, 200),
            'test_type' => preg_match('/culture|gram stain/i', (string) $f['name']) ? 'Microbiology' : 'Laboratory',
            'test_name' => mb_substr($f['name'] . ($o['test_name'] ? " ({$o['test_name']})" : ''), 0, 255),
            'critical_value' => mb_substr(trim(($f['value'] ?? '') . ' ' . ($f['units'] ?? '')) . ' — ' . $f['detail'], 0, 500),
            'normal_range' => $range ?? ($f['reference_range'] ?? null),
            'ordering_department' => $o['ward_name'] ?: 'Outpatient',
            'patient_id' => $o['patient_id'], 'patient_name' => $o['patient_name'], 'patient_mrn' => $o['patient_no'] ?? null,
            'patient_location' => $o['admission_id'] ? trim("{$o['ward_name']} {$o['bed_number']}") : 'Outpatient',
            'reported_by' => $this->userName($db, $actorId) ?: 'Laboratory', 'reported_by_role' => self::roleLabel((string) $actor->fetchColumn()),
            'policy_limit_minutes' => self::POLICY_MINUTES,
        ]);
        $db->prepare("UPDATE critical_result_turnaround SET source = 'auto', alert_id = :a WHERE id = :id")->execute(['a' => $alertId, 'id' => $row['id']]);
    }

    private static function roleLabel(string $role): string
    {
        return ['lab_technician' => 'Laboratory Technologist', 'charge_nurse' => 'Charge Nurse', 'nurse' => 'Nurse', 'doctor' => 'Physician',
            'admin' => 'Administrator', 'clinician' => 'Clinician', 'cna' => 'Nursing Assistant'][$role] ?? ucwords(str_replace('_', ' ', $role));
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
            "SELECT o.id, o.patient_id, o.provider_id AS order_provider_id, c.name AS test_name, p.patient_no,
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
