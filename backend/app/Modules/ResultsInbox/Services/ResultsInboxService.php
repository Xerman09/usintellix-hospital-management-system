<?php

namespace App\Modules\ResultsInbox\Services;

use App\Core\Database;
use App\Modules\InpatientOrders\Services\MedOrderService;
use App\Modules\PatientProcedureResults\Services\PatientProcedureResultService;
use PDO;

/**
 * Results inbox (module 7, Phase 1): the "!" in the top bar.
 *
 *   * When an order's lab or radiology results are saved (typed or imported), each person the
 *     patient belongs to gets the result in their inbox: the ordering doctor, the patient's own
 *     doctor, and the patient's nurse when admitted (the nurse assigned this shift, else the
 *     ward's nurses).
 *   * A result stays new until that person opens it; opening it shows the result. A corrected
 *     result (values changed after it was sent) is new again, marked "corrected".
 *   * Critical results come first, then abnormal, then the rest, newest first.
 */
class ResultsInboxService
{
    /** Opened results stay under "Recent" this long. */
    public const RECENT_DAYS = 14;

    /** After an order's results were saved. Returns the number of people it went to (new or made new again). */
    public function deliver(int $orderId, int $actorId): int
    {
        $db = Database::connection();
        $o = $this->order($db, $orderId);
        if (!$o) {
            return 0;
        }
        $rows = (new PatientProcedureResultService())->listForOrder($orderId);
        if (!$rows) {
            // The results were removed: nobody needs to open them any more.
            $db->prepare("DELETE FROM results_inbox WHERE order_id = :o AND opened_at IS NULL")->execute(['o' => $orderId]);
            return 0;
        }
        $critical = array_values(array_filter($rows, fn($r) => $r['flag'] === 'critical'));
        $abnormal = array_values(array_filter($rows, fn($r) => $r['flag'] === 'abnormal' || ($r['flag'] !== 'critical' && (int) $r['is_abnormal'] === 1)));
        $hash = md5(json_encode(array_map(fn($r) => [strtolower(trim((string) $r['name'])), trim((string) $r['value']), trim((string) $r['units']), $r['flag']], $rows)));
        $summary = self::summary($rows, $critical, $abnormal);
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();

        $sent = 0;
        $find = $db->prepare("SELECT id, content_hash, opened_at FROM results_inbox WHERE order_id = :o AND user_id = :u");
        foreach ($this->recipients($db, $o) as $userId => $reason) {
            $mine = $userId === $actorId;   // whoever entered the result has seen it
            $find->execute(['o' => $orderId, 'u' => $userId]);
            $row = $find->fetch(PDO::FETCH_ASSOC);
            $values = [
                'k' => $o['kind'], 'c' => $critical ? 1 : 0, 'a' => count($abnormal), 'n' => count($rows),
                's' => mb_substr($summary, 0, 500), 'h' => $hash, 'now' => $now, 'op' => $mine ? $now : null,
            ];
            if (!$row) {
                $db->prepare(
                    "INSERT INTO results_inbox (order_id, patient_id, user_id, kind, reason, is_critical, abnormal_count, result_count, summary, content_hash, resulted_at, opened_at, created_at)
                     VALUES (:o, :p, :u, :k, :r, :c, :a, :n, :s, :h, :now, :op, :now)"
                )->execute($values + ['o' => $orderId, 'p' => $o['patient_id'], 'u' => $userId, 'r' => $reason]);
                $sent += $mine ? 0 : 1;
            } elseif ($row['content_hash'] !== $hash) {
                // Corrected: new again (and marked so) once it had gone out.
                $db->prepare(
                    "UPDATE results_inbox SET kind = :k, is_critical = :c, abnormal_count = :a, result_count = :n, summary = :s, content_hash = :h,
                            is_corrected = 1, resulted_at = :now, opened_at = :op, updated_at = :now WHERE id = :id"
                )->execute($values + ['id' => $row['id']]);
                $sent += $mine ? 0 : 1;
            }
        }
        return $sent;
    }

