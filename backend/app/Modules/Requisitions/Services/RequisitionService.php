<?php

namespace App\Modules\Requisitions\Services;

use App\Core\Database;
use App\Modules\Procurement\Services\RecordLock;
use App\Modules\DrugInventory\Services\WarehouseService;
use App\Modules\PurchaseOrders\Services\PurchaseOrderService;
use PDO;
use Throwable;

/**
 * Purchase requisitions (PR-YYYY-NNNNN): a department or ward asks for
 * items; its head approves; purchasing turns approved requests into
 * purchase orders.
 *
 *   draft --submit--> submitted --approve--> approved --(ordered)--> ... closed
 *                        |  ^
 *                 reject |  | resubmit           cancel: before anything is ordered
 *                        v  |
 *                      rejected
 *
 * Who approves: the head of the requesting department (departments.
 * head_of_department_id -> employees.user_id). A department without a
 * head is approved by an administrator. Nobody approves a request they
 * made or submitted.
 *
 * Ordering: convert() puts approved request lines on draft purchase
 * orders -- one per supplier and delivery location -- and records in
 * purchase_order_item_sources which request lines each PO line covers.
 * How much of a request is ordered / received is always worked out from
 * those links (orders that are cancelled or deleted don't count), so
 * cancelling a PO puts its quantity back on the request. A PO line's
 * received quantity is shared out to its requests oldest link first.
 */
class RequisitionService
{
    public const STATUSES = ['draft', 'submitted', 'approved', 'rejected', 'cancelled', 'closed'];

    public const EDITABLE_STATUSES = ['draft', 'rejected'];

    /** Anyone on staff can ask for things. */
    public const REQUESTER_ROLES = ['admin', 'receptionist', 'doctor', 'accountant'];

    /** Purchasing: turns approved requests into purchase orders. */
    public const PURCHASER_ROLES = PurchaseOrderService::CREATOR_ROLES;

    public const PRIORITIES = ['normal', 'urgent'];

    public const INPUT_FIELDS = ['department_id', 'warehouse_id', 'needed_by', 'priority', 'reason', 'items', 'submit'];

    private const EPSILON = 0.0005;

    /* ---------------------------------------------------------------
     * Reading
     * ------------------------------------------------------------- */

    /** Filters: status?, department_id?, mine? (created by the viewer) */
    public function list(array $filters = [], ?array $viewer = null): array
    {
        $where = ['r.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['status']) && in_array($filters['status'], self::STATUSES, true)) {
            $where[] = 'r.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['department_id'])) {
            $where[] = 'r.department_id = :department';
            $params['department'] = (int) $filters['department_id'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT r.*, d.name AS department_name, w.name AS warehouse_name,
                    " . self::userNameSql('r.created_by') . " AS created_by_name,
                    (SELECT e.user_id FROM employees e WHERE e.id = d.head_of_department_id AND e.deleted_at IS NULL) AS head_user_id
             FROM purchase_requisitions r
             JOIN departments d ON d.id = r.department_id
             LEFT JOIN warehouses w ON w.id = r.warehouse_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY r.id DESC
             LIMIT 2000"
        );
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$rows) {
            return [];
        }

        // Progress per request, from its lines.
        $ids = array_column($rows, 'id');
        $placeholders = implode(', ', array_fill(0, count($ids), '?'));
        $stmt = Database::connection()->prepare(
            "SELECT id, purchase_requisition_id, base_quantity FROM purchase_requisition_items WHERE purchase_requisition_id IN ({$placeholders})"
        );
        $stmt->execute($ids);
        $lines = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $progress = $this->progress(array_map('intval', array_column($lines, 'id')));

        $byRequest = [];
        foreach ($lines as $line) {
            $p = $progress[(int) $line['id']] ?? ['ordered' => 0.0, 'received' => 0.0];
            $byRequest[(int) $line['purchase_requisition_id']][] = ['requested' => (float) $line['base_quantity']] + $p;
        }

        return array_map(fn(array $r) => $this->formatHeader($r, $viewer, $byRequest[(int) $r['id']] ?? []), $rows);
    }

