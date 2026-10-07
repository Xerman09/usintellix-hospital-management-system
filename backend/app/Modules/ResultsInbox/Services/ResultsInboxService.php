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
            (new ResultReviewService())->resultsChanged($orderId, null);
            return 0;
        }
        $critical = array_values(array_filter($rows, fn($r) => $r['flag'] === 'critical'));
        $abnormal = array_values(array_filter($rows, fn($r) => $r['flag'] === 'abnormal' || ($r['flag'] !== 'critical' && (int) $r['is_abnormal'] === 1)));
        $hash = md5(json_encode(array_map(fn($r) => [strtolower(trim((string) $r['name'])), trim((string) $r['value']), trim((string) $r['units']), $r['flag']], $rows)));
        $summary = self::summary($rows, $critical, $abnormal);
        $now = (string) $db->query("SELECT NOW()")->fetchColumn();
        // Sign-off (Phase 2): changed results need a new review; unchanged ones keep theirs.
        (new ResultReviewService())->resultsChanged($orderId, $hash);

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

    /**
     * The person's inbox. view:
     *   new     -- not opened yet
     *   recent  -- also those opened in the last days
     *   review  -- results of their patients (ordering / own doctor) not signed off yet, overdue first
     *   overdue -- every result not signed off within the limit (the whole hospital; admin)
     */
    public function list(int $userId, string $view = 'new'): array
    {
        $db = Database::connection();
        $days = ResultReviewService::days();
        $where = match ($view) {
            'recent' => "i.id IS NOT NULL AND (i.opened_at IS NULL OR i.resulted_at >= NOW() - INTERVAL " . self::RECENT_DAYS . " DAY)",
            'review' => "i.reason IN ('ordering', 'primary') AND o.reviewed_at IS NULL AND o.results_at IS NOT NULL",
            'overdue' => "o.reviewed_at IS NULL AND o.results_at < NOW() - INTERVAL {$days} DAY",
            default => "i.id IS NOT NULL AND i.opened_at IS NULL",
        };
        $order = in_array($view, ['review', 'overdue'], true)
            ? "review_overdue DESC, is_critical DESC, o.results_at ASC, o.id"
            : "i.opened_at IS NOT NULL, is_critical DESC, abnormal_count > 0 DESC, i.resulted_at DESC, i.id DESC";
        $res = fn(string $cond) => "(SELECT COUNT(*) FROM patient_procedure_results r WHERE r.patient_procedure_order_id = o.id AND r.deleted_at IS NULL{$cond})";
        $stmt = $db->prepare(
            "SELECT i.id, o.id AS order_id, o.patient_id, i.reason, i.summary, i.is_corrected, i.opened_at,
                    COALESCE(i.kind, CASE WHEN COALESCE(c.order_test_type, pc.order_test_type) = 'Imaging' OR COALESCE(c.order_from, pc.order_from) = 'Radiology Department' THEN 'radiology' ELSE 'lab' END) AS kind,
                    COALESCE(i.is_critical, {$res(" AND r.flag = 'critical'")} > 0) AS is_critical,
                    COALESCE(i.abnormal_count, {$res(" AND (r.flag = 'abnormal' OR (r.flag IS NULL AND r.is_abnormal = 1))")}) AS abnormal_count,
                    COALESCE(i.result_count, {$res('')}) AS result_count,
                    COALESCE(i.resulted_at, o.results_at) AS resulted_at, o.results_at, o.reviewed_at, o.review_action, o.review_comment,
                    " . self::nameSql('o.reviewed_by') . " AS reviewed_by_name,
                    (o.reviewed_at IS NULL AND o.results_at < NOW() - INTERVAL {$days} DAY) AS review_overdue,
                    TIMESTAMPDIFF(DAY, o.results_at, NOW()) AS days_waiting,
                    NULLIF(TRIM(CONCAT(COALESCE(pe.first_name, ''), ' ', COALESCE(pe.last_name, ''))), '') AS ordering_doctor,
                    p.patient_no, TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name,
                    c.name AS test_name, w.ward_name, b.bed_number
             FROM patient_procedure_orders o
             LEFT JOIN results_inbox i ON i.order_id = o.id AND i.user_id = :u
             JOIN patients p ON p.id = o.patient_id AND p.deleted_at IS NULL
             LEFT JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN procedure_order_configs pc ON pc.id = c.parent_id
             LEFT JOIN providers pr ON pr.id = o.provider_id LEFT JOIN employees pe ON pe.id = pr.employee_id
             LEFT JOIN inpatient_admissions a ON a.id = (SELECT MAX(x.id) FROM inpatient_admissions x WHERE x.patient_id = o.patient_id AND x.status IN ('Admitted', 'Pending Discharge'))
             LEFT JOIN hospital_wards w ON w.id = a.ward_id LEFT JOIN hospital_beds b ON b.id = a.bed_id
             WHERE o.deleted_at IS NULL AND {$where}
             ORDER BY {$order}
             LIMIT 200"
        );
        $stmt->execute(['u' => $userId]);
        $items = array_map([$this, 'shape'], $stmt->fetchAll(PDO::FETCH_ASSOC));
        return ['items' => $items, 'server_time' => (string) $db->query("SELECT NOW()")->fetchColumn(), 'review_days' => $days] + $this->count($userId);
    }

    /**
     * For the "!": how many results are new (and critical); how many of their patients' results
     * wait for their sign-off, and how many of those are over the limit.
     */
    public function count(int $userId): array
    {
        $days = ResultReviewService::days();
        $stmt = Database::connection()->prepare(
            "SELECT COALESCE(SUM(i.opened_at IS NULL), 0) AS n, COALESCE(SUM(i.opened_at IS NULL AND i.is_critical = 1), 0) AS c,
                    COALESCE(SUM(i.reason IN ('ordering', 'primary') AND o.reviewed_at IS NULL AND o.results_at IS NOT NULL), 0) AS r,
                    COALESCE(SUM(i.reason IN ('ordering', 'primary') AND o.reviewed_at IS NULL AND o.results_at < NOW() - INTERVAL {$days} DAY), 0) AS late
             FROM results_inbox i JOIN patient_procedure_orders o ON o.id = i.order_id AND o.deleted_at IS NULL
             JOIN patients p ON p.id = i.patient_id AND p.deleted_at IS NULL
             WHERE i.user_id = :u"
        );
        $stmt->execute(['u' => $userId]);
        $r = $stmt->fetch(PDO::FETCH_ASSOC);
        return ['new' => (int) $r['n'], 'critical' => (int) $r['c'], 'to_review' => (int) $r['r'], 'review_overdue' => (int) $r['late']];
    }

    /**
     * Open a result: from the inbox (id), or by order (order_id: an alert, the overdue list,
     * Patient Results). Opening takes it off the "!" for this person. Returns the result, its
     * sign-off and whether this person may sign it off.
     */
    public function open(array $ref, array $user): array
    {
        $db = Database::connection();
        $uid = (int) ($user['id'] ?? 0);
        if (!empty($ref['id'])) {
            $stmt = $db->prepare("SELECT * FROM results_inbox WHERE id = :id AND user_id = :u");
            $stmt->execute(['id' => (int) $ref['id'], 'u' => $uid]);
        } else {
            $stmt = $db->prepare("SELECT * FROM results_inbox WHERE order_id = :o AND user_id = :u");
            $stmt->execute(['o' => (int) ($ref['order_id'] ?? 0), 'u' => $uid]);
        }
        $item = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
        // Not in their inbox: clinical staff (and admin, for the overdue list) may still look it up by order.
        $mayLookUp = \App\Core\PhiAccessGuard::isClinicalRole($user['role'] ?? null) || ($user['role'] ?? '') === 'admin';
        if (!$item && (!empty($ref['id']) || !$mayLookUp)) {
            return ['success' => false, 'message' => 'Result not found in your inbox.', 'not_found' => true];
        }
        $orderId = $item ? (int) $item['order_id'] : (int) $ref['order_id'];
        $o = $this->order($db, $orderId);
        if (!$o) {
            return ['success' => false, 'message' => 'Result not found.', 'not_found' => true];
        }
        if ($item) {
            $db->prepare("UPDATE results_inbox SET opened_at = COALESCE(opened_at, NOW()) WHERE id = :id")->execute(['id' => $item['id']]);
        }
        $list = $this->list($uid, 'recent');
        $shaped = $item ? current(array_filter($list['items'], fn($x) => $x['id'] === (int) $item['id'])) : null;
        return ['success' => true, 'message' => 'Opened.', 'data' => [
            'item' => $shaped ?: null,
            'order' => [
                'id' => (int) $o['id'], 'test_name' => $o['test_name'], 'kind' => $o['kind'], 'order_date' => $o['order_date'], 'status' => $o['status'],
                'reported_at' => $o['reported_at'], 'specimen' => $o['specimen'], 'ordering_doctor' => $o['ordering_doctor'],
                'entered_by' => $o['entered_by'], 'patient_id' => (int) $o['patient_id'], 'patient_no' => $o['patient_no'], 'patient_name' => $o['patient_name'],
                'location' => $o['admission_id'] ? trim("{$o['ward_name']} {$o['bed_number']}") : null,
            ],
            'results' => (new PatientProcedureResultService())->listForOrder($orderId),
            'review' => (new ResultReviewService())->status($orderId, $user),
            'new' => $list['new'], 'critical' => $list['critical'], 'to_review' => $list['to_review'], 'review_overdue' => $list['review_overdue'],
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
            'id' => $r['id'] !== null ? (int) $r['id'] : null, 'order_id' => (int) $r['order_id'], 'patient_id' => (int) $r['patient_id'], 'patient_no' => $r['patient_no'] ?? null,
            'patient_name' => $r['patient_name'] ?? null, 'test_name' => $r['test_name'] ?? null, 'kind' => $r['kind'], 'reason' => $r['reason'] ?? null,
            'critical' => (int) $r['is_critical'] === 1, 'abnormal' => (int) $r['abnormal_count'], 'results' => (int) $r['result_count'],
            'summary' => $r['summary'], 'corrected' => (int) ($r['is_corrected'] ?? 0) === 1, 'resulted_at' => $r['resulted_at'], 'opened_at' => $r['opened_at'],
            'reviewed_at' => $r['reviewed_at'] ?? null, 'reviewed_by_name' => $r['reviewed_by_name'] ?? null, 'review_action' => $r['review_action'] ?? null,
            'review_action_label' => isset($r['review_action']) ? (ResultReviewService::ACTIONS[$r['review_action']] ?? $r['review_action']) : null,
            'review_comment' => $r['review_comment'] ?? null, 'review_overdue' => (int) ($r['review_overdue'] ?? 0) === 1,
            'days_waiting' => isset($r['days_waiting']) ? (int) $r['days_waiting'] : null, 'ordering_doctor' => $r['ordering_doctor'] ?? null,
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

    private static function nameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(ne.first_name, ''), ' ', COALESCE(ne.last_name, ''))), ''), nu.username)
                 FROM users nu LEFT JOIN employees ne ON ne.user_id = nu.id AND ne.deleted_at IS NULL WHERE nu.id = {$column} LIMIT 1)";
    }
}
