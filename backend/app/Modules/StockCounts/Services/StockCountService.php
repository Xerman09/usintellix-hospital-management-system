<?php

namespace App\Modules\StockCounts\Services;

use App\Core\Database;
use App\Modules\BusinessSettings\Services\BusinessSettingService;
use App\Modules\PurchaseOrders\Services\PurchaseOrderService;
use PDO;
use Throwable;

/**
 * Stock counts (SC-YYYY-NNNNN): keep system stock equal to what is
 * actually on the shelf of one storage location.
 *
 *   counting --submit--> submitted --approve--> approved (stock corrected)
 *      ^                    |
 *      +------ reject ------+   (sent back for a recount)
 *   cancel: anything not approved yet
 *
 * When a count starts, every lot at the location (full count) or of the
 * chosen items (partial count) is put on the sheet with its quantity
 * frozen as system_quantity, plus the lot's unit cost. Staff enter what
 * they find; stock found that isn't on the sheet is added as a line.
 * Every line with a difference needs a reason.
 *
 * On approval each lot is corrected by (counted - frozen). If nothing
 * moved during the count the lot ends up exactly at the counted
 * quantity; anything dispensed or received in between is kept rather
 * than wiped out. Each correction is logged in drug_inventory_adjustments.
 *
 * Only one open count per location at a time. Storage locations' people
 * (PurchaseOrderService::CREATOR_ROLES) count; an administrator or the
 * accountant -- never the person who started or submitted it -- approves.
 */
class StockCountService
{
    public const STATUSES = ['counting', 'submitted', 'rejected', 'approved', 'cancelled'];

    public const OPEN_STATUSES = ['counting', 'rejected', 'submitted'];

    public const EDITABLE_STATUSES = ['counting', 'rejected'];

    public const COUNTER_ROLES = PurchaseOrderService::CREATOR_ROLES;

    public const APPROVER_ROLES = PurchaseOrderService::APPROVER_ROLES;

    /** reason => [label, allowed for a gain, allowed for a loss] */
    public const REASONS = [
        'counting_error' => ['Counting / recording error', true, true],
        'loss' => ['Loss / missing', false, true],
        'breakage' => ['Breakage / damage', false, true],
        'expired' => ['Expired / spoiled', false, true],
        'found' => ['Found stock', true, false],
        'other' => ['Other (explain in notes)', true, true]
    ];

    public const START_FIELDS = ['warehouse_id', 'count_type', 'drug_ids', 'notes'];

    public const COUNT_FIELDS = ['items', 'added', 'notes', 'submit'];

    private const MEDICINE_TYPES = ['Drug', 'Vaccine'];

    private const EPSILON = 0.0005;

    /* ---------------------------------------------------------------
     * Reading
     * ------------------------------------------------------------- */