    public function get(int $id, ?array $viewer = null): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT r.*, d.name AS department_name, w.name AS warehouse_name,
                    " . self::userNameSql('r.created_by') . " AS created_by_name,
                    " . self::userNameSql('r.approved_by') . " AS approved_by_name,
                    " . self::userNameSql('r.rejected_by') . " AS rejected_by_name,
                    (SELECT e.user_id FROM employees e WHERE e.id = d.head_of_department_id AND e.deleted_at IS NULL) AS head_user_id,
                    (SELECT TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))) FROM employees e
                      WHERE e.id = d.head_of_department_id AND e.deleted_at IS NULL) AS head_name
             FROM purchase_requisitions r
             JOIN departments d ON d.id = r.department_id
             LEFT JOIN warehouses w ON w.id = r.warehouse_id
             WHERE r.id = :id AND r.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $stmt = $db->prepare(
            "SELECT i.*, d.name AS drug_name, d.package_quantity, du.name AS unit_name, pu.name AS package_unit_name
             FROM purchase_requisition_items i
             JOIN drugs d ON d.id = i.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
             WHERE i.purchase_requisition_id = :id
             ORDER BY i.line_no, i.id"
        );
        $stmt->execute(['id' => $id]);
        $lines = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $progress = $this->progress(array_map('intval', array_column($lines, 'id')));

        $items = array_map(function (array $r) use ($progress) {
            $p = $progress[(int) $r['id']] ?? ['ordered' => 0.0, 'received' => 0.0, 'orders' => []];
            $requested = (float) $r['base_quantity'];

            return [
                'id' => (int) $r['id'],
                'line_no' => (int) $r['line_no'],
                'drug_id' => (int) $r['drug_id'],
                'drug_name' => $r['drug_name'],
                'unit_name' => $r['unit_name'],
                'package_unit_name' => $r['package_unit_name'],
                'order_unit' => $r['order_unit'],
                'units_per_package' => $r['units_per_package'] !== null ? (float) $r['units_per_package'] : null,
                'quantity' => (float) $r['quantity'],
                'base_quantity' => $requested,
                'ordered' => $p['ordered'],
                'received' => $p['received'],
                'outstanding' => max(0, round($requested - $p['ordered'], 3)),
                'orders' => $p['orders'],
                'notes' => $r['notes']
            ];
        }, $lines);

        $request = $this->formatHeader($row, $viewer, array_map(fn($i) => ['requested' => $i['base_quantity'], 'ordered' => $i['ordered'], 'received' => $i['received']], $items));
        $request['items'] = $items;
        $request['approved_by_name'] = $row['approved_by_name'];
        $request['rejected_by_name'] = $row['rejected_by_name'];
        $request['head_name'] = $row['head_name'] ?: null;

        $stmt = $db->prepare(
            "SELECT h.id, h.action, h.notes, h.created_at, " . self::userNameSql('h.user_id') . " AS user_name
             FROM purchase_requisition_history h WHERE h.purchase_requisition_id = :id ORDER BY h.created_at, h.id"
        );
        $stmt->execute(['id' => $id]);
        $request['history'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $request;
    }

    /**
     * For the request form: departments (with their heads), storage
     * locations (with the department that owns them), stockable items,
     * and the viewer's own department.
     */
    public function options(?array $viewer = null): array
    {
        $db = Database::connection();

        $departments = $db->query(
            "SELECT d.id, d.name,
                    (SELECT TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))) FROM employees e
                      WHERE e.id = d.head_of_department_id AND e.deleted_at IS NULL) AS head_name
             FROM departments d WHERE d.deleted_at IS NULL AND d.status = 'active' ORDER BY d.name"
        )->fetchAll(PDO::FETCH_ASSOC);

        $warehouses = $db->query(
            "SELECT id, name, department_id FROM warehouses WHERE deleted_at IS NULL AND is_active = 1 ORDER BY name"
        )->fetchAll(PDO::FETCH_ASSOC);

        $drugs = $db->query(
            "SELECT d.id, d.name, d.product_type, d.package_quantity, du.name AS unit_name, pu.name AS package_unit_name,
                    COALESCE((SELECT SUM(l.quantity_on_hand) FROM drug_inventory_lots l
                              WHERE l.drug_id = d.id AND l.deleted_at IS NULL AND l.is_active = 1), 0) AS on_hand
             FROM drugs d
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
             WHERE d.deleted_at IS NULL AND d.is_active = 1 AND d.allow_inventory = 1
             ORDER BY d.name"
        )->fetchAll(PDO::FETCH_ASSOC);

        $myDepartment = null;
        if ($viewer) {
            $stmt = $db->prepare("SELECT department_id FROM employees WHERE user_id = :u AND deleted_at IS NULL LIMIT 1");
            $stmt->execute(['u' => (int) $viewer['id']]);
            $myDepartment = $stmt->fetchColumn() ?: null;
        }

        return [
            'departments' => array_map(fn($d) => ['id' => (int) $d['id'], 'name' => $d['name'], 'head_name' => $d['head_name'] ?: null], $departments),
            'warehouses' => array_map(fn($w) => [
                'id' => (int) $w['id'], 'name' => $w['name'], 'department_id' => $w['department_id'] !== null ? (int) $w['department_id'] : null
            ], $warehouses),
            'drugs' => array_map(fn($d) => [
                'id' => (int) $d['id'],
                'name' => $d['name'],
                'product_type' => $d['product_type'],
                'unit_name' => $d['unit_name'],
                'package_unit_name' => $d['package_unit_name'],
                'package_quantity' => $d['package_quantity'] !== null && (float) $d['package_quantity'] > 0 ? (float) $d['package_quantity'] : null,
                'on_hand' => (float) $d['on_hand']
            ], $drugs),
            'my_department_id' => $myDepartment !== null ? (int) $myDepartment : null,
            'can_order' => in_array($viewer['role'] ?? null, self::PURCHASER_ROLES, true)
        ];
    }

    /**
     * "Create requisition from low stock" for a storage location: items
     * below the minimum set for that location, with enough to bring them
     * back to the maximum (or minimum), less what's already been asked
     * for and not yet received.
     */
    public function lowStock(int $warehouseId): ?array
    {
        $check = (new WarehouseService())->stockCheck($warehouseId);

        if (!$check) {
            return null;
        }

        // Still coming for this location: requested on open requests, not yet received.
        $stmt = Database::connection()->prepare(
            "SELECT i.id, i.drug_id, i.base_quantity
             FROM purchase_requisition_items i
             JOIN purchase_requisitions r ON r.id = i.purchase_requisition_id
             WHERE r.warehouse_id = :w AND r.deleted_at IS NULL AND r.status IN ('draft', 'submitted', 'approved', 'rejected')"
        );
        $stmt->execute(['w' => $warehouseId]);
        $open = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $progress = $this->progress(array_map('intval', array_column($open, 'id')));

        $pending = [];
        foreach ($open as $line) {
            $p = $progress[(int) $line['id']] ?? ['received' => 0.0];
            $pending[(int) $line['drug_id']] = ($pending[(int) $line['drug_id']] ?? 0) + max(0, (float) $line['base_quantity'] - $p['received']);
        }

        $items = [];
        foreach ($check['items'] as $item) {
            if (!in_array($item['status'], ['out', 'low'], true) || !$item['drug_is_active']) {
                continue;
            }

            $alreadyAsked = round($pending[$item['drug_id']] ?? 0, 3);
            $suggest = round(max(0, $item['suggested_qty'] - $alreadyAsked), 3);

            $items[] = [
                'drug_id' => $item['drug_id'],
                'drug_name' => $item['drug_name'],
                'unit_name' => $item['unit_name'],
                'on_hand' => $item['on_hand'],
                'min_level' => $item['min_level'],
                'max_level' => $item['max_level'],
                'status' => $item['status'],
                'already_requested' => $alreadyAsked,
                'suggested_qty' => $suggest
            ];
        }

        return [
            'warehouse_id' => $warehouseId,
            'warehouse_name' => $check['location']['name'] ?? null,
            'department_id' => isset($check['location']['department_id']) && $check['location']['department_id'] !== null ? (int) $check['location']['department_id'] : null,
            'items' => $items,
            'levels_set' => $check['summary']['tracked']
        ];
    }

    /**
     * Approved request lines not fully ordered yet (for "Order from
     * Requests"), with the suppliers and prices to choose from.
     */
    public function outstanding(): array
    {
        $stmt = Database::connection()->query(
            "SELECT i.id, i.drug_id, i.base_quantity, i.notes, r.id AS requisition_id, r.pr_number, r.needed_by, r.priority,
                    r.warehouse_id, w.name AS warehouse_name, dep.name AS department_name,
                    d.name AS drug_name, d.package_quantity, d.preferred_supplier_id, d.unit_cost, du.name AS unit_name, pu.name AS package_unit_name
             FROM purchase_requisition_items i
             JOIN purchase_requisitions r ON r.id = i.purchase_requisition_id
             JOIN departments dep ON dep.id = r.department_id
             LEFT JOIN warehouses w ON w.id = r.warehouse_id
             JOIN drugs d ON d.id = i.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
             WHERE r.status = 'approved' AND r.deleted_at IS NULL
             ORDER BY r.priority = 'urgent' DESC, r.needed_by IS NULL, r.needed_by, r.id, i.line_no"
        );
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $progress = $this->progress(array_map('intval', array_column($rows, 'id')));

        $lines = [];
        foreach ($rows as $r) {
            $ordered = $progress[(int) $r['id']]['ordered'] ?? 0.0;
            $outstanding = round((float) $r['base_quantity'] - $ordered, 3);

            if ($outstanding <= self::EPSILON) {
                continue;
            }

            $lines[] = [
                'requisition_item_id' => (int) $r['id'],
                'requisition_id' => (int) $r['requisition_id'],
                'pr_number' => $r['pr_number'],
                'department_name' => $r['department_name'],
                'needed_by' => $r['needed_by'],
                'priority' => $r['priority'],
                'warehouse_id' => $r['warehouse_id'] !== null ? (int) $r['warehouse_id'] : null,
                'warehouse_name' => $r['warehouse_name'],
                'drug_id' => (int) $r['drug_id'],
                'drug_name' => $r['drug_name'],
                'unit_name' => $r['unit_name'],
                'package_unit_name' => $r['package_unit_name'],
                'package_quantity' => $r['package_quantity'] !== null && (float) $r['package_quantity'] > 0 ? (float) $r['package_quantity'] : null,
                'preferred_supplier_id' => $r['preferred_supplier_id'] !== null ? (int) $r['preferred_supplier_id'] : null,
                'unit_cost' => $r['unit_cost'] !== null ? (float) $r['unit_cost'] : null,
                'requested' => (float) $r['base_quantity'],
                'ordered' => $ordered,
                'outstanding' => $outstanding,
                'notes' => $r['notes']
            ];
        }

        $options = (new PurchaseOrderService())->options();

        return [
            'lines' => $lines,
            'suppliers' => $options['suppliers'],
            'listings' => array_values(array_filter($options['listings'], fn($l) => $l['is_active'] && $l['supplier_is_active']))
        ];
    }

    /* ---------------------------------------------------------------
     * Saving
     * ------------------------------------------------------------- */

    public function create(array $data, int $userId): array
    {
        return $this->save(null, $data, $userId);
    }

    public function update(int $id, array $data, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Request not found.', 'not_found' => true];
        }

        if (!in_array($existing['status'], self::EDITABLE_STATUSES, true)) {
            return ['success' => false, 'message' => 'Only draft or rejected requests can be changed.'];
        }

        if ((int) $existing['created_by'] !== (int) $user['id'] && ($user['role'] ?? null) !== 'admin') {
            return ['success' => false, 'message' => 'Only the person who made this request (or an administrator) can change it.'];
        }

        return $this->save($existing, $data, (int) $user['id']);
    }

    private function save(?array $existing, array $data, int $userId): array
    {
        $submit = !empty($data['submit']);
        [$header, $lines, $errors] = $this->normalize($data, $submit);

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $db = Database::connection();
        $now = date('Y-m-d H:i:s');
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            $values = $header + ['updated_at' => $now, 'updated_by' => $userId];

            if ($submit) {
                $values += [
                    'status' => 'submitted', 'submitted_at' => $now, 'submitted_by' => $userId,
                    'rejected_at' => null, 'rejected_by' => null, 'rejection_reason' => null
                ];
            }

            if ($existing) {
                $id = (int) $existing['id'];
                $this->updateRow($id, $values);
                $db->prepare("DELETE FROM purchase_requisition_items WHERE purchase_requisition_id = :id")->execute(['id' => $id]);
                $number = $existing['pr_number'];
            } else {
                $values += ['status' => 'draft', 'created_at' => $now, 'created_by' => $userId];
                $columns = array_keys($values);
                $db->prepare("INSERT INTO purchase_requisitions (" . implode(', ', $columns) . ") VALUES (:" . implode(', :', $columns) . ")")
                    ->execute($values);
                $id = (int) $db->lastInsertId();
                $number = 'PR-' . date('Y') . '-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT);
                $this->updateRow($id, ['pr_number' => $number]);
                $this->log($id, 'created', null, $userId, $now);
            }

            $insert = $db->prepare(
                "INSERT INTO purchase_requisition_items (purchase_requisition_id, line_no, drug_id, order_unit, units_per_package, quantity, base_quantity, notes, created_at)
                 VALUES (:req, :line_no, :drug, :unit, :per, :qty, :base, :notes, :now)"
            );
            foreach ($lines as $i => $line) {
                $insert->execute([
                    'req' => $id, 'line_no' => $i + 1, 'drug' => $line['drug_id'], 'unit' => $line['order_unit'],
                    'per' => $line['units_per_package'], 'qty' => $line['quantity'], 'base' => $line['base_quantity'],
                    'notes' => $line['notes'], 'now' => $now
                ]);
            }

            if ($submit) {
                $this->log($id, $existing && $existing['status'] === 'rejected' ? 'resubmitted' : 'submitted', null, $userId, $now);
            }

            if ($ownsTransaction) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }
            error_log('requisition save failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to save the request.'];
        }

        return [
            'success' => true,
            'message' => $submit ? "Request {$number} submitted for approval." : "Request {$number} saved as a draft.",
            'data' => ['id' => $id, 'pr_number' => $number]
        ];
    }

    /* ---------------------------------------------------------------
     * Approval and closing
     * ------------------------------------------------------------- */

    /** Why $user can't approve/reject this request, or null if they can. */
    public function approvalBlocker(array $request, ?array $user): ?string
    {
        if ($request['status'] !== 'submitted') {
            return 'This request is not waiting for approval.';
        }

        $userId = (int) ($user['id'] ?? 0);

        if ($userId === (int) $request['created_by'] || $userId === (int) $request['submitted_by']) {
            return 'You made or submitted this request, so someone else has to approve it.';
        }

        $headUserId = $request['head_user_id'] ?? $this->headUserId((int) $request['department_id']);

        if ($headUserId !== null && (int) $headUserId === $userId) {
            return null;
        }

        if (($user['role'] ?? null) === 'admin') {
            return null;
        }

        return $headUserId
            ? 'Only the head of the requesting department (or an administrator) can approve it.'
            : 'This department has no head set, so an administrator approves its requests.';
    }

    public function approve(int $id, string $notes, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Request not found.', 'not_found' => true];
        }

        if ($blocker = $this->approvalBlocker($existing, $user)) {
            return ['success' => false, 'message' => $blocker];
        }

        $notes = mb_substr(trim($notes), 0, 500);
        $now = date('Y-m-d H:i:s');

        if (!$this->transition($id, [
            'status' => 'approved', 'approved_at' => $now, 'approved_by' => (int) $user['id'],
            'approval_notes' => $notes !== '' ? $notes : null
        ], 'approved', $notes, (int) $user['id'], $now, $existing)) {
            return $this->stale($existing);
        }

        return ['success' => true, 'message' => "Request {$existing['pr_number']} approved. Purchasing can now order it."];
    }

    public function reject(int $id, string $reason, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Request not found.', 'not_found' => true];
        }

        if ($blocker = $this->approvalBlocker($existing, $user)) {
            return ['success' => false, 'message' => $blocker];
        }

        $reason = mb_substr(trim($reason), 0, 255);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['reason' => 'Say why, so the request can be changed.']];
        }

        $now = date('Y-m-d H:i:s');

        if (!$this->transition($id, [
            'status' => 'rejected', 'rejected_at' => $now, 'rejected_by' => (int) $user['id'], 'rejection_reason' => $reason
        ], 'rejected', $reason, (int) $user['id'], $now, $existing)) {
            return $this->stale($existing);
        }

        return ['success' => true, 'message' => "Request {$existing['pr_number']} rejected."];
    }

    /** Before anything on it is ordered. */
    public function cancel(int $id, string $reason, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Request not found.', 'not_found' => true];
        }

        if (!in_array($existing['status'], ['draft', 'submitted', 'rejected', 'approved'], true)) {
            return ['success' => false, 'message' => 'This request is already ' . $existing['status'] . '.'];
        }

        if ((int) $existing['created_by'] !== (int) $user['id'] && !in_array($user['role'] ?? null, array_merge(['admin'], self::PURCHASER_ROLES), true)) {
            return ['success' => false, 'message' => 'Only the person who made this request, purchasing, or an administrator can cancel it.'];
        }

        if ($this->orderedTotal($id) > self::EPSILON) {
            return ['success' => false, 'message' => 'Part of this request is already on a purchase order. Close it instead, so the rest isn\'t ordered.'];
        }

        $reason = mb_substr(trim($reason), 0, 255);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['reason' => 'Say why the request is cancelled.']];
        }

        $now = date('Y-m-d H:i:s');

        if (!$this->transition($id, [
            'status' => 'cancelled', 'cancelled_at' => $now, 'cancelled_by' => (int) $user['id'], 'cancel_reason' => $reason
        ], 'cancelled', $reason, (int) $user['id'], $now, $existing)) {
            return $this->stale($existing);
        }

        return ['success' => true, 'message' => "Request {$existing['pr_number']} cancelled."];
    }

    /** Approved and partly ordered: the rest won't be ordered. */
    public function close(int $id, string $reason, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Request not found.', 'not_found' => true];
        }

        if (!in_array($user['role'] ?? null, self::PURCHASER_ROLES, true)) {
            return ['success' => false, 'message' => 'Only purchasing can close a request.'];
        }

        if ($existing['status'] !== 'approved') {
            return ['success' => false, 'message' => 'Only approved requests can be closed.'];
        }

        $reason = mb_substr(trim($reason), 0, 255);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['reason' => 'Say why the rest won\'t be ordered.']];
        }

        $now = date('Y-m-d H:i:s');

        if (!$this->transition($id, [
            'status' => 'closed', 'closed_at' => $now, 'closed_by' => (int) $user['id'], 'close_reason' => $reason
        ], 'closed', $reason, (int) $user['id'], $now, $existing)) {
            return $this->stale($existing);
        }

        return ['success' => true, 'message' => "Request {$existing['pr_number']} closed; nothing more will be ordered for it."];
    }

    public function remove(int $id, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Request not found.', 'not_found' => true];
        }

        if ($existing['status'] !== 'draft') {
            return ['success' => false, 'message' => 'Only drafts can be deleted. Cancel it instead.'];
        }

        if ((int) $existing['created_by'] !== (int) $user['id'] && ($user['role'] ?? null) !== 'admin') {
            return ['success' => false, 'message' => 'Only the person who made this draft can delete it.'];
        }

        $this->updateRow($id, ['deleted_at' => date('Y-m-d H:i:s'), 'deleted_by' => (int) $user['id']]);

        return ['success' => true, 'message' => "Draft {$existing['pr_number']} deleted."];
    }

    /* ---------------------------------------------------------------
     * Ordering
     * ------------------------------------------------------------- */

    /**
     * Puts approved request lines on draft purchase orders, one per
     * supplier and delivery location. Body: lines: [{ requisition_item_id,
     * quantity (dispensing units), supplier_id }].
     */
    public function convert(array $data, array $user): array
    {
        if (!in_array($user['role'] ?? null, self::PURCHASER_ROLES, true)) {
            return ['success' => false, 'message' => 'Only purchasing can create purchase orders.'];
        }

        $db = Database::connection();
        $rows = is_array($data['lines'] ?? null) ? array_values($data['lines']) : [];
        $outstanding = [];
        foreach ($this->outstanding()['lines'] as $line) {
            $outstanding[$line['requisition_item_id']] = $line;
        }

        $errors = [];
        $picked = [];

        foreach ($rows as $i => $row) {
            $key = "lines.{$i}";
            $itemId = (int) ($row['requisition_item_id'] ?? 0);
            $line = $outstanding[$itemId] ?? null;
            $qty = is_numeric($row['quantity'] ?? null) ? round((float) $row['quantity'], 3) : 0.0;
            $supplierId = (int) ($row['supplier_id'] ?? 0);

            if (!$line) {
                $errors["{$key}.quantity"] = 'This request line isn\'t approved, or is already fully ordered.';
                continue;
            }

            if (isset($picked[$itemId])) {
                $errors["{$key}.quantity"] = 'This line is listed twice.';
                continue;
            }

            if ($qty <= 0) {
                $errors["{$key}.quantity"] = 'Enter how much to order.';
            } elseif ($qty > $line['outstanding'] + self::EPSILON) {
                $errors["{$key}.quantity"] = 'Only ' . $this->fmt($line['outstanding']) . ' still to order.';
            }

            if (!$supplierId) {
                $errors["{$key}.supplier_id"] = 'Choose the supplier.';
            }

            $picked[$itemId] = ['line' => $line, 'quantity' => $qty, 'supplier_id' => $supplierId];
        }

        if (!$picked && !$errors) {
            $errors['lines'] = 'Choose the request lines to order.';
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        // Group: supplier + delivery location -> drug -> request lines.
        $groups = [];
        foreach ($picked as $itemId => $p) {
            $groupKey = $p['supplier_id'] . '|' . ($p['line']['warehouse_id'] ?? 0);
            $groups[$groupKey]['supplier_id'] = $p['supplier_id'];
            $groups[$groupKey]['warehouse_id'] = $p['line']['warehouse_id'];
            $groups[$groupKey]['needed_by'][] = $p['line']['needed_by'];
            $groups[$groupKey]['numbers'][$p['line']['pr_number']] = true;
            $groups[$groupKey]['drugs'][$p['line']['drug_id']]['line'] = $p['line'];
            $groups[$groupKey]['drugs'][$p['line']['drug_id']]['sources'][] = [$itemId, $p['quantity']];
        }

        $listings = [];
        foreach ((new PurchaseOrderService())->options()['listings'] as $listing) {
            if ($listing['is_active'] && $listing['supplier_is_active']) {
                $listings[$listing['supplier_id'] . '|' . $listing['drug_id']] ??= $listing;
            }
        }

        $now = date('Y-m-d H:i:s');
        $userId = (int) $user['id'];
        $created = [];
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            // Two people ordering the same requests at once (or a double click): the second
            // waits for the first, then finds the lines already ordered.
            $requisitionIds = array_values(array_unique(array_map(fn($p) => (int) $p['line']['requisition_id'], $picked)));
            $db->prepare(
                "SELECT id FROM purchase_requisitions WHERE id IN (" . implode(', ', array_fill(0, count($requisitionIds), '?')) . ") FOR UPDATE"
            )->execute($requisitionIds);

            $stillOutstanding = array_column($this->outstanding()['lines'], 'outstanding', 'requisition_item_id');
            foreach ($picked as $itemId => $p) {
                if ($p['quantity'] > ($stillOutstanding[$itemId] ?? 0) + self::EPSILON) {
                    throw new RequisitionConvertException("some of these request lines were just ordered by someone else. Reload and try again.");
                }
            }

            $poService = new PurchaseOrderService();
            $linkStmt = $db->prepare(
                "INSERT INTO purchase_order_item_sources (purchase_order_item_id, requisition_item_id, base_quantity, created_at)
                 VALUES (:line, :req, :qty, :now)"
            );

            foreach ($groups as $group) {
                $items = [];
                foreach ($group['drugs'] as $drugId => $entry) {
                    $base = round(array_sum(array_column($entry['sources'], 1)), 3);
                    $items[] = $this->orderLine($drugId, $base, $entry['line'], $listings[$group['supplier_id'] . '|' . $drugId] ?? null);
                }

                $neededBy = array_filter($group['needed_by']);
                $result = $poService->create([
                    'supplier_id' => $group['supplier_id'],
                    'order_date' => date('Y-m-d'),
                    'expected_date' => $neededBy ? max(date('Y-m-d'), min($neededBy)) : null,
                    'warehouse_id' => $group['warehouse_id'],
                    'notes' => 'From purchase request ' . implode(', ', array_keys($group['numbers'])) . '.',
                    'items' => $items
                ], $userId);

                if (!$result['success']) {
                    $first = $result['errors'] ? reset($result['errors']) : $result['message'];
                    throw new RequisitionConvertException($first);
                }

                $poId = $result['data']['id'];
                $stmt = $db->prepare("SELECT id, drug_id FROM purchase_order_items WHERE purchase_order_id = :id");
                $stmt->execute(['id' => $poId]);
                $lineByDrug = [];
                foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $poLine) {
                    $lineByDrug[(int) $poLine['drug_id']] = (int) $poLine['id'];
                }

                foreach ($group['drugs'] as $drugId => $entry) {
                    foreach ($entry['sources'] as [$itemId, $qty]) {
                        $linkStmt->execute(['line' => $lineByDrug[$drugId], 'req' => $itemId, 'qty' => $qty, 'now' => $now]);
                    }
                }

                foreach (array_keys($group['numbers']) as $prNumber) {
                    $reqId = (int) $db->query("SELECT id FROM purchase_requisitions WHERE pr_number = " . $db->quote($prNumber))->fetchColumn();
                    $this->log($reqId, 'ordered', "{$result['data']['po_number']} (draft)", $userId, $now);
                }

                $created[] = ['id' => $poId, 'po_number' => $result['data']['po_number'], 'supplier_id' => $group['supplier_id'], 'item_count' => count($items)];
            }

            if ($ownsTransaction) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }

            if ($e instanceof RequisitionConvertException) {
                return ['success' => false, 'message' => 'Couldn\'t create the purchase orders: ' . $e->getMessage()];
            }

            error_log('requisition convert failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to create the purchase orders. Nothing was saved.'];
        }

        return [
            'success' => true,
            'message' => count($created) === 1
                ? "Draft purchase order {$created[0]['po_number']} created. Check the prices and submit it for approval."
                : count($created) . ' draft purchase orders created (' . implode(', ', array_column($created, 'po_number')) . '). Check the prices and submit them for approval.',
            'data' => ['orders' => $created]
        ];
    }

    /**
     * One PO line for $base dispensing units of an item: in the supplier's
     * packages when it's a whole number of them, else in units, priced
     * from the supplier's list price (else the catalog cost).
     */
    private function orderLine(int $drugId, float $base, array $line, ?array $listing): array
    {
        $per = $line['package_quantity'];
        $usePackages = $per && $listing && $listing['price_basis'] === 'package' && abs($base / $per - round($base / $per)) < self::EPSILON;

        if ($listing) {
            $unitPrice = $listing['price_basis'] === 'package' && $per
                ? ($usePackages ? (float) $listing['price'] : (float) $listing['price'] / $per)
                : ($usePackages ? (float) $listing['price'] * $per : (float) $listing['price']);
        } else {
            $unitPrice = (float) ($line['unit_cost'] ?? 0);
        }

        return [
            'drug_id' => $drugId,
            'order_unit' => $usePackages ? 'package' : 'unit',
            'quantity' => $usePackages ? round($base / $per, 3) : $base,
            'unit_price' => round($unitPrice, 4),
            'discount_amount' => 0,
            'vat_type' => 'vatable',
            'supplier_item_code' => $listing['supplier_item_code'] ?? ''
        ];
    }

    /* ---------------------------------------------------------------
     * Ordered / received, from the purchase orders
     * ------------------------------------------------------------- */

    /**
     * For each requisition line id: ordered and received (dispensing
     * units) and the orders it's on. Orders that are cancelled or deleted
     * don't count. A PO line's received quantity goes to its requests
     * oldest link first.
     *
     * @param int[] $itemIds
     */
    private function progress(array $itemIds): array
    {
        if (!$itemIds) {
            return [];
        }

        $db = Database::connection();
        $placeholders = implode(', ', array_fill(0, count($itemIds), '?'));
        $stmt = $db->prepare(
            "SELECT s.id, s.purchase_order_item_id, s.requisition_item_id, s.base_quantity,
                    poi.quantity_received, poi.order_unit, poi.units_per_package,
                    po.id AS po_id, po.po_number, po.status AS po_status
             FROM purchase_order_item_sources s
             JOIN purchase_order_items poi ON poi.id = s.purchase_order_item_id
             JOIN purchase_orders po ON po.id = poi.purchase_order_id
             WHERE po.deleted_at IS NULL AND po.status <> 'cancelled'
               AND s.purchase_order_item_id IN (SELECT s2.purchase_order_item_id FROM purchase_order_item_sources s2 WHERE s2.requisition_item_id IN ({$placeholders}))
             ORDER BY s.purchase_order_item_id, s.id"
        );
        $stmt->execute($itemIds);

        $wanted = array_flip($itemIds);
        $result = [];
        $receivedLeft = [];

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $poLine = (int) $r['purchase_order_item_id'];
            $per = $r['order_unit'] === 'package' && $r['units_per_package'] ? (float) $r['units_per_package'] : 1.0;
            $receivedLeft[$poLine] ??= (float) $r['quantity_received'] * $per;

            $got = min((float) $r['base_quantity'], $receivedLeft[$poLine]);
            $receivedLeft[$poLine] -= $got;
            // A PO closed short won't bring the rest, so only what came counts as ordered.
            $qty = $r['po_status'] === 'closed' ? $got : (float) $r['base_quantity'];

            $itemId = (int) $r['requisition_item_id'];
            if (!isset($wanted[$itemId])) {
                continue;
            }

            $result[$itemId] ??= ['ordered' => 0.0, 'received' => 0.0, 'orders' => []];
            $result[$itemId]['ordered'] = round($result[$itemId]['ordered'] + $qty, 3);
            $result[$itemId]['received'] = round($result[$itemId]['received'] + $got, 3);
            $result[$itemId]['orders'][] = [
                'purchase_order_id' => (int) $r['po_id'],
                'po_number' => $r['po_number'],
                'po_status' => $r['po_status'],
                'ordered' => $qty,
                'received' => round($got, 3)
            ];
        }

        return $result;
    }

    private function orderedTotal(int $requisitionId): float
    {
        $stmt = Database::connection()->prepare("SELECT id FROM purchase_requisition_items WHERE purchase_requisition_id = :id");
        $stmt->execute(['id' => $requisitionId]);
        $progress = $this->progress(array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN)));

        return array_sum(array_column($progress, 'ordered'));
    }

    /* ---------------------------------------------------------------
     * Validation + helpers
     * ------------------------------------------------------------- */

    /** @return array{0: array, 1: array, 2: array} [header, lines, errors] */
    private function normalize(array $data, bool $submit): array
    {
        $db = Database::connection();
        $errors = [];
        $header = [];

        $departmentId = (int) ($data['department_id'] ?? 0);
        $stmt = $db->prepare("SELECT id FROM departments WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $departmentId]);

        if (!$departmentId || !$stmt->fetchColumn()) {
            $errors['department_id'] = 'Choose the department asking for the items.';
        }
        $header['department_id'] = $departmentId;

        $warehouseId = !empty($data['warehouse_id']) ? (int) $data['warehouse_id'] : null;
        if ($warehouseId !== null) {
            $stmt = $db->prepare("SELECT id FROM warehouses WHERE id = :id AND deleted_at IS NULL");
            $stmt->execute(['id' => $warehouseId]);
            if (!$stmt->fetchColumn()) {
                $errors['warehouse_id'] = 'Storage location not found.';
            }
        }
        $header['warehouse_id'] = $warehouseId;

        $neededBy = trim((string) ($data['needed_by'] ?? ''));
        $header['needed_by'] = $neededBy !== '' ? $neededBy : null;
        if ($header['needed_by'] !== null && !$this->isValidDate($header['needed_by'])) {
            $errors['needed_by'] = 'Enter a valid date.';
        } elseif ($header['needed_by'] !== null && $submit && $header['needed_by'] < date('Y-m-d')) {
            $errors['needed_by'] = 'The date needed has already passed.';
        }

        $priority = (string) ($data['priority'] ?? 'normal');
        $header['priority'] = in_array($priority, self::PRIORITIES, true) ? $priority : 'normal';

        $reason = trim((string) ($data['reason'] ?? ''));
        $header['reason'] = $reason !== '' ? mb_substr($reason, 0, 2000) : null;

        if ($submit && $header['reason'] === null) {
            $errors['reason'] = 'Say what the items are needed for.';
        }

        $items = is_array($data['items'] ?? null) ? array_values($data['items']) : [];
        $lines = [];
        $seen = [];
        $drugStmt = $db->prepare("SELECT id, name, is_active, allow_inventory, package_quantity FROM drugs WHERE id = :id AND deleted_at IS NULL");

        foreach ($items as $i => $item) {
            $key = "items.{$i}";
            $item = is_array($item) ? $item : [];
            $drugId = (int) ($item['drug_id'] ?? 0);
            $drugStmt->execute(['id' => $drugId]);
            $drug = $drugId ? $drugStmt->fetch(PDO::FETCH_ASSOC) : false;

            if (!$drug) {
                $errors["{$key}.drug_id"] = 'Choose an item.';
                continue;
            }

            if (!(int) $drug['is_active'] || !(int) $drug['allow_inventory']) {
                $errors["{$key}.drug_id"] = "{$drug['name']} can't be requested (inactive or not stocked).";
            }

            if (isset($seen[$drugId])) {
                $errors["{$key}.drug_id"] = 'Already on line ' . ($seen[$drugId] + 1) . '.';
                continue;
            }
            $seen[$drugId] = $i;

            $per = (float) $drug['package_quantity'] > 0 ? (float) $drug['package_quantity'] : null;
            $unit = ($item['order_unit'] ?? 'unit') === 'package' && $per ? 'package' : 'unit';
            $qty = is_numeric($item['quantity'] ?? null) ? round((float) $item['quantity'], 3) : 0.0;

            if ($qty <= 0) {
                $errors["{$key}.quantity"] = 'Enter how much is needed.';
            }

            $notes = trim((string) ($item['notes'] ?? ''));
            $lines[] = [
                'drug_id' => $drugId,
                'order_unit' => $unit,
                'units_per_package' => $unit === 'package' ? $per : null,
                'quantity' => max(0, $qty),
                'base_quantity' => round(max(0, $qty) * ($unit === 'package' ? $per : 1), 3),
                'notes' => $notes !== '' ? mb_substr($notes, 0, 255) : null
            ];
        }

        if ($submit && !$items) {
            $errors['items'] = 'Add the items needed.';
        }

        return [$header, $lines, $errors];
    }

    private function headUserId(int $departmentId): ?int
    {
        $stmt = Database::connection()->prepare(
            "SELECT e.user_id FROM departments d JOIN employees e ON e.id = d.head_of_department_id AND e.deleted_at IS NULL WHERE d.id = :id"
        );
        $stmt->execute(['id' => $departmentId]);
        $userId = $stmt->fetchColumn();

        return $userId ? (int) $userId : null;
    }

    private function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT r.*, (SELECT e.user_id FROM departments d JOIN employees e ON e.id = d.head_of_department_id AND e.deleted_at IS NULL
                          WHERE d.id = r.department_id) AS head_user_id
             FROM purchase_requisitions r WHERE r.id = :id AND r.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function updateRow(int $id, array $values): void
    {
        $sets = implode(', ', array_map(fn($c) => "{$c} = :{$c}", array_keys($values)));
        Database::connection()->prepare("UPDATE purchase_requisitions SET {$sets} WHERE id = :__id")->execute($values + ['__id' => $id]);
    }

    /** Refusal for a step whose record changed after it was read. */
    private function stale(array $record): array
    {
        return ['success' => false, 'message' => "Request {$record['pr_number']} " . RecordLock::STALE_MESSAGE, 'stale' => true];
    }

    /** Status change + its history entry, together. False (nothing saved) when $seen is stale. */
    private function transition(int $id, array $values, string $action, ?string $notes, int $userId, string $now, ?array $seen = null): bool
    {
        $db = Database::connection();
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            if ($seen !== null && RecordLock::changed('purchase_requisitions', $id, $seen, ['status', 'updated_at'])) {
                if ($ownsTransaction) {
                    $db->rollBack();
                }
                return false;
            }

            $this->updateRow($id, $values + ['updated_at' => $now, 'updated_by' => $userId]);
            $this->log($id, $action, $notes, $userId, $now);

            if ($ownsTransaction) {
                $db->commit();
            }

            return true;
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    private function log(int $id, string $action, ?string $notes, int $userId, string $now): void
    {
        Database::connection()->prepare(
            "INSERT INTO purchase_requisition_history (purchase_requisition_id, action, notes, user_id, created_at)
             VALUES (:id, :action, :notes, :user, :created)"
        )->execute([
            'id' => $id, 'action' => $action, 'notes' => $notes !== null && $notes !== '' ? mb_substr($notes, 0, 500) : null,
            'user' => $userId, 'created' => $now
        ]);
    }

    /** @param array $lines [['requested', 'ordered', 'received'], ...] */
    private function formatHeader(array $r, ?array $viewer, array $lines): array
    {
        $requested = array_sum(array_column($lines, 'requested'));
        $ordered = array_sum(array_map(fn($l) => min($l['ordered'], $l['requested']), $lines));
        $received = array_sum(array_map(fn($l) => min($l['received'], $l['requested']), $lines));
        $fullyOrdered = $lines && !array_filter($lines, fn($l) => $l['ordered'] + self::EPSILON < $l['requested']);
        $fullyReceived = $lines && !array_filter($lines, fn($l) => $l['received'] + self::EPSILON < $l['requested']);

        $progress = match (true) {
            !in_array($r['status'], ['approved', 'closed'], true) => null,
            $fullyReceived => 'received',
            $received > self::EPSILON => 'partially_received',
            $fullyOrdered => 'ordered',
            $ordered > self::EPSILON => 'partially_ordered',
            default => 'not_ordered'
        };

        $role = $viewer['role'] ?? null;
        $isOwner = $viewer && (int) $viewer['id'] === (int) $r['created_by'];

        return [
            'id' => (int) $r['id'],
            'pr_number' => $r['pr_number'],
            'department_id' => (int) $r['department_id'],
            'department_name' => $r['department_name'] ?? null,
            'warehouse_id' => $r['warehouse_id'] !== null ? (int) $r['warehouse_id'] : null,
            'warehouse_name' => $r['warehouse_name'] ?? null,
            'needed_by' => $r['needed_by'],
            'priority' => $r['priority'],
            'reason' => $r['reason'],
            'status' => $r['status'],
            'progress' => $progress,
            'percent_ordered' => $requested > 0 ? (int) floor($ordered / $requested * 100) : 0,
            'percent_received' => $requested > 0 ? (int) floor($received / $requested * 100) : 0,
            'item_count' => count($lines),
            'is_overdue' => $r['needed_by'] !== null && $r['needed_by'] < date('Y-m-d') && !in_array($progress, ['received'], true)
                && in_array($r['status'], ['submitted', 'approved'], true),
            'created_by' => (int) $r['created_by'],
            'created_by_name' => $r['created_by_name'] ?? null,
            'created_at' => $r['created_at'],
            'submitted_at' => $r['submitted_at'],
            'approved_at' => $r['approved_at'],
            'approval_notes' => $r['approval_notes'],
            'rejected_at' => $r['rejected_at'],
            'rejection_reason' => $r['rejection_reason'],
            'cancel_reason' => $r['cancel_reason'],
            'close_reason' => $r['close_reason'],
            'is_mine' => $isOwner,
            'can_edit' => in_array($r['status'], self::EDITABLE_STATUSES, true) && ($isOwner || $role === 'admin'),
            'can_approve' => $viewer !== null && $this->approvalBlocker($r, $viewer) === null,
            'approval_blocker' => $r['status'] === 'submitted' ? $this->approvalBlocker($r, $viewer) : null,
            'can_order' => $r['status'] === 'approved' && in_array($role, self::PURCHASER_ROLES, true) && !$fullyOrdered,
            'can_close' => $r['status'] === 'approved' && in_array($role, self::PURCHASER_ROLES, true) && $ordered > self::EPSILON && !$fullyOrdered,
            'can_cancel' => in_array($r['status'], ['draft', 'submitted', 'rejected', 'approved'], true) && $ordered <= self::EPSILON
                && ($isOwner || in_array($role, array_merge(['admin'], self::PURCHASER_ROLES), true))
        ];
    }

    private function fmt(float $value): string
    {
        return rtrim(rtrim(number_format($value, 3, '.', ','), '0'), '.');
    }

    private static function userNameSql(string $column): string
    {
        return "(SELECT COALESCE(NULLIF(TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))), ''), u.username)
                 FROM users u LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
                 WHERE u.id = {$column} LIMIT 1)";
    }

    private function isValidDate(string $value): bool
    {
        $date = \DateTime::createFromFormat('Y-m-d', $value);

        return $date !== false && $date->format('Y-m-d') === $value;
    }
}

/** A purchase order couldn't be created while converting; everything is rolled back. */
class RequisitionConvertException extends \RuntimeException
{
}