    /** The person's inbox. view: new (not opened yet) | recent (also those opened in the last days). */
    public function list(int $userId, string $view = 'new'): array
    {
        $db = Database::connection();
        $where = $view === 'recent' ? "(i.opened_at IS NULL OR i.resulted_at >= NOW() - INTERVAL " . self::RECENT_DAYS . " DAY)" : "i.opened_at IS NULL";
        $stmt = $db->prepare(
            "SELECT i.id, i.order_id, i.patient_id, i.kind, i.reason, i.is_critical, i.abnormal_count, i.result_count, i.summary, i.is_corrected,
                    i.resulted_at, i.opened_at, p.patient_no, TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name,
                    c.name AS test_name, w.ward_name, b.bed_number
             FROM results_inbox i
             JOIN patient_procedure_orders o ON o.id = i.order_id AND o.deleted_at IS NULL
             JOIN patients p ON p.id = i.patient_id AND p.deleted_at IS NULL
             LEFT JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN inpatient_admissions a ON a.id = (SELECT MAX(x.id) FROM inpatient_admissions x WHERE x.patient_id = i.patient_id AND x.status IN ('Admitted', 'Pending Discharge'))
             LEFT JOIN hospital_wards w ON w.id = a.ward_id LEFT JOIN hospital_beds b ON b.id = a.bed_id
             WHERE i.user_id = :u AND {$where}
             ORDER BY i.opened_at IS NOT NULL, i.is_critical DESC, i.abnormal_count > 0 DESC, i.resulted_at DESC, i.id DESC
             LIMIT 200"
        );
        $stmt->execute(['u' => $userId]);
        $items = array_map([$this, 'shape'], $stmt->fetchAll(PDO::FETCH_ASSOC));
        return ['items' => $items, 'server_time' => (string) $db->query("SELECT NOW()")->fetchColumn()] + $this->count($userId);
    }

    /** For the "!": how many results are new, how many of them critical. */
    public function count(int $userId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT COUNT(*) AS n, COALESCE(SUM(i.is_critical), 0) AS c
             FROM results_inbox i JOIN patient_procedure_orders o ON o.id = i.order_id AND o.deleted_at IS NULL
             JOIN patients p ON p.id = i.patient_id AND p.deleted_at IS NULL
             WHERE i.user_id = :u AND i.opened_at IS NULL"
        );
        $stmt->execute(['u' => $userId]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return ['new' => (int) $r['n'], 'critical' => (int) $r['c']];
    }