    public function list(array $filters = [], ?array $viewer = null): array
    {
        $where = ['c.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['status']) && in_array($filters['status'], self::STATUSES, true)) {
            $where[] = 'c.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['warehouse_id'])) {
            $where[] = 'c.warehouse_id = :warehouse';
            $params['warehouse'] = (int) $filters['warehouse_id'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT c.*, w.name AS warehouse_name,
                    " . self::userNameSql('c.created_by') . " AS created_by_name,
                    s.line_count, s.counted_count, s.diff_count, s.est_gain, s.est_loss
             FROM stock_counts c
             JOIN warehouses w ON w.id = c.warehouse_id
             LEFT JOIN (
                SELECT stock_count_id, COUNT(*) AS line_count,
                       SUM(counted_quantity IS NOT NULL) AS counted_count,
                       SUM(counted_quantity IS NOT NULL AND ABS(counted_quantity - system_quantity) > 0.0005) AS diff_count,
                       SUM(CASE WHEN counted_quantity > system_quantity THEN (counted_quantity - system_quantity) * unit_cost ELSE 0 END) AS est_gain,
                       SUM(CASE WHEN counted_quantity < system_quantity THEN (system_quantity - counted_quantity) * unit_cost ELSE 0 END) AS est_loss
                FROM stock_count_items GROUP BY stock_count_id
             ) s ON s.stock_count_id = c.id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY c.id DESC
             LIMIT 2000"
        );
        $stmt->execute($params);

        return array_map(fn(array $r) => $this->formatHeader($r, $viewer), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function get(int $id, ?array $viewer = null): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT c.*, w.name AS warehouse_name, w.physical_location,
                    " . self::userNameSql('c.created_by') . " AS created_by_name,
                    " . self::userNameSql('c.submitted_by') . " AS submitted_by_name,
                    " . self::userNameSql('c.approved_by') . " AS approved_by_name,
                    " . self::userNameSql('c.rejected_by') . " AS rejected_by_name,
                    " . self::userNameSql('c.cancelled_by') . " AS cancelled_by_name,
                    " . self::userNameSql('w.custodian_user_id') . " AS custodian_name
             FROM stock_counts c
             JOIN warehouses w ON w.id = c.warehouse_id
             WHERE c.id = :id AND c.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $stmt = $db->prepare(
            "SELECT i.*, d.name AS drug_name, d.product_type, du.name AS unit_name,
                    l.quantity_on_hand AS current_quantity, l.deleted_at AS lot_deleted_at,
                    " . self::userNameSql('i.counted_by') . " AS counted_by_name
             FROM stock_count_items i
             JOIN drugs d ON d.id = i.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN drug_inventory_lots l ON l.id = i.lot_id
             WHERE i.stock_count_id = :id
             ORDER BY i.is_added, d.name, i.expires_date IS NULL, i.expires_date, i.lot_number, i.id"
        );
        $stmt->execute(['id' => $id]);
        $itemRows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $row['line_count'] = count($itemRows);
        $row['counted_count'] = count(array_filter($itemRows, fn($r) => $r['counted_quantity'] !== null));

        $approved = $row['status'] === 'approved';
        $items = [];
        $gain = 0.0;
        $loss = 0.0;
        $byReason = [];

        foreach ($itemRows as $r) {
            $system = (float) $r['system_quantity'];
            $counted = $r['counted_quantity'] !== null ? (float) $r['counted_quantity'] : null;
            $difference = $counted !== null ? round($counted - $system, 3) : null;
            $value = $difference !== null ? round($difference * (float) $r['unit_cost'], 2) : null;
            $current = $r['current_quantity'] !== null && $r['lot_deleted_at'] === null ? (float) $r['current_quantity'] : ($r['lot_id'] ? 0.0 : null);

            if ($value !== null && abs($difference) > self::EPSILON) {
                $value > 0 ? $gain += $value : $loss += -$value;
                $key = $r['reason'] ?: 'unexplained';
                $byReason[$key] ??= ['reason' => $key, 'label' => self::REASONS[$key][0] ?? 'No reason yet', 'lines' => 0, 'quantity' => 0.0, 'value' => 0.0];
                $byReason[$key]['lines']++;
                $byReason[$key]['quantity'] = round($byReason[$key]['quantity'] + $difference, 3);
                $byReason[$key]['value'] = round($byReason[$key]['value'] + $value, 2);
            }

            $items[] = [
                'id' => (int) $r['id'],
                'line_no' => (int) $r['line_no'],
                'lot_id' => $r['lot_id'] !== null ? (int) $r['lot_id'] : null,
                'drug_id' => (int) $r['drug_id'],
                'drug_name' => $r['drug_name'],
                'product_type' => $r['product_type'],
                'unit_name' => $r['unit_name'],
                'lot_number' => $r['lot_number'],
                'expires_date' => $r['expires_date'],
                'is_expired' => $r['expires_date'] !== null && $r['expires_date'] < date('Y-m-d'),
                'is_added' => (bool) $r['is_added'],
                'system_quantity' => $system,
                'counted_quantity' => $counted,
                'difference' => $difference,
                'unit_cost' => (float) $r['unit_cost'],
                'value' => $value,
                'reason' => $r['reason'],
                'reason_label' => $r['reason'] ? (self::REASONS[$r['reason']][0] ?? $r['reason']) : null,
                'notes' => $r['notes'],
                'counted_by_name' => $r['counted_by_name'],
                'counted_at' => $r['counted_at'],
                // Before approval: how much the lot has moved since the count started.
                'current_quantity' => $approved ? null : $current,
                'moved_since_start' => !$approved && $current !== null ? round($current - $system, 3) : null,
                'quantity_before' => $r['quantity_before'] !== null ? (float) $r['quantity_before'] : null,
                'quantity_after' => $r['quantity_after'] !== null ? (float) $r['quantity_after'] : null
            ];
        }

        $row['est_gain'] = $gain;
        $row['est_loss'] = $loss;
        $row['diff_count'] = count(array_filter($items, fn($i) => $i['difference'] !== null && abs($i['difference']) > self::EPSILON));
        $count = $this->formatHeader($row, $viewer);

        foreach (['submitted_by', 'approved_by', 'rejected_by', 'cancelled_by'] as $field) {
            $count["{$field}_name"] = $row["{$field}_name"];
        }

        $count['physical_location'] = $row['physical_location'];
        $count['custodian_name'] = $row['custodian_name'];
        $count['items'] = $items;
        $count['summary'] = [
            'gain_value' => $approved ? (float) $row['gain_value'] : round($gain, 2),
            'loss_value' => $approved ? (float) $row['loss_value'] : round($loss, 2),
            'net_value' => $approved ? round((float) $row['gain_value'] - (float) $row['loss_value'], 2) : round($gain - $loss, 2),
            'by_reason' => array_values($byReason)
        ];

        $stmt = $db->prepare(
            "SELECT h.id, h.action, h.notes, h.created_at, " . self::userNameSql('h.user_id') . " AS user_name
             FROM stock_count_history h WHERE h.stock_count_id = :id ORDER BY h.created_at, h.id"
        );
        $stmt->execute(['id' => $id]);
        $count['history'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $business = (new BusinessSettingService())->get();
        $count['business'] = ['name' => $business['name'] ?? null, 'address' => $business['address'] ?? null];

        return $count;
    }

    /** Locations (with any open count), items for partial counts / found stock, reasons. */
    public function options(?array $viewer = null): array
    {
        $db = Database::connection();

        $warehouses = $db->query(
            "SELECT w.id, w.name,
                    (SELECT COUNT(*) FROM drug_inventory_lots l JOIN drugs d ON d.id = l.drug_id AND d.deleted_at IS NULL
                      WHERE l.warehouse_id = w.id AND l.deleted_at IS NULL AND l.quantity_on_hand > 0) AS lot_count,
                    (SELECT c.id FROM stock_counts c WHERE c.warehouse_id = w.id AND c.deleted_at IS NULL
                      AND c.status IN ('counting', 'rejected', 'submitted') ORDER BY c.id DESC LIMIT 1) AS open_count_id,
                    (SELECT c.sc_number FROM stock_counts c WHERE c.warehouse_id = w.id AND c.deleted_at IS NULL
                      AND c.status IN ('counting', 'rejected', 'submitted') ORDER BY c.id DESC LIMIT 1) AS open_count_number,
                    (SELECT MAX(c.approved_at) FROM stock_counts c WHERE c.warehouse_id = w.id AND c.deleted_at IS NULL
                      AND c.status = 'approved' AND c.count_type = 'full') AS last_full_count
             FROM warehouses w WHERE w.deleted_at IS NULL AND w.is_active = 1 ORDER BY w.name"
        )->fetchAll(PDO::FETCH_ASSOC);

        $drugs = $db->query(
            "SELECT d.id, d.name, d.product_type, d.unit_cost, du.name AS unit_name
             FROM drugs d LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE d.deleted_at IS NULL AND d.allow_inventory = 1
             ORDER BY d.name"
        )->fetchAll(PDO::FETCH_ASSOC);

        $lots = $db->query(
            "SELECT l.warehouse_id, l.drug_id, COUNT(*) AS lots, SUM(l.quantity_on_hand) AS on_hand
             FROM drug_inventory_lots l JOIN drugs d ON d.id = l.drug_id AND d.deleted_at IS NULL
             WHERE l.deleted_at IS NULL AND l.quantity_on_hand > 0
             GROUP BY l.warehouse_id, l.drug_id"
        )->fetchAll(PDO::FETCH_ASSOC);

        $role = $viewer['role'] ?? null;

        return [
            'warehouses' => array_map(fn($w) => [
                'id' => (int) $w['id'],
                'name' => $w['name'],
                'lot_count' => (int) $w['lot_count'],
                'open_count_id' => $w['open_count_id'] !== null ? (int) $w['open_count_id'] : null,
                'open_count_number' => $w['open_count_number'],
                'last_full_count' => $w['last_full_count']
            ], $warehouses),
            'drugs' => array_map(fn($d) => [
                'id' => (int) $d['id'], 'name' => $d['name'], 'product_type' => $d['product_type'], 'unit_name' => $d['unit_name'],
                'unit_cost' => $d['unit_cost'] !== null ? (float) $d['unit_cost'] : 0.0
            ], $drugs),
            'stock' => array_map(fn($l) => [
                'warehouse_id' => (int) $l['warehouse_id'], 'drug_id' => (int) $l['drug_id'], 'lots' => (int) $l['lots'], 'on_hand' => (float) $l['on_hand']
            ], $lots),
            'reasons' => array_map(fn($key, $r) => ['value' => $key, 'label' => $r[0], 'gain' => $r[1], 'loss' => $r[2]], array_keys(self::REASONS), self::REASONS),
            'can_count' => in_array($role, self::COUNTER_ROLES, true),
            'can_approve' => in_array($role, self::APPROVER_ROLES, true)
        ];
    }

    /**
     * Difference report: every approved stock correction, with the value
     * gained or lost. Filters: date_from, date_to, warehouse_id, reason.
     */
    public function report(array $filters = []): array
    {
        $where = ['1 = 1'];
        $params = [];

        if (!empty($filters['date_from'])) {
            $where[] = 'a.adjusted_date >= :from';
            $params['from'] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $where[] = 'a.adjusted_date <= :to';
            $params['to'] = $filters['date_to'];
        }

        if (!empty($filters['warehouse_id'])) {
            $where[] = 'a.warehouse_id = :warehouse';
            $params['warehouse'] = (int) $filters['warehouse_id'];
        }

        if (!empty($filters['reason']) && isset(self::REASONS[$filters['reason']])) {
            $where[] = 'a.reason = :reason';
            $params['reason'] = $filters['reason'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT a.*, d.name AS drug_name, du.name AS unit_name, l.lot_number, l.expires_date, w.name AS warehouse_name,
                    c.sc_number, i.system_quantity, i.counted_quantity, " . self::userNameSql('a.created_by') . " AS approved_by_name
             FROM drug_inventory_adjustments a
             JOIN drugs d ON d.id = a.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             JOIN drug_inventory_lots l ON l.id = a.lot_id
             JOIN warehouses w ON w.id = a.warehouse_id
             LEFT JOIN stock_counts c ON c.id = a.stock_count_id
             LEFT JOIN stock_count_items i ON i.id = a.stock_count_item_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY a.adjusted_date DESC, a.id DESC
             LIMIT 2000"
        );
        $stmt->execute($params);

        $rows = [];
        $byReason = [];
        $byWarehouse = [];
        $gain = 0.0;
        $loss = 0.0;

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $value = (float) $r['value_change'];
            $value > 0 ? $gain += $value : $loss += -$value;

            $byReason[$r['reason']] ??= ['reason' => $r['reason'], 'label' => self::REASONS[$r['reason']][0] ?? $r['reason'], 'lines' => 0, 'gain' => 0.0, 'loss' => 0.0];
            $byReason[$r['reason']]['lines']++;
            $byReason[$r['reason']][$value > 0 ? 'gain' : 'loss'] = round($byReason[$r['reason']][$value > 0 ? 'gain' : 'loss'] + abs($value), 2);

            $byWarehouse[$r['warehouse_id']] ??= ['warehouse_id' => (int) $r['warehouse_id'], 'warehouse_name' => $r['warehouse_name'], 'lines' => 0, 'gain' => 0.0, 'loss' => 0.0];
            $byWarehouse[$r['warehouse_id']]['lines']++;
            $byWarehouse[$r['warehouse_id']][$value > 0 ? 'gain' : 'loss'] = round($byWarehouse[$r['warehouse_id']][$value > 0 ? 'gain' : 'loss'] + abs($value), 2);

            $rows[] = [
                'id' => (int) $r['id'],
                'adjusted_date' => $r['adjusted_date'],
                'stock_count_id' => $r['stock_count_id'] !== null ? (int) $r['stock_count_id'] : null,
                'sc_number' => $r['sc_number'],
                'warehouse_name' => $r['warehouse_name'],
                'drug_name' => $r['drug_name'],
                'unit_name' => $r['unit_name'],
                'lot_number' => $r['lot_number'],
                'expires_date' => $r['expires_date'],
                'system_quantity' => $r['system_quantity'] !== null ? (float) $r['system_quantity'] : null,
                'counted_quantity' => $r['counted_quantity'] !== null ? (float) $r['counted_quantity'] : null,
                'quantity_change' => (float) $r['quantity_change'],
                'quantity_before' => (float) $r['quantity_before'],
                'quantity_after' => (float) $r['quantity_after'],
                'unit_cost' => (float) $r['unit_cost'],
                'value_change' => $value,
                'reason' => $r['reason'],
                'reason_label' => self::REASONS[$r['reason']][0] ?? $r['reason'],
                'notes' => $r['notes'],
                'approved_by_name' => $r['approved_by_name']
            ];
        }

        $withNet = fn(array $groups) => array_values(array_map(fn($g) => $g + ['net' => round($g['gain'] - $g['loss'], 2)], $groups));

        return [
            'rows' => $rows,
            'by_reason' => $withNet($byReason),
            'by_warehouse' => $withNet($byWarehouse),
            'totals' => ['gain' => round($gain, 2), 'loss' => round($loss, 2), 'net' => round($gain - $loss, 2), 'lines' => count($rows)]
        ];
    }

    /* ---------------------------------------------------------------
     * Starting and counting
     * ------------------------------------------------------------- */

    /** Body: warehouse_id, count_type (full|partial), drug_ids (partial), notes */
    public function start(array $data, array $user): array
    {
        if (!in_array($user['role'] ?? null, self::COUNTER_ROLES, true)) {
            return ['success' => false, 'message' => 'Only storage location staff can start a stock count.'];
        }

        $db = Database::connection();
        $errors = [];
        $warehouseId = (int) ($data['warehouse_id'] ?? 0);
        $type = ($data['count_type'] ?? 'full') === 'partial' ? 'partial' : 'full';
        $drugIds = array_values(array_unique(array_filter(array_map('intval', (array) ($data['drug_ids'] ?? [])))));
        $notes = mb_substr(trim((string) ($data['notes'] ?? '')), 0, 1000);

        $stmt = $db->prepare("SELECT id, name FROM warehouses WHERE id = :id AND deleted_at IS NULL AND is_active = 1");
        $stmt->execute(['id' => $warehouseId]);
        $warehouse = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$warehouse) {
            $errors['warehouse_id'] = 'Choose the storage location to count.';
        } elseif ($open = $this->openCount($warehouseId)) {
            $errors['warehouse_id'] = "{$open['sc_number']} is still open for this location. Finish or cancel it first.";
        }

        if ($type === 'partial' && !$drugIds) {
            $errors['drug_ids'] = 'Choose the items to count.';
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $lotWhere = 'l.warehouse_id = :w AND l.deleted_at IS NULL AND d.deleted_at IS NULL AND d.allow_inventory = 1';
        $params = ['w' => $warehouseId];

        if ($type === 'partial') {
            // A partial count lists every lot of the chosen items here, even empty ones.
            $placeholders = [];
            foreach ($drugIds as $i => $drugId) {
                $placeholders[] = ":d{$i}";
                $params["d{$i}"] = $drugId;
            }
            $lotWhere .= ' AND l.drug_id IN (' . implode(', ', $placeholders) . ')';
        } else {
            $lotWhere .= ' AND l.quantity_on_hand > 0';
        }

        $stmt = $db->prepare(
            "SELECT l.id, l.drug_id, l.lot_number, l.expires_date, l.quantity_on_hand,
                    COALESCE((SELECT r.unit_cost FROM drug_inventory_receipts r
                               WHERE r.lot_id = l.id AND r.voided_at IS NULL AND r.unit_cost IS NOT NULL
                               ORDER BY r.received_date DESC, r.id DESC LIMIT 1), d.unit_cost, 0) AS unit_cost
             FROM drug_inventory_lots l
             JOIN drugs d ON d.id = l.drug_id
             WHERE {$lotWhere}
             ORDER BY d.name, l.expires_date IS NULL, l.expires_date, l.lot_number
             FOR UPDATE"
        );

        $now = date('Y-m-d H:i:s');
        $userId = (int) $user['id'];
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            $stmt->execute($params);
            $lots = $stmt->fetchAll(PDO::FETCH_ASSOC);

            if (!$lots && $type === 'full') {
                if ($ownsTransaction) {
                    $db->rollBack();
                }
                return ['success' => false, 'message' => 'Validation failed.', 'errors' => [
                    'warehouse_id' => "Nothing is in stock at {$warehouse['name']}. To record stock found there, start a partial count of those items."
                ]];
            }

            $db->prepare(
                "INSERT INTO stock_counts (warehouse_id, count_type, notes, status, created_at, created_by, updated_at, updated_by)
                 VALUES (:w, :type, :notes, 'counting', :now, :user, :now2, :user2)"
            )->execute(['w' => $warehouseId, 'type' => $type, 'notes' => $notes !== '' ? $notes : null,
                'now' => $now, 'user' => $userId, 'now2' => $now, 'user2' => $userId]);
            $id = (int) $db->lastInsertId();
            $scNumber = 'SC-' . date('Y') . '-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT);
            $this->updateRow($id, ['sc_number' => $scNumber]);

            $insert = $db->prepare(
                "INSERT INTO stock_count_items (stock_count_id, line_no, lot_id, drug_id, lot_number, expires_date, is_added, system_quantity, unit_cost, created_at)
                 VALUES (:count, :line, :lot, :drug, :lot_number, :expires, 0, :system, :cost, :now)"
            );

            foreach ($lots as $index => $lot) {
                $insert->execute([
                    'count' => $id, 'line' => $index + 1, 'lot' => $lot['id'], 'drug' => $lot['drug_id'],
                    'lot_number' => $lot['lot_number'], 'expires' => $lot['expires_date'],
                    'system' => round((float) $lot['quantity_on_hand'], 3), 'cost' => round((float) $lot['unit_cost'], 4), 'now' => $now
                ]);
            }

            $this->log($id, 'started', ($type === 'full' ? 'Full count' : 'Partial count') . ' · ' . count($lots) . ' lot' . (count($lots) === 1 ? '' : 's'), $userId, $now);

            if ($ownsTransaction) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }
            error_log('stock count start failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to start the count. Nothing was saved.'];
        }

        return [
            'success' => true,
            'message' => "{$scNumber} started for {$warehouse['name']}. The system quantities are frozen as of now.",
            'data' => ['id' => $id, 'sc_number' => $scNumber]
        ];
    }

    /**
     * Save what was counted. Body:
     *   items: [{id, counted_quantity ('' = not counted yet), reason, notes}]
     *   added: [{drug_id, lot_number, expires_date, counted_quantity, reason, notes}]  -- replaces earlier added lines
     *   notes, submit
     */
    public function saveCounts(int $id, array $data, array $user): array
    {
        $count = $this->find($id);

        if (!$count) {
            return ['success' => false, 'message' => 'Count not found.', 'not_found' => true];
        }

        if (!in_array($user['role'] ?? null, self::COUNTER_ROLES, true)) {
            return ['success' => false, 'message' => 'Only storage location staff can enter counts.'];
        }

        if (!in_array($count['status'], self::EDITABLE_STATUSES, true)) {
            return ['success' => false, 'message' => $count['status'] === 'submitted'
                ? 'This count is waiting for approval. It can be changed if the approver sends it back.'
                : 'This count can no longer be changed.'];
        }

        $db = Database::connection();
        $submit = !empty($data['submit']);
        $errors = [];

        $stmt = $db->prepare("SELECT * FROM stock_count_items WHERE stock_count_id = :id AND is_added = 0");
        $stmt->execute(['id' => $id]);
        $sheet = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $sheet[(int) $row['id']] = $row;
        }

        // Lines on the sheet
        $updates = [];
        foreach ((array) ($data['items'] ?? []) as $index => $input) {
            $itemId = (int) ($input['id'] ?? 0);

            if (!isset($sheet[$itemId])) {
                continue;
            }

            [$line, $lineErrors] = $this->normalizeLine($input, (float) $sheet[$itemId]['system_quantity'], false, $submit);
            foreach ($lineErrors as $field => $message) {
                $errors["items.{$itemId}.{$field}"] = $message;
            }
            $updates[$itemId] = $line;
        }

        if ($submit) {
            foreach ($sheet as $itemId => $row) {
                $counted = array_key_exists($itemId, $updates) ? $updates[$itemId]['counted_quantity'] : $row['counted_quantity'];
                if ($counted === null && !isset($errors["items.{$itemId}.counted_quantity"])) {
                    $errors["items.{$itemId}.counted_quantity"] = 'Enter the quantity counted (0 if none).';
                }
            }
        }

        // Stock found that wasn't on the sheet
        $added = [];
        $onSheet = [];
        foreach ($sheet as $row) {
            $onSheet[$row['drug_id'] . '|' . mb_strtolower($row['lot_number'])] = true;
        }

        foreach (array_values((array) ($data['added'] ?? [])) as $index => $input) {
            $key = "added.{$index}";
            $drugId = (int) ($input['drug_id'] ?? 0);
            $stmt = $db->prepare("SELECT id, name, product_type, unit_cost FROM drugs WHERE id = :id AND deleted_at IS NULL AND allow_inventory = 1");
            $stmt->execute(['id' => $drugId]);
            $drug = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$drug) {
                $errors["{$key}.drug_id"] = 'Choose the item found.';
                continue;
            }

            $isMedicine = in_array($drug['product_type'], self::MEDICINE_TYPES, true);
            $lotNumber = mb_substr(trim((string) ($input['lot_number'] ?? '')), 0, 100);
            if ($lotNumber === '') {
                if ($isMedicine) {
                    $errors["{$key}.lot_number"] = 'Enter the lot / batch number on the pack.';
                } else {
                    $lotNumber = 'N/A';
                }
            }

            $lotKey = $drugId . '|' . mb_strtolower($lotNumber);
            if ($lotNumber !== '' && isset($onSheet[$lotKey])) {
                $errors["{$key}.lot_number"] = 'This lot is already on the count sheet. Enter it there.';
            }
            $onSheet[$lotKey] = true;

            $existingLot = null;
            if ($lotNumber !== '') {
                $stmt = $db->prepare(
                    "SELECT id, quantity_on_hand, expires_date FROM drug_inventory_lots
                     WHERE drug_id = :d AND lot_number = :lot AND warehouse_id = :w AND deleted_at IS NULL ORDER BY id LIMIT 1"
                );
                $stmt->execute(['d' => $drugId, 'lot' => $lotNumber, 'w' => $count['warehouse_id']]);
                $existingLot = $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
            }

            $expires = trim((string) ($input['expires_date'] ?? '')) ?: null;
            if ($existingLot && $existingLot['expires_date'] !== null) {
                $expires = substr($existingLot['expires_date'], 0, 10);
            } elseif ($expires !== null && !$this->isValidDate($expires)) {
                $errors["{$key}.expires_date"] = 'Enter a valid expiry date.';
            } elseif ($expires === null && $isMedicine) {
                $errors["{$key}.expires_date"] = 'Enter the expiry date on the pack.';
            }

            $system = $existingLot ? round((float) $existingLot['quantity_on_hand'], 3) : 0.0;
            [$line, $lineErrors] = $this->normalizeLine($input, $system, true, true);
            foreach ($lineErrors as $field => $message) {
                $errors["{$key}.{$field}"] = $message;
            }

            $unitCost = (float) ($drug['unit_cost'] ?? 0);
            if ($existingLot) {
                $stmt = $db->prepare(
                    "SELECT unit_cost FROM drug_inventory_receipts WHERE lot_id = :lot AND voided_at IS NULL AND unit_cost IS NOT NULL
                     ORDER BY received_date DESC, id DESC LIMIT 1"
                );
                $stmt->execute(['lot' => $existingLot['id']]);
                $receiptCost = $stmt->fetchColumn();
                if ($receiptCost !== false) {
                    $unitCost = (float) $receiptCost;
                }
            }

            $added[] = $line + [
                'lot_id' => $existingLot ? (int) $existingLot['id'] : null,
                'drug_id' => $drugId,
                'lot_number' => $lotNumber,
                'expires_date' => $expires,
                'system_quantity' => $system,
                'unit_cost' => round($unitCost, 4)
            ];
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $now = date('Y-m-d H:i:s');
        $userId = (int) $user['id'];
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            $update = $db->prepare(
                "UPDATE stock_count_items SET counted_quantity = :counted, reason = :reason, notes = :notes,
                        counted_at = :at, counted_by = :by WHERE id = :id"
            );

            foreach ($updates as $itemId => $line) {
                $row = $sheet[$itemId];
                $changed = $line['counted_quantity'] === null
                    ? $row['counted_quantity'] !== null
                    : $row['counted_quantity'] === null || abs((float) $row['counted_quantity'] - $line['counted_quantity']) > self::EPSILON;

                $update->execute([
                    'counted' => $line['counted_quantity'],
                    'reason' => $line['reason'],
                    'notes' => $line['notes'],
                    'at' => $line['counted_quantity'] === null ? null : ($changed ? $now : $row['counted_at']),
                    'by' => $line['counted_quantity'] === null ? null : ($changed ? $userId : $row['counted_by']),
                    'id' => $itemId
                ]);
            }

            $db->prepare("DELETE FROM stock_count_items WHERE stock_count_id = :id AND is_added = 1")->execute(['id' => $id]);

            $insert = $db->prepare(
                "INSERT INTO stock_count_items (stock_count_id, line_no, lot_id, drug_id, lot_number, expires_date, is_added, system_quantity,
                        counted_quantity, unit_cost, reason, notes, counted_at, counted_by, created_at)
                 VALUES (:count, :line, :lot, :drug, :lot_number, :expires, 1, :system, :counted, :cost, :reason, :notes, :at, :by, :now)"
            );
            $nextLine = count($sheet);