    /** Open a result from the inbox: it is no longer new. Returns the result to show. */
    public function open(int $id, array $user): array
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT * FROM results_inbox WHERE id = :id");
        $stmt->execute(['id' => $id]);
        $item = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$item || (int) $item['user_id'] !== (int) ($user['id'] ?? 0)) {
            return ['success' => false, 'message' => 'Result not found in your inbox.', 'not_found' => true];
        }
        $db->prepare("UPDATE results_inbox SET opened_at = COALESCE(opened_at, NOW()) WHERE id = :id")->execute(['id' => $id]);
        $o = $this->order($db, (int) $item['order_id']);
        if (!$o) {
            return ['success' => false, 'message' => 'The order was removed.', 'not_found' => true];
        }
        $list = $this->list((int) $user['id'], 'recent');
        $shaped = current(array_filter($list['items'], fn($x) => $x['id'] === $id)) ?: $this->shape($item + ['patient_name' => $o['patient_name'], 'patient_no' => $o['patient_no'], 'test_name' => $o['test_name']]);
        return ['success' => true, 'message' => 'Opened.', 'data' => [
            'item' => $shaped,
            'order' => [
                'id' => (int) $o['id'], 'test_name' => $o['test_name'], 'kind' => $o['kind'], 'order_date' => $o['order_date'], 'status' => $o['status'],
                'reported_at' => $o['reported_at'], 'specimen' => $o['specimen'], 'ordering_doctor' => $o['ordering_doctor'],
                'entered_by' => $o['entered_by'], 'patient_id' => (int) $o['patient_id'], 'patient_no' => $o['patient_no'], 'patient_name' => $o['patient_name'],
                'location' => $o['admission_id'] ? trim("{$o['ward_name']} {$o['bed_number']}") : null,
            ],
            'results' => (new PatientProcedureResultService())->listForOrder((int) $item['order_id']),
            'new' => $list['new'], 'critical' => $list['critical'],
        ]];
    }

    // ------------------------------------------------------------------

    /** "Potassium 2.1 mmol/L (critical); Sodium 128 mmol/L (low) · 6 more normal" */
    private static function summary(array $rows, array $critical, array $abnormal): string
    {
        $fmt = fn($r, $tag) => trim("{$r['name']} " . trim(($r['value'] ?? '') . ' ' . ($r['units'] ?? ''))) . ($tag ? " ({$tag})" : '');
        $parts = array_merge(array_map(fn($r) => $fmt($r, 'critical'), $critical), array_map(fn($r) => $fmt($r, 'abnormal'), $abnormal));
        $rest = count($rows) - count($parts);
        if (!$parts) {
            $parts = array_map(fn($r) => $fmt($r, ''), array_slice($rows, 0, 3));
            $rest = count($rows) - count($parts);
            return implode('; ', $parts) . ($rest > 0 ? " · {$rest} more" : '');
        }
        $shown = array_slice($parts, 0, 4);
        $more = count($parts) - count($shown);
        return implode('; ', $shown) . ($more > 0 ? " · {$more} more flagged" : '') . ($rest > 0 ? " · {$rest} normal" : '');
    }

    private function shape(array $r): array
    {
        return [
            'id' => (int) $r['id'], 'order_id' => (int) $r['order_id'], 'patient_id' => (int) $r['patient_id'], 'patient_no' => $r['patient_no'] ?? null,
            'patient_name' => $r['patient_name'] ?? null, 'test_name' => $r['test_name'] ?? null, 'kind' => $r['kind'], 'reason' => $r['reason'],
            'critical' => (int) $r['is_critical'] === 1, 'abnormal' => (int) $r['abnormal_count'], 'results' => (int) $r['result_count'],
            'summary' => $r['summary'], 'corrected' => (int) $r['is_corrected'] === 1, 'resulted_at' => $r['resulted_at'], 'opened_at' => $r['opened_at'],
            'location' => !empty($r['ward_name']) ? trim($r['ward_name'] . ' ' . ($r['bed_number'] ?? '')) : null,
        ];
    }

    /** user id => why it's theirs: the ordering doctor, the patient's own doctor, the patient's nurse. */
    private function recipients(PDO $db, array $o): array
    {
        $to = [];
        foreach (['ordering' => $o['order_provider_id'], 'primary' => $o['patient_provider_id']] as $reason => $providerId) {
            if ($providerId && ($u = $this->providerUser($db, (int) $providerId)) && !isset($to[$u])) {
                $to[$u] = $reason;
            }
        }
        if ($o['admission_id']) {
            foreach ((new MedOrderService())->nurseTargets((int) $o['admission_id']) as $t) {
                if (isset($t['user']) && !isset($to[$t['user']])) {
                    $to[(int) $t['user']] = 'nurse';
                }
            }
        }
        return $to;
    }

    private function providerUser(PDO $db, int $providerId): ?int
    {
        $stmt = $db->prepare(
            "SELECT e.user_id FROM providers p JOIN employees e ON e.id = p.employee_id AND e.deleted_at IS NULL
             JOIN users u ON u.id = e.user_id AND u.deleted_at IS NULL WHERE p.id = :id"
        );
        $stmt->execute(['id' => $providerId]);
        return (int) $stmt->fetchColumn() ?: null;
    }

    private function order(PDO $db, int $orderId): ?array
    {
        $stmt = $db->prepare(
            "SELECT o.id, o.patient_id, o.provider_id AS order_provider_id, o.order_date, o.status, o.reported_at, o.specimen,
                    c.name AS test_name, p.patient_no, p.provider_id AS patient_provider_id,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name,
                    CASE WHEN COALESCE(c.order_test_type, pc.order_test_type) = 'Imaging' OR COALESCE(c.order_from, pc.order_from) = 'Radiology Department'
                         THEN 'radiology' ELSE 'lab' END AS kind,
                    NULLIF(TRIM(CONCAT(COALESCE(pe.first_name, ''), ' ', COALESCE(pe.last_name, ''))), '') AS ordering_doctor,
                    (SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                     FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL WHERE nu.id = o.updated_by LIMIT 1) AS entered_by,
                    a.id AS admission_id, w.ward_name, b.bed_number
             FROM patient_procedure_orders o JOIN patients p ON p.id = o.patient_id
             LEFT JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN procedure_order_configs pc ON pc.id = c.parent_id
             LEFT JOIN providers pr ON pr.id = o.provider_id LEFT JOIN employees pe ON pe.id = pr.employee_id
             LEFT JOIN inpatient_admissions a ON a.id = (SELECT MAX(x.id) FROM inpatient_admissions x WHERE x.patient_id = o.patient_id AND x.status IN ('Admitted', 'Pending Discharge'))
             LEFT JOIN hospital_wards w ON w.id = a.ward_id LEFT JOIN hospital_beds b ON b.id = a.bed_id
             WHERE o.id = :id AND o.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $orderId]);
        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }
}