            foreach ($added as $line) {
                $insert->execute([
                    'count' => $id, 'line' => ++$nextLine, 'lot' => $line['lot_id'], 'drug' => $line['drug_id'],
                    'lot_number' => $line['lot_number'], 'expires' => $line['expires_date'], 'system' => $line['system_quantity'],
                    'counted' => $line['counted_quantity'], 'cost' => $line['unit_cost'], 'reason' => $line['reason'], 'notes' => $line['notes'],
                    'at' => $now, 'by' => $userId, 'now' => $now
                ]);
            }

            $values = ['updated_at' => $now, 'updated_by' => $userId];
            if (array_key_exists('notes', $data)) {
                $notes = mb_substr(trim((string) $data['notes']), 0, 1000);
                $values['notes'] = $notes !== '' ? $notes : null;
            }

            if ($submit) {
                $values += ['status' => 'submitted', 'submitted_at' => $now, 'submitted_by' => $userId];
            }

            $this->updateRow($id, $values);

            if ($submit) {
                $this->log($id, $count['status'] === 'rejected' ? 'resubmitted' : 'submitted', null, $userId, $now);
            }

            if ($ownsTransaction) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }
            error_log('stock count save failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to save the count. Nothing was changed.'];
        }

        return [
            'success' => true,
            'message' => $submit ? "{$count['sc_number']} submitted for approval." : 'Counts saved.',
            'data' => ['id' => $id]
        ];
    }

    /* ---------------------------------------------------------------
     * Approval
     * ------------------------------------------------------------- */

    public function approvalBlocker(array $count, ?array $user): ?string
    {
        if (!$user || !in_array($user['role'] ?? null, self::APPROVER_ROLES, true)) {
            return 'An administrator or the accountant approves stock adjustments.';
        }

        if ($count['status'] !== 'submitted') {
            return 'This count is not waiting for approval.';
        }

        $userId = (int) ($user['id'] ?? 0);

        if ($userId === (int) $count['created_by'] || $userId === (int) $count['submitted_by']) {
            return 'You started or submitted this count, so someone else has to approve it.';
        }

        return null;
    }

    /**
     * Correct every lot by (counted - frozen system quantity) and log
     * each correction. Refused as a whole if any lot would go below zero.
     */
    public function approve(int $id, string $notes, array $user): array
    {
        $count = $this->find($id);

        if (!$count) {
            return ['success' => false, 'message' => 'Count not found.', 'not_found' => true];
        }

        if ($blocker = $this->approvalBlocker($count, $user)) {
            return ['success' => false, 'message' => $blocker];
        }

        $db = Database::connection();
        $notes = mb_substr(trim($notes), 0, 500);
        $now = date('Y-m-d H:i:s');
        $today = date('Y-m-d');
        $userId = (int) $user['id'];
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        } else {
            $db->exec('SAVEPOINT stock_count_approve');
        }

        $undo = function () use ($db, $ownsTransaction) {
            if ($ownsTransaction) {
                $db->rollBack();
            } else {
                $db->exec('ROLLBACK TO SAVEPOINT stock_count_approve');
            }
        };

        try {
            $stmt = $db->prepare(
                "SELECT i.*, d.name AS drug_name FROM stock_count_items i JOIN drugs d ON d.id = i.drug_id
                 WHERE i.stock_count_id = :id ORDER BY i.line_no, i.id"
            );
            $stmt->execute(['id' => $id]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $lock = $db->prepare("SELECT id, quantity_on_hand, deleted_at FROM drug_inventory_lots WHERE id = :id FOR UPDATE");
            $findLot = $db->prepare(
                "SELECT id, quantity_on_hand, deleted_at FROM drug_inventory_lots
                 WHERE drug_id = :d AND lot_number = :lot AND warehouse_id = :w AND deleted_at IS NULL ORDER BY id LIMIT 1 FOR UPDATE"
            );
            $setLot = $db->prepare(
                "UPDATE drug_inventory_lots SET quantity_on_hand = :qty, is_active = IF(:qty2 > 0, 1, is_active), updated_at = :now, updated_by = :user WHERE id = :id"
            );
            $newLot = $db->prepare(
                "INSERT INTO drug_inventory_lots (drug_id, lot_number, facility_id, warehouse_id, quantity_on_hand, expires_date, is_active, created_at, created_by)
                 VALUES (:d, :lot, NULL, :w, 0, :expires, 1, :now, :user)"
            );
            $setItem = $db->prepare("UPDATE stock_count_items SET lot_id = :lot, quantity_before = :before, quantity_after = :after WHERE id = :id");
            $logAdjustment = $db->prepare(
                "INSERT INTO drug_inventory_adjustments (drug_id, lot_id, warehouse_id, quantity_change, quantity_before, quantity_after, reason,
                        unit_cost, value_change, stock_count_id, stock_count_item_id, notes, adjusted_date, created_at, created_by)
                 VALUES (:d, :lot, :w, :change, :before, :after, :reason, :cost, :value, :count, :item, :notes, :date, :now, :user)"
            );

            $problems = [];
            $gain = 0.0;
            $loss = 0.0;
            $adjusted = 0;

            foreach ($items as $item) {
                if ($item['counted_quantity'] === null) {
                    $problems[] = "{$item['drug_name']} lot {$item['lot_number']} was not counted";
                    continue;
                }

                $difference = round((float) $item['counted_quantity'] - (float) $item['system_quantity'], 3);
                $lotId = $item['lot_id'] !== null ? (int) $item['lot_id'] : null;
                $current = 0.0;

                if ($lotId !== null) {
                    $lock->execute(['id' => $lotId]);
                    $lot = $lock->fetch(PDO::FETCH_ASSOC);
                    $current = $lot && $lot['deleted_at'] === null ? (float) $lot['quantity_on_hand'] : 0.0;

                    if (!$lot || $lot['deleted_at'] !== null) {
                        $problems[] = "{$item['drug_name']} lot {$item['lot_number']} was removed from inventory during the count";
                        continue;
                    }
                } elseif (abs($difference) > self::EPSILON) {
                    // Found stock of a lot not on file when it was counted (it may have been received since).
                    $findLot->execute(['d' => $item['drug_id'], 'lot' => $item['lot_number'], 'w' => $count['warehouse_id']]);
                    $lot = $findLot->fetch(PDO::FETCH_ASSOC);

                    if ($lot) {
                        $lotId = (int) $lot['id'];
                        $current = (float) $lot['quantity_on_hand'];
                    } else {
                        $newLot->execute(['d' => $item['drug_id'], 'lot' => $item['lot_number'], 'w' => $count['warehouse_id'],
                            'expires' => $item['expires_date'], 'now' => $now, 'user' => $userId]);
                        $lotId = (int) $db->lastInsertId();
                    }
                }

                $after = round($current + $difference, 3);

                if ($after < -self::EPSILON) {
                    $problems[] = "{$item['drug_name']} lot {$item['lot_number']}: only " . $this->fmt($current) . ' left now, cannot take off ' . $this->fmt(-$difference);
                    continue;
                }

                $after = max(0.0, $after);

                if (abs($difference) > self::EPSILON) {
                    $setLot->execute(['qty' => $after, 'qty2' => $after, 'now' => $now, 'user' => $userId, 'id' => $lotId]);
                    $value = round($difference * (float) $item['unit_cost'], 2);
                    $value > 0 ? $gain += $value : $loss += -$value;
                    $logAdjustment->execute([
                        'd' => $item['drug_id'], 'lot' => $lotId, 'w' => $count['warehouse_id'], 'change' => $difference,
                        'before' => $current, 'after' => $after, 'reason' => $item['reason'] ?: 'counting_error',
                        'cost' => $item['unit_cost'], 'value' => $value, 'count' => $id, 'item' => $item['id'],
                        'notes' => $item['notes'], 'date' => $today, 'now' => $now, 'user' => $userId
                    ]);
                    $adjusted++;
                }

                $setItem->execute(['lot' => $lotId, 'before' => $lotId !== null ? $current : null, 'after' => $lotId !== null ? $after : null, 'id' => $item['id']]);
            }

            if ($problems) {
                $undo();
                return ['success' => false, 'message' => 'The stock could not be corrected: ' . implode('; ', $problems)
                    . '. Send the count back for a recount.'];
            }

            $this->updateRow($id, [
                'status' => 'approved',
                'approved_at' => $now,
                'approved_by' => $userId,
                'approval_notes' => $notes !== '' ? $notes : null,
                'gain_value' => round($gain, 2),
                'loss_value' => round($loss, 2),
                'updated_at' => $now,
                'updated_by' => $userId
            ]);
            $this->log($id, 'approved', $notes, $userId, $now);

            if ($ownsTransaction) {
                $db->commit();
            } else {
                $db->exec('RELEASE SAVEPOINT stock_count_approve');
            }
        } catch (Throwable $e) {
            $undo();
            error_log('stock count approve failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to approve the count. Nothing was changed.'];
        }

        return [
            'success' => true,
            'message' => "{$count['sc_number']} approved. "
                . ($adjusted ? "{$adjusted} lot" . ($adjusted === 1 ? ' was' : 's were') . ' corrected.' : 'Everything matched; no stock was changed.')
        ];
    }

    /** Send it back for a recount. */
    public function reject(int $id, string $reason, array $user): array
    {
        $count = $this->find($id);

        if (!$count) {
            return ['success' => false, 'message' => 'Count not found.', 'not_found' => true];
        }

        if ($blocker = $this->approvalBlocker($count, $user)) {
            return ['success' => false, 'message' => $blocker];
        }

        $reason = mb_substr(trim($reason), 0, 255);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['reason' => 'Say what has to be recounted or explained.']];
        }

        $now = date('Y-m-d H:i:s');
        $this->transition($id, [
            'status' => 'rejected',
            'rejected_at' => $now,
            'rejected_by' => (int) $user['id'],
            'rejection_reason' => $reason
        ], 'rejected', $reason, (int) $user['id'], $now);

        return ['success' => true, 'message' => "{$count['sc_number']} sent back for a recount."];
    }

    public function cancel(int $id, string $reason, array $user): array
    {
        $count = $this->find($id);

        if (!$count) {
            return ['success' => false, 'message' => 'Count not found.', 'not_found' => true];
        }

        if (!in_array($count['status'], self::OPEN_STATUSES, true)) {
            return ['success' => false, 'message' => 'Only a count that is not approved yet can be cancelled.'];
        }

        if (!in_array($user['role'] ?? null, array_merge(self::COUNTER_ROLES, self::APPROVER_ROLES), true)) {
            return ['success' => false, 'message' => 'You cannot cancel stock counts.'];
        }

        $reason = mb_substr(trim($reason), 0, 255);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['reason' => 'Say why it is cancelled.']];
        }

        $now = date('Y-m-d H:i:s');
        $this->transition($id, [
            'status' => 'cancelled',
            'cancelled_at' => $now,
            'cancelled_by' => (int) $user['id'],
            'cancel_reason' => $reason
        ], 'cancelled', $reason, (int) $user['id'], $now);

        return ['success' => true, 'message' => "{$count['sc_number']} cancelled. No stock was changed."];
    }

    /* ---------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------- */

    /**
     * One counted line: [values, errors]. $requireCount: the line must
     * have a count (submitting, or stock found). A difference needs a
     * reason that fits its direction; "other" needs a note.
     */
    private function normalizeLine(array $input, float $system, bool $isAdded, bool $requireCount): array
    {
        $errors = [];
        $raw = $input['counted_quantity'] ?? '';
        $counted = null;

        if ($raw !== '' && $raw !== null) {
            if (!is_numeric($raw) || (float) $raw < 0) {
                $errors['counted_quantity'] = 'Enter 0 or more.';
            } else {
                $counted = round((float) $raw, 3);
            }
        } elseif ($isAdded) {
            $errors['counted_quantity'] = 'Enter how much was found.';
        }

        // Found stock of a lot with nothing on file: there must be some.
        if ($isAdded && $counted !== null && $system <= self::EPSILON && $counted <= self::EPSILON) {
            $errors['counted_quantity'] = 'Enter how much was found.';
        }

        $reason = trim((string) ($input['reason'] ?? ''));
        $notes = mb_substr(trim((string) ($input['notes'] ?? '')), 0, 255);
        $difference = $counted !== null ? $counted - $system : 0.0;

        if ($counted === null || abs($difference) <= self::EPSILON) {
            $reason = '';
        } elseif ($reason === '' || !isset(self::REASONS[$reason])) {
            if ($requireCount) {
                $errors['reason'] = 'Give a reason for the difference.';
            }
            $reason = '';
        } elseif ($difference > 0 && !self::REASONS[$reason][1]) {
            $errors['reason'] = 'More was counted than on file — choose a reason for a gain.';
        } elseif ($difference < 0 && !self::REASONS[$reason][2]) {
            $errors['reason'] = 'Less was counted than on file — choose a reason for a loss.';
        } elseif ($reason === 'other' && $notes === '' && $requireCount) {
            $errors['notes'] = 'Explain the difference.';
        }

        return [[
            'counted_quantity' => $counted,
            'reason' => $reason !== '' ? $reason : null,
            'notes' => $notes !== '' ? $notes : null
        ], $errors];
    }

    private function openCount(int $warehouseId): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, sc_number FROM stock_counts
             WHERE warehouse_id = :w AND deleted_at IS NULL AND status IN ('counting', 'rejected', 'submitted') LIMIT 1"
        );
        $stmt->execute(['w' => $warehouseId]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare("SELECT * FROM stock_counts WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function updateRow(int $id, array $values): void
    {
        $sets = implode(', ', array_map(fn($c) => "{$c} = :{$c}", array_keys($values)));
        Database::connection()->prepare("UPDATE stock_counts SET {$sets} WHERE id = :__id")->execute($values + ['__id' => $id]);
    }

    private function transition(int $id, array $values, string $action, ?string $notes, int $userId, string $now): void
    {
        $db = Database::connection();
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            $this->updateRow($id, $values + ['updated_at' => $now, 'updated_by' => $userId]);
            $this->log($id, $action, $notes, $userId, $now);

            if ($ownsTransaction) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }
            throw $e;
        }
    }

    private function log(int $countId, string $action, ?string $notes, int $userId, string $now): void
    {
        Database::connection()->prepare(
            "INSERT INTO stock_count_history (stock_count_id, action, notes, user_id, created_at)
             VALUES (:id, :action, :notes, :user, :created)"
        )->execute([
            'id' => $countId,
            'action' => $action,
            'notes' => $notes !== null && $notes !== '' ? mb_substr($notes, 0, 500) : null,
            'user' => $userId,
            'created' => $now
        ]);
    }

    private function formatHeader(array $r, ?array $viewer): array
    {
        $role = $viewer['role'] ?? null;
        $open = in_array($r['status'], self::OPEN_STATUSES, true);
        $lineCount = (int) ($r['line_count'] ?? 0);
        $countedCount = (int) ($r['counted_count'] ?? 0);

        return [
            'id' => (int) $r['id'],
            'sc_number' => $r['sc_number'],
            'warehouse_id' => (int) $r['warehouse_id'],
            'warehouse_name' => $r['warehouse_name'],
            'count_type' => $r['count_type'],
            'status' => $r['status'],
            'notes' => $r['notes'],
            'line_count' => $lineCount,
            'counted_count' => $countedCount,
            'diff_count' => (int) ($r['diff_count'] ?? 0),
            'gain_value' => $r['status'] === 'approved' ? (float) $r['gain_value'] : round((float) ($r['est_gain'] ?? 0), 2),
            'loss_value' => $r['status'] === 'approved' ? (float) $r['loss_value'] : round((float) ($r['est_loss'] ?? 0), 2),
            'started_at' => $r['created_at'],
            'submitted_at' => $r['submitted_at'],
            'approved_at' => $r['approved_at'],
            'approval_notes' => $r['approval_notes'],
            'rejected_at' => $r['rejected_at'],
            'rejection_reason' => $r['rejection_reason'],
            'cancelled_at' => $r['cancelled_at'],
            'cancel_reason' => $r['cancel_reason'],
            'created_by_name' => $r['created_by_name'] ?? null,
            'can_count' => in_array($r['status'], self::EDITABLE_STATUSES, true) && in_array($role, self::COUNTER_ROLES, true),
            'can_approve' => $viewer !== null && $this->approvalBlocker($r, $viewer) === null,
            'approval_blocker' => $r['status'] === 'submitted' ? $this->approvalBlocker($r, $viewer) : null,
            'can_cancel' => $open && in_array($role, array_merge(self::COUNTER_ROLES, self::APPROVER_ROLES), true)
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
