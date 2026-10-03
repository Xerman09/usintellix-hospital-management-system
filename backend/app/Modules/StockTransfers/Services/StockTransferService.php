<?php

namespace App\Modules\StockTransfers\Services;

use App\Core\Database;
use App\Modules\DrugInventory\Services\StockLedgerService;
use App\Modules\BusinessSettings\Services\BusinessSettingService;
use App\Modules\Procurement\Services\RecordLock;
use App\Modules\PurchaseOrders\Services\PurchaseOrderService;
use PDO;
use Throwable;

/**
 * Stock transfers (ST-YYYY-NNNNN): moving stock from one storage
 * location to another.
 *
 *   draft --request--> requested --send--> in_transit --receive--> received
 *     \______________________send_____________^
 *   cancel: anything not received yet (an in-transit transfer puts its
 *   stock back into the lots it left); a draft is deleted instead.
 *
 * Either side can start one: the receiving location asks for items
 * (request), or the sending location just sends them. Quantities are in
 * each item's dispensing unit.
 *
 * Sending takes the stock out of the source location, lot by lot: the
 * lot chosen on the line, else earliest expiry first (expired lots are
 * skipped unless chosen by hand). Each lot that left is a
 * stock_transfer_lots row. While in transit the stock is in neither
 * location.
 *
 * Receiving confirms what arrived of each lot. It goes into the same lot
 * number at the destination (created if it isn't there yet) and is
 * logged in drug_inventory_transfers, so the inventory reports show it.
 * Anything that didn't arrive is recorded short on the transfer with a
 * reason, at the lot's cost.
 *
 * The storage locations' people (PurchaseOrderService::CREATOR_ROLES)
 * do all of it; accountants can look. Who should send / receive is
 * each location's custodian -- shown as a hint on screen only.
 */
class StockTransferService
{
    public const STATUSES = ['draft', 'requested', 'in_transit', 'received', 'cancelled'];

    public const EDITABLE_STATUSES = ['draft', 'requested'];

    public const STAFF_ROLES = PurchaseOrderService::CREATOR_ROLES;

    public const VIEW_ROLES = ['admin', 'receptionist', 'doctor', 'accountant'];

    public const PRIORITIES = ['normal', 'urgent'];

    /** Why something sent didn't arrive. reason => label */
    public const SHORT_REASONS = [
        'loss' => 'Lost / missing in transit',
        'breakage' => 'Broken / damaged in transit',
        'expired' => 'Expired / spoiled',
        'counting_error' => 'Sent less than recorded',
        'other' => 'Other (explain)'
    ];

    public const INPUT_FIELDS = ['from_warehouse_id', 'to_warehouse_id', 'priority', 'needed_by', 'notes', 'items', 'action'];

    private const EPSILON = 0.0005;

    /* ---------------------------------------------------------------
     * Reading
     * ------------------------------------------------------------- */

    /** Filters: status?, warehouse_id? (either side) */
    public function list(array $filters = [], ?array $viewer = null): array
    {
        $where = ['t.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['status']) && in_array($filters['status'], self::STATUSES, true)) {
            $where[] = 't.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['warehouse_id'])) {
            $where[] = '(t.from_warehouse_id = :w1 OR t.to_warehouse_id = :w2)';
            $params['w1'] = (int) $filters['warehouse_id'];
            $params['w2'] = (int) $filters['warehouse_id'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT t.*, fw.name AS from_name, tw.name AS to_name,
                    " . self::userNameSql('t.created_by') . " AS created_by_name,
                    (SELECT COUNT(*) FROM stock_transfer_items i WHERE i.stock_transfer_id = t.id) AS item_count,
                    (SELECT GROUP_CONCAT(d.name ORDER BY i.line_no SEPARATOR ', ') FROM stock_transfer_items i
                       JOIN drugs d ON d.id = i.drug_id WHERE i.stock_transfer_id = t.id) AS item_names
             FROM stock_transfers t
             JOIN warehouses fw ON fw.id = t.from_warehouse_id
             JOIN warehouses tw ON tw.id = t.to_warehouse_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY t.id DESC
             LIMIT 2000"
        );
        $stmt->execute($params);

        return array_map(fn(array $r) => $this->formatHeader($r, $viewer), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function get(int $id, ?array $viewer = null): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT t.*, fw.name AS from_name, tw.name AS to_name,
                    fw.physical_location AS from_place, tw.physical_location AS to_place,
                    fw.custodian_user_id AS from_custodian_id, fw.alternate_custodian_user_id AS from_alternate_id,
                    tw.custodian_user_id AS to_custodian_id, tw.alternate_custodian_user_id AS to_alternate_id,
                    " . self::userNameSql('fw.custodian_user_id') . " AS from_custodian_name,
                    " . self::userNameSql('fw.alternate_custodian_user_id') . " AS from_alternate_name,
                    " . self::userNameSql('tw.custodian_user_id') . " AS to_custodian_name,
                    " . self::userNameSql('tw.alternate_custodian_user_id') . " AS to_alternate_name,
                    " . self::userNameSql('t.created_by') . " AS created_by_name,
                    " . self::userNameSql('t.requested_by') . " AS requested_by_name,
                    " . self::userNameSql('t.sent_by') . " AS sent_by_name,
                    " . self::userNameSql('t.received_by') . " AS received_by_name,
                    " . self::userNameSql('t.cancelled_by') . " AS cancelled_by_name,
                    (SELECT COUNT(*) FROM stock_transfer_items i WHERE i.stock_transfer_id = t.id) AS item_count
             FROM stock_transfers t
             JOIN warehouses fw ON fw.id = t.from_warehouse_id
             JOIN warehouses tw ON tw.id = t.to_warehouse_id
             WHERE t.id = :id AND t.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $transfer = $this->formatHeader($row, $viewer);

        foreach (['requested_by', 'sent_by', 'received_by', 'cancelled_by'] as $field) {
            $transfer["{$field}_name"] = $row["{$field}_name"];
        }

        foreach (['from' => 'from', 'to' => 'to'] as $side) {
            $transfer["{$side}_location"] = [
                'id' => (int) $row["{$side}_warehouse_id"],
                'name' => $row["{$side}_name"],
                'physical_location' => $row["{$side}_place"],
                'custodian_user_id' => $row["{$side}_custodian_id"] !== null ? (int) $row["{$side}_custodian_id"] : null,
                'custodian_name' => $row["{$side}_custodian_name"],
                'alternate_custodian_user_id' => $row["{$side}_alternate_id"] !== null ? (int) $row["{$side}_alternate_id"] : null,
                'alternate_custodian_name' => $row["{$side}_alternate_name"]
            ];
        }

        // Lines, with what's at the source now (before it's sent).
        $stmt = $db->prepare(
            "SELECT i.*, d.name AS drug_name, d.product_type, du.name AS unit_name,
                    l.lot_number AS chosen_lot_number, l.expires_date AS chosen_expires, l.quantity_on_hand AS chosen_on_hand,
                    COALESCE((SELECT SUM(x.quantity_on_hand) FROM drug_inventory_lots x
                              WHERE x.drug_id = i.drug_id AND x.warehouse_id = :w AND x.deleted_at IS NULL AND x.is_active = 1
                                AND (x.expires_date IS NULL OR x.expires_date >= CURDATE())), 0) AS available
             FROM stock_transfer_items i
             JOIN drugs d ON d.id = i.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN drug_inventory_lots l ON l.id = i.lot_id
             WHERE i.stock_transfer_id = :id
             ORDER BY i.line_no, i.id"
        );
        $stmt->execute(['id' => $id, 'w' => $row['from_warehouse_id']]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $db->prepare("SELECT * FROM stock_transfer_lots WHERE stock_transfer_id = :id ORDER BY id");
        $stmt->execute(['id' => $id]);
        $lotsByItem = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $lot) {
            $sent = (float) $lot['quantity_sent'];
            $received = $lot['quantity_received'] !== null ? (float) $lot['quantity_received'] : null;
            $short = $received !== null ? round($sent - $received, 3) : null;
            $lotsByItem[(int) $lot['stock_transfer_item_id']][] = [
                'id' => (int) $lot['id'],
                'from_lot_id' => (int) $lot['from_lot_id'],
                'lot_number' => $lot['lot_number'],
                'expires_date' => $lot['expires_date'],
                'quantity_sent' => $sent,
                'quantity_received' => $received,
                'quantity_short' => $short,
                'short_reason' => $lot['short_reason'],
                'short_reason_label' => $lot['short_reason'] ? (self::SHORT_REASONS[$lot['short_reason']] ?? $lot['short_reason']) : null,
                'short_notes' => $lot['short_notes'],
                'unit_cost' => (float) $lot['unit_cost'],
                'value_sent' => round($sent * (float) $lot['unit_cost'], 2),
                'value_short' => $short !== null ? round($short * (float) $lot['unit_cost'], 2) : null
            ];
        }

        $transfer['items'] = array_map(function (array $r) use ($lotsByItem) {
            $lots = $lotsByItem[(int) $r['id']] ?? [];
            $sent = array_sum(array_column($lots, 'quantity_sent'));
            $received = $lots && !in_array(null, array_column($lots, 'quantity_received'), true) ? array_sum(array_column($lots, 'quantity_received')) : null;

            return [
                'id' => (int) $r['id'],
                'line_no' => (int) $r['line_no'],
                'drug_id' => (int) $r['drug_id'],
                'drug_name' => $r['drug_name'],
                'product_type' => $r['product_type'],
                'unit_name' => $r['unit_name'],
                'quantity' => (float) $r['quantity'],
                'lot_id' => $r['lot_id'] !== null ? (int) $r['lot_id'] : null,
                'lot_number' => $r['chosen_lot_number'],
                'lot_expires' => $r['chosen_expires'],
                'lot_on_hand' => $r['chosen_on_hand'] !== null ? (float) $r['chosen_on_hand'] : null,
                'available' => (float) $r['available'],
                'notes' => $r['notes'],
                'quantity_sent' => $lots ? round($sent, 3) : null,
                'quantity_received' => $received !== null ? round($received, 3) : null,
                'lots' => $lots
            ];
        }, $items);

        $stmt = $db->prepare(
            "SELECT h.id, h.action, h.notes, h.created_at, " . self::userNameSql('h.user_id') . " AS user_name
             FROM stock_transfer_history h WHERE h.stock_transfer_id = :id ORDER BY h.created_at, h.id"
        );
        $stmt->execute(['id' => $id]);
        $transfer['history'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $business = (new BusinessSettingService())->get();
        $transfer['business'] = ['name' => $business['name'] ?? null, 'address' => $business['address'] ?? null];

        return $transfer;
    }

    /** Locations (with custodians), stock-tracked items, and every lot with stock (for picking lots). */
    public function options(?array $viewer = null): array
    {
        $db = Database::connection();

        $warehouses = $db->query(
            "SELECT w.id, w.name, w.physical_location, w.custodian_user_id, w.alternate_custodian_user_id,
                    " . self::userNameSql('w.custodian_user_id') . " AS custodian_name,
                    " . self::userNameSql('w.alternate_custodian_user_id') . " AS alternate_custodian_name
             FROM warehouses w WHERE w.deleted_at IS NULL AND w.is_active = 1 ORDER BY w.name"
        )->fetchAll(PDO::FETCH_ASSOC);

        $drugs = $db->query(
            "SELECT d.id, d.name, d.product_type, du.name AS unit_name
             FROM drugs d LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             WHERE d.deleted_at IS NULL AND d.is_active = 1 AND d.allow_inventory = 1
             ORDER BY d.name"
        )->fetchAll(PDO::FETCH_ASSOC);

        $lots = $db->query(
            "SELECT l.id, l.drug_id, l.warehouse_id, l.lot_number, l.expires_date, l.quantity_on_hand
             FROM drug_inventory_lots l JOIN drugs d ON d.id = l.drug_id AND d.deleted_at IS NULL
             WHERE l.deleted_at IS NULL AND l.is_active = 1 AND l.quantity_on_hand > 0
             ORDER BY l.expires_date IS NULL, l.expires_date, l.lot_number"
        )->fetchAll(PDO::FETCH_ASSOC);

        $today = date('Y-m-d');
        $role = $viewer['role'] ?? null;

        return [
            'warehouses' => array_map(fn($w) => [
                'id' => (int) $w['id'],
                'name' => $w['name'],
                'physical_location' => $w['physical_location'],
                'custodian_user_id' => $w['custodian_user_id'] !== null ? (int) $w['custodian_user_id'] : null,
                'custodian_name' => $w['custodian_name'],
                'alternate_custodian_user_id' => $w['alternate_custodian_user_id'] !== null ? (int) $w['alternate_custodian_user_id'] : null,
                'alternate_custodian_name' => $w['alternate_custodian_name']
            ], $warehouses),
            'drugs' => array_map(fn($d) => [
                'id' => (int) $d['id'], 'name' => $d['name'], 'product_type' => $d['product_type'], 'unit_name' => $d['unit_name']
            ], $drugs),
            'lots' => array_map(fn($l) => [
                'id' => (int) $l['id'],
                'drug_id' => (int) $l['drug_id'],
                'warehouse_id' => (int) $l['warehouse_id'],
                'lot_number' => $l['lot_number'],
                'expires_date' => $l['expires_date'],
                'is_expired' => $l['expires_date'] !== null && $l['expires_date'] < $today,
                'on_hand' => (float) $l['quantity_on_hand']
            ], $lots),
            'short_reasons' => array_map(fn($k, $v) => ['value' => $k, 'label' => $v], array_keys(self::SHORT_REASONS), self::SHORT_REASONS),
            'can_create' => in_array($role, self::STAFF_ROLES, true)
        ];
    }

    /* ---------------------------------------------------------------
     * Saving
     * ------------------------------------------------------------- */

    /** action: draft (default) | request | send. Body also: sent_date?, sent_via? when sending. */
    public function create(array $data, array $user): array
    {
        return $this->save(null, $data, $user);
    }

    public function update(int $id, array $data, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Transfer not found.', 'not_found' => true];
        }

        if (!in_array($existing['status'], self::EDITABLE_STATUSES, true)) {
            return ['success' => false, 'message' => 'Only draft or requested transfers can be changed.'];
        }

        return $this->save($existing, $data, $user);
    }

    private function save(?array $existing, array $data, array $user): array
    {
        if (!in_array($user['role'] ?? null, self::STAFF_ROLES, true)) {
            return ['success' => false, 'message' => 'Only storage location staff can make transfers.'];
        }

        $action = (string) ($data['action'] ?? 'draft');
        $action = in_array($action, ['draft', 'request', 'send'], true) ? $action : 'draft';
        [$header, $lines, $errors] = $this->normalize($data);

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $db = Database::connection();
        $now = date('Y-m-d H:i:s');
        $userId = (int) $user['id'];
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            if ($existing && RecordLock::changed('stock_transfers', (int) $existing['id'], $existing)) {
                if ($ownsTransaction) {
                    $db->rollBack();
                }
                return $this->stale($existing);
            }

            $values = $header + ['updated_at' => $now, 'updated_by' => $userId];

            if ($action === 'request' && (!$existing || $existing['status'] === 'draft')) {
                $values += ['status' => 'requested', 'requested_at' => $now, 'requested_by' => $userId];
            }

            if ($existing) {
                $id = (int) $existing['id'];
                $this->updateRow($id, $values);
                $db->prepare("DELETE FROM stock_transfer_items WHERE stock_transfer_id = :id")->execute(['id' => $id]);
                $number = $existing['st_number'];
            } else {
                $values += ['status' => 'draft', 'created_at' => $now, 'created_by' => $userId];
                $columns = array_keys($values);
                $db->prepare("INSERT INTO stock_transfers (" . implode(', ', $columns) . ") VALUES (:" . implode(', :', $columns) . ")")
                    ->execute($values);
                $id = (int) $db->lastInsertId();
                $number = 'ST-' . date('Y') . '-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT);
                $this->updateRow($id, ['st_number' => $number]);
                $this->log($id, 'created', null, $userId, $now);
            }

            $insert = $db->prepare(
                "INSERT INTO stock_transfer_items (stock_transfer_id, line_no, drug_id, lot_id, quantity, notes, created_at)
                 VALUES (:transfer, :line_no, :drug, :lot, :qty, :notes, :now)"
            );
            foreach ($lines as $i => $line) {
                $insert->execute([
                    'transfer' => $id, 'line_no' => $i + 1, 'drug' => $line['drug_id'], 'lot' => $line['lot_id'],
                    'qty' => $line['quantity'], 'notes' => $line['notes'], 'now' => $now
                ]);
            }

            if (isset($values['status']) && $values['status'] === 'requested') {
                $this->log($id, 'requested', null, $userId, $now);
            }

            if ($action === 'send') {
                $sent = $this->dispatch($id, $data, $userId, $now);

                if (!$sent['success']) {
                    if ($ownsTransaction) {
                        $db->rollBack();
                    }
                    return $sent;
                }
            }

            if ($ownsTransaction) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }
            error_log('stock transfer save failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to save the transfer.'];
        }

        $message = [
            'draft' => "Transfer {$number} saved as a draft.",
            'request' => "Transfer {$number} requested. The sending location can now send it.",
            'send' => "Transfer {$number} sent. The stock left the source location and is in transit until it is received."
        ][$action];

        return ['success' => true, 'message' => $message, 'data' => ['id' => $id, 'st_number' => $number]];
    }

    /* ---------------------------------------------------------------
     * Workflow
     * ------------------------------------------------------------- */

    /** A saved draft or request goes out. Body: sent_date?, sent_via? */
    public function send(int $id, array $data, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Transfer not found.', 'not_found' => true];
        }

        if (!in_array($user['role'] ?? null, self::STAFF_ROLES, true)) {
            return ['success' => false, 'message' => 'Only storage location staff can send transfers.'];
        }

        if (!in_array($existing['status'], self::EDITABLE_STATUSES, true)) {
            return ['success' => false, 'message' => "Transfer {$existing['st_number']} has already been " . ($existing['status'] === 'cancelled' ? 'cancelled.' : 'sent.')];
        }

        $db = Database::connection();
        $now = date('Y-m-d H:i:s');
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            if (RecordLock::changed('stock_transfers', $id, $existing)) {
                if ($ownsTransaction) {
                    $db->rollBack();
                }
                return $this->stale($existing);
            }

            $result = $this->dispatch($id, $data, (int) $user['id'], $now);

            if (!$result['success']) {
                if ($ownsTransaction) {
                    $db->rollBack();
                }
                return $result;
            }

            if ($ownsTransaction) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }
            error_log('stock transfer send failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to send the transfer. Nothing was changed.'];
        }

        return ['success' => true, 'message' => "Transfer {$existing['st_number']} sent. The stock left the source location and is in transit until it is received."];
    }

    /**
     * Takes the stock out of the source lots (inside the caller's
     * transaction) and marks the transfer in transit.
     */
    private function dispatch(int $id, array $data, int $userId, string $now): array
    {
        $db = Database::connection();
        $transfer = $this->find($id);
        $sentDate = trim((string) ($data['sent_date'] ?? '')) ?: date('Y-m-d');
        $sentVia = mb_substr(trim((string) ($data['sent_via'] ?? '')), 0, 150);

        if (!$this->isValidDate($sentDate) || $sentDate > date('Y-m-d')) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['sent_date' => 'Enter the date it was sent (not in the future).']];
        }

        $source = $this->warehouse((int) $transfer['from_warehouse_id']);
        $destination = $this->warehouse((int) $transfer['to_warehouse_id']);

        if (!$source || !$destination) {
            return ['success' => false, 'message' => 'One of the storage locations is no longer active.'];
        }

        $stmt = $db->prepare(
            "SELECT i.*, d.name AS drug_name FROM stock_transfer_items i JOIN drugs d ON d.id = i.drug_id
             WHERE i.stock_transfer_id = :id ORDER BY i.line_no, i.id"
        );
        $stmt->execute(['id' => $id]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$items) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['items' => 'Add the items to send.']];
        }

        // Lock every lot of these items at the source, earliest expiry first.
        $drugIds = array_values(array_unique(array_map(fn($i) => (int) $i['drug_id'], $items)));
        $placeholders = implode(', ', array_fill(0, count($drugIds), '?'));
        $stmt = $db->prepare(
            "SELECT id, drug_id, lot_number, expires_date, quantity_on_hand, is_active
             FROM drug_inventory_lots
             WHERE warehouse_id = ? AND deleted_at IS NULL AND drug_id IN ({$placeholders})
             ORDER BY expires_date IS NULL, expires_date, id
             FOR UPDATE"
        );
        $stmt->execute(array_merge([(int) $transfer['from_warehouse_id']], $drugIds));
        $lots = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $lot) {
            $lot['left'] = (float) $lot['quantity_on_hand'];
            $lots[(int) $lot['id']] = $lot;
        }

        $today = date('Y-m-d');
        $plan = [];     // [item id, lot id, quantity]
        $errors = [];

        // Lines with a chosen lot first, so automatic picks don't take their stock.
        usort($items, fn($a, $b) => [$a['lot_id'] === null, (int) $a['line_no']] <=> [$b['lot_id'] === null, (int) $b['line_no']]);

        foreach ($items as $item) {
            $need = (float) $item['quantity'];
            $key = 'items.' . ((int) $item['line_no'] - 1) . '.quantity';

            if ($item['lot_id'] !== null) {
                $lot = $lots[(int) $item['lot_id']] ?? null;

                if (!$lot) {
                    $errors[$key] = "{$item['drug_name']}: the chosen lot is no longer at {$source['name']}.";
                    continue;
                }

                if ($lot['left'] + self::EPSILON < $need) {
                    $errors[$key] = "{$item['drug_name']} lot {$lot['lot_number']}: only " . $this->fmt($lot['left']) . " at {$source['name']}.";
                    continue;
                }

                $lots[(int) $lot['id']]['left'] -= $need;
                $plan[] = [(int) $item['id'], (int) $lot['id'], $need];
                continue;
            }

            $candidates = array_filter($lots, fn($l) => (int) $l['drug_id'] === (int) $item['drug_id'] && (int) $l['is_active'] === 1
                && $l['left'] > self::EPSILON && ($l['expires_date'] === null || $l['expires_date'] >= $today));
            $available = array_sum(array_column($candidates, 'left'));

            if ($available + self::EPSILON < $need) {
                $errors[$key] = "{$item['drug_name']}: only " . $this->fmt($available) . " usable at {$source['name']} (expired lots are skipped).";
                continue;
            }

            foreach ($candidates as $lotId => $lot) {
                if ($need <= self::EPSILON) {
                    break;
                }
                $take = min($need, $lots[$lotId]['left']);
                $lots[$lotId]['left'] -= $take;
                $need -= $take;
                $plan[] = [(int) $item['id'], $lotId, round($take, 3)];
            }
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Not enough stock to send this transfer. Lower the quantities, or choose other lots.', 'errors' => $errors];
        }

        $take = $db->prepare(
            "UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand - :qty, updated_at = :now, updated_by = :user WHERE id = :id"
        );
        $record = $db->prepare(
            "INSERT INTO stock_transfer_lots (stock_transfer_id, stock_transfer_item_id, drug_id, from_lot_id, lot_number, expires_date,
                    quantity_sent, unit_cost, created_at)
             VALUES (:transfer, :item, :drug, :lot, :lot_number, :expires, :qty, :cost, :now)"
        );
        $itemDrug = array_column($items, 'drug_id', 'id');
        $value = 0.0;

        foreach ($plan as [$itemId, $lotId, $qty]) {
            $lot = $lots[$lotId];
            $cost = $this->lotCost($lotId, (int) $lot['drug_id']);
            $take->execute(['qty' => $qty, 'now' => $now, 'user' => $userId, 'id' => $lotId]);
            $record->execute([
                'transfer' => $id, 'item' => $itemId, 'drug' => $itemDrug[$itemId], 'lot' => $lotId, 'lot_number' => $lot['lot_number'],
                'expires' => $lot['expires_date'], 'qty' => $qty, 'cost' => $cost, 'now' => $now
            ]);
            StockLedgerService::record($lotId, 'transfer_out', -$qty, 'stock_transfer_lots', (int) $db->lastInsertId(), $userId, [
                'date' => $sentDate, 'unit_cost' => $cost, 'reference_no' => $transfer['st_number'],
                'counterparty' => "To {$destination['name']}", 'notes' => $sentVia !== '' ? $sentVia : null
            ]);
            $value += $qty * $cost;
        }

        $this->updateRow($id, [
            'status' => 'in_transit', 'sent_at' => $now, 'sent_by' => $userId, 'sent_date' => $sentDate,
            'sent_via' => $sentVia !== '' ? $sentVia : null, 'sent_value' => round($value, 2), 'updated_at' => $now, 'updated_by' => $userId
        ]);
        $this->log($id, 'sent', count($plan) . ' lot' . (count($plan) === 1 ? '' : 's') . " left {$source['name']}" . ($sentVia !== '' ? " · via {$sentVia}" : ''), $userId, $now);

        return ['success' => true];
    }

    /**
     * The destination confirms what arrived. Body: received_date?, notes?,
     * lots: [{id, quantity_received, short_reason?, short_notes?}] -- a lot
     * left out arrived in full.
     */
    public function receive(int $id, array $data, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Transfer not found.', 'not_found' => true];
        }

        if (!in_array($user['role'] ?? null, self::STAFF_ROLES, true)) {
            return ['success' => false, 'message' => 'Only storage location staff can receive transfers.'];
        }

        if ($existing['status'] !== 'in_transit') {
            return ['success' => false, 'message' => $existing['status'] === 'received'
                ? "Transfer {$existing['st_number']} has already been received."
                : "Transfer {$existing['st_number']} hasn't been sent yet."];
        }

        $db = Database::connection();
        $errors = [];
        $receivedDate = trim((string) ($data['received_date'] ?? '')) ?: date('Y-m-d');

        if (!$this->isValidDate($receivedDate) || $receivedDate > date('Y-m-d')) {
            $errors['received_date'] = 'Enter the date it arrived (not in the future).';
        } elseif ($existing['sent_date'] && $receivedDate < $existing['sent_date']) {
            $errors['received_date'] = 'It can\'t arrive before it was sent (' . $existing['sent_date'] . ').';
        }

        $stmt = $db->prepare(
            "SELECT tl.*, d.name AS drug_name FROM stock_transfer_lots tl JOIN drugs d ON d.id = tl.drug_id
             WHERE tl.stock_transfer_id = :id ORDER BY tl.id"
        );
        $stmt->execute(['id' => $id]);
        $sentLots = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $input = [];
        foreach ((array) ($data['lots'] ?? []) as $row) {
            $input[(int) ($row['id'] ?? 0)] = is_array($row) ? $row : [];
        }

        $confirmed = [];
        foreach ($sentLots as $lot) {
            $lotId = (int) $lot['id'];
            $sent = (float) $lot['quantity_sent'];
            $row = $input[$lotId] ?? [];
            $raw = $row['quantity_received'] ?? '';
            $received = ($raw === '' || $raw === null) ? $sent : (is_numeric($raw) ? round((float) $raw, 3) : -1.0);
            $reason = (string) ($row['short_reason'] ?? '');
            $notes = mb_substr(trim((string) ($row['short_notes'] ?? '')), 0, 255);

            if ($received < 0) {
                $errors["lots.{$lotId}.quantity_received"] = 'Enter 0 or more.';
                continue;
            }

            if ($received > $sent + self::EPSILON) {
                $errors["lots.{$lotId}.quantity_received"] = 'More than the ' . $this->fmt($sent) . ' sent.';
                continue;
            }

            $short = round($sent - $received, 3);

            if ($short > self::EPSILON) {
                if (!isset(self::SHORT_REASONS[$reason])) {
                    $errors["lots.{$lotId}.short_reason"] = 'Say why it didn\'t all arrive.';
                } elseif ($reason === 'other' && $notes === '') {
                    $errors["lots.{$lotId}.short_notes"] = 'Explain what happened.';
                }
            } else {
                $reason = '';
                $notes = '';
            }

            $confirmed[] = ['lot' => $lot, 'received' => $received, 'short' => max(0, $short), 'reason' => $reason, 'notes' => $notes];
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $now = date('Y-m-d H:i:s');
        $userId = (int) $user['id'];
        $receiveNotes = mb_substr(trim((string) ($data['notes'] ?? '')), 0, 500);
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            if (RecordLock::changed('stock_transfers', $id, $existing)) {
                if ($ownsTransaction) {
                    $db->rollBack();
                }
                return $this->stale($existing);
            }

            $findLot = $db->prepare(
                "SELECT id FROM drug_inventory_lots WHERE drug_id = :d AND lot_number = :lot AND warehouse_id = :w AND deleted_at IS NULL
                 ORDER BY id LIMIT 1 FOR UPDATE"
            );
            $addToLot = $db->prepare(
                "UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand + :qty, is_active = 1, updated_at = :now, updated_by = :user WHERE id = :id"
            );
            $newLot = $db->prepare(
                "INSERT INTO drug_inventory_lots (drug_id, lot_number, facility_id, warehouse_id, quantity_on_hand, expires_date, is_active, created_at, created_by)
                 VALUES (:d, :lot, NULL, :w, :qty, :expires, 1, :now, :user)"
            );
            $logMove = $db->prepare(
                "INSERT INTO drug_inventory_transfers (drug_id, from_lot_id, to_lot_id, quantity, notes, created_at, created_by)
                 VALUES (:d, :from, :to, :qty, :notes, :now, :user)"
            );
            $confirm = $db->prepare(
                "UPDATE stock_transfer_lots SET quantity_received = :received, short_reason = :reason, short_notes = :notes, to_lot_id = :to WHERE id = :id"
            );

            $shortValue = 0.0;
            $shortLines = 0;

            foreach ($confirmed as $c) {
                $lot = $c['lot'];
                $toLotId = null;

                if ($c['received'] > self::EPSILON) {
                    $findLot->execute(['d' => $lot['drug_id'], 'lot' => $lot['lot_number'], 'w' => $existing['to_warehouse_id']]);
                    $toLotId = $findLot->fetchColumn();

                    if ($toLotId) {
                        $toLotId = (int) $toLotId;
                        $addToLot->execute(['qty' => $c['received'], 'now' => $now, 'user' => $userId, 'id' => $toLotId]);
                    } else {
                        $newLot->execute(['d' => $lot['drug_id'], 'lot' => $lot['lot_number'], 'w' => $existing['to_warehouse_id'],
                            'qty' => $c['received'], 'expires' => $lot['expires_date'], 'now' => $now, 'user' => $userId]);
                        $toLotId = (int) $db->lastInsertId();
                    }

                    $logMove->execute(['d' => $lot['drug_id'], 'from' => $lot['from_lot_id'], 'to' => $toLotId, 'qty' => $c['received'],
                        'notes' => $existing['st_number'], 'now' => $now, 'user' => $userId]);
                    StockLedgerService::record($toLotId, 'transfer_in', $c['received'], 'stock_transfer_lots', (int) $lot['id'], $userId, [
                        'date' => $receivedDate, 'unit_cost' => $lot['unit_cost'], 'reference_no' => $existing['st_number'],
                        'counterparty' => 'From ' . StockLedgerService::warehouseName((int) $existing['from_warehouse_id']),
                        'notes' => $c['short'] > self::EPSILON ? $this->fmt($c['short']) . ' short in transit' : null
                    ]);
                }

                if ($c['short'] > self::EPSILON) {
                    $shortValue += $c['short'] * (float) $lot['unit_cost'];
                    $shortLines++;
                }

                $confirm->execute(['received' => $c['received'], 'reason' => $c['reason'] !== '' ? $c['reason'] : null,
                    'notes' => $c['notes'] !== '' ? $c['notes'] : null, 'to' => $toLotId, 'id' => $lot['id']]);
            }

            $this->updateRow($id, [
                'status' => 'received', 'received_at' => $now, 'received_by' => $userId, 'received_date' => $receivedDate,
                'receive_notes' => $receiveNotes !== '' ? $receiveNotes : null, 'short_value' => round($shortValue, 2),
                'updated_at' => $now, 'updated_by' => $userId
            ]);
            $this->log($id, 'received', $shortLines
                ? "{$shortLines} lot" . ($shortLines === 1 ? '' : 's') . ' arrived short, worth ' . number_format($shortValue, 2) . ($receiveNotes !== '' ? " · {$receiveNotes}" : '')
                : 'Everything arrived' . ($receiveNotes !== '' ? " · {$receiveNotes}" : ''), $userId, $now);

            if ($ownsTransaction) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }
            error_log('stock transfer receive failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to receive the transfer. Nothing was changed.'];
        }

        return [
            'success' => true,
            'message' => "Transfer {$existing['st_number']} received" . ($shortLines ? ', with ' . $shortLines . ' lot' . ($shortLines === 1 ? '' : 's') . ' short.' : '. Everything arrived.')
        ];
    }

    /** Before it's received. An in-transit transfer's stock goes back into the lots it left. */
    public function cancel(int $id, string $reason, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Transfer not found.', 'not_found' => true];
        }

        if (!in_array($user['role'] ?? null, self::STAFF_ROLES, true)) {
            return ['success' => false, 'message' => 'Only storage location staff can cancel transfers.'];
        }

        if (!in_array($existing['status'], ['draft', 'requested', 'in_transit'], true)) {
            return ['success' => false, 'message' => $existing['status'] === 'cancelled'
                ? 'This transfer is already cancelled.'
                : 'This transfer has been received, so it can\'t be cancelled. Transfer the stock back instead.'];
        }

        $reason = mb_substr(trim($reason), 0, 255);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['reason' => 'Say why the transfer is cancelled.']];
        }

        $db = Database::connection();
        $now = date('Y-m-d H:i:s');
        $userId = (int) $user['id'];
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            if (RecordLock::changed('stock_transfers', $id, $existing)) {
                if ($ownsTransaction) {
                    $db->rollBack();
                }
                return $this->stale($existing);
            }

            $returned = 0;
            if ($existing['status'] === 'in_transit') {
                $stmt = $db->prepare("SELECT id, from_lot_id, quantity_sent AS qty, unit_cost FROM stock_transfer_lots WHERE stock_transfer_id = :id ORDER BY id");
                $stmt->execute(['id' => $id]);
                $back = $db->prepare(
                    "UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand + :qty, is_active = 1, deleted_at = NULL, deleted_by = NULL,
                            updated_at = :now, updated_by = :user WHERE id = :id"
                );
                foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $lot) {
                    $back->execute(['qty' => $lot['qty'], 'now' => $now, 'user' => $userId, 'id' => $lot['from_lot_id']]);
                    StockLedgerService::record((int) $lot['from_lot_id'], 'transfer_cancelled', (float) $lot['qty'], 'stock_transfer_lots', (int) $lot['id'], $userId, [
                        'unit_cost' => $lot['unit_cost'], 'reference_no' => $existing['st_number'], 'reason' => $reason
                    ]);
                    $returned++;
                }
            }

            $this->updateRow($id, ['status' => 'cancelled', 'cancelled_at' => $now, 'cancelled_by' => $userId, 'cancel_reason' => $reason,
                'updated_at' => $now, 'updated_by' => $userId]);
            $this->log($id, 'cancelled', $reason . ($returned ? " · stock put back into {$returned} lot" . ($returned === 1 ? '' : 's') : ''), $userId, $now);

            if ($ownsTransaction) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }
            error_log('stock transfer cancel failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to cancel the transfer. Nothing was changed.'];
        }

        return ['success' => true, 'message' => "Transfer {$existing['st_number']} cancelled."
            . ($existing['status'] === 'in_transit' ? ' The stock is back at the source location.' : '')];
    }

    /** Drafts only; anything requested or sent is cancelled instead so its record stays. */
    public function remove(int $id, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Transfer not found.', 'not_found' => true];
        }

        if ($existing['status'] !== 'draft') {
            return ['success' => false, 'message' => 'Only drafts can be deleted. Cancel it instead.'];
        }

        if ((int) $existing['created_by'] !== (int) $user['id'] && ($user['role'] ?? null) !== 'admin') {
            return ['success' => false, 'message' => 'Only the person who made this draft (or an administrator) can delete it.'];
        }

        $this->updateRow($id, ['deleted_at' => date('Y-m-d H:i:s'), 'deleted_by' => (int) $user['id']]);

        return ['success' => true, 'message' => "Draft {$existing['st_number']} deleted."];
    }

    /* ---------------------------------------------------------------
     * Validation + helpers
     * ------------------------------------------------------------- */

    /** @return array{0: array, 1: array, 2: array} [header, lines, errors] */
    private function normalize(array $data): array
    {
        $db = Database::connection();
        $errors = [];
        $header = [];

        $from = (int) ($data['from_warehouse_id'] ?? 0);
        $to = (int) ($data['to_warehouse_id'] ?? 0);

        if (!$from || !$this->warehouse($from)) {
            $errors['from_warehouse_id'] = 'Choose the location the stock comes from.';
        }

        if (!$to || !$this->warehouse($to)) {
            $errors['to_warehouse_id'] = 'Choose the location the stock goes to.';
        } elseif ($from === $to) {
            $errors['to_warehouse_id'] = 'Choose a different location from the one it comes from.';
        }

        $header['from_warehouse_id'] = $from;
        $header['to_warehouse_id'] = $to;

        $priority = (string) ($data['priority'] ?? 'normal');
        $header['priority'] = in_array($priority, self::PRIORITIES, true) ? $priority : 'normal';

        $neededBy = trim((string) ($data['needed_by'] ?? ''));
        $header['needed_by'] = $neededBy !== '' ? $neededBy : null;
        if ($header['needed_by'] !== null && !$this->isValidDate($header['needed_by'])) {
            $errors['needed_by'] = 'Enter a valid date.';
        }

        $notes = trim((string) ($data['notes'] ?? ''));
        $header['notes'] = $notes !== '' ? mb_substr($notes, 0, 1000) : null;

        $items = is_array($data['items'] ?? null) ? array_values($data['items']) : [];
        $lines = [];
        $seen = [];
        $drugStmt = $db->prepare("SELECT id, name, is_active, allow_inventory FROM drugs WHERE id = :id AND deleted_at IS NULL");
        $lotStmt = $db->prepare("SELECT id, drug_id, warehouse_id, lot_number FROM drug_inventory_lots WHERE id = :id AND deleted_at IS NULL");

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
                $errors["{$key}.drug_id"] = "{$drug['name']} can't be transferred (inactive or not stocked).";
            }

            $lotId = !empty($item['lot_id']) ? (int) $item['lot_id'] : null;

            if ($lotId !== null) {
                $lotStmt->execute(['id' => $lotId]);
                $lot = $lotStmt->fetch(PDO::FETCH_ASSOC);

                if (!$lot || (int) $lot['drug_id'] !== $drugId || (int) $lot['warehouse_id'] !== $from) {
                    $errors["{$key}.lot_id"] = 'This lot isn\'t at the location the stock comes from.';
                }
            }

            $seenKey = $drugId . '|' . ($lotId ?? 'auto');
            if (isset($seen[$seenKey])) {
                $errors["{$key}.drug_id"] = 'Already on line ' . ($seen[$seenKey] + 1) . '.';
                continue;
            }
            $seen[$seenKey] = $i;

            $qty = is_numeric($item['quantity'] ?? null) ? round((float) $item['quantity'], 3) : 0.0;

            if ($qty <= 0) {
                $errors["{$key}.quantity"] = 'Enter the quantity.';
            }

            $lineNotes = trim((string) ($item['notes'] ?? ''));
            $lines[] = [
                'drug_id' => $drugId,
                'lot_id' => $lotId,
                'quantity' => max(0, $qty),
                'notes' => $lineNotes !== '' ? mb_substr($lineNotes, 0, 255) : null
            ];
        }

        if (!$items) {
            $errors['items'] = 'Add the items to transfer.';
        }

        return [$header, $lines, $errors];
    }

    /** The lot's cost per dispensing unit: its latest delivery, else the catalog cost. */
    private function lotCost(int $lotId, int $drugId): float
    {
        $stmt = Database::connection()->prepare(
            "SELECT COALESCE((SELECT r.unit_cost FROM drug_inventory_receipts r
                               WHERE r.lot_id = :lot AND r.voided_at IS NULL AND r.unit_cost IS NOT NULL
                               ORDER BY r.received_date DESC, r.id DESC LIMIT 1),
                             (SELECT d.unit_cost FROM drugs d WHERE d.id = :drug), 0)"
        );
        $stmt->execute(['lot' => $lotId, 'drug' => $drugId]);

        return round((float) $stmt->fetchColumn(), 4);
    }

    private function warehouse(int $id): ?array
    {
        $stmt = Database::connection()->prepare("SELECT id, name FROM warehouses WHERE id = :id AND deleted_at IS NULL AND is_active = 1");
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare("SELECT * FROM stock_transfers WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function updateRow(int $id, array $values): void
    {
        $sets = implode(', ', array_map(fn($c) => "{$c} = :{$c}", array_keys($values)));
        Database::connection()->prepare("UPDATE stock_transfers SET {$sets} WHERE id = :__id")->execute($values + ['__id' => $id]);
    }

    /** Refusal for a step whose transfer changed after it was read. */
    private function stale(array $record): array
    {
        return ['success' => false, 'message' => "Transfer {$record['st_number']} " . RecordLock::STALE_MESSAGE, 'stale' => true];
    }

    private function log(int $id, string $action, ?string $notes, int $userId, string $now): void
    {
        Database::connection()->prepare(
            "INSERT INTO stock_transfer_history (stock_transfer_id, action, notes, user_id, created_at)
             VALUES (:id, :action, :notes, :user, :created)"
        )->execute([
            'id' => $id, 'action' => $action, 'notes' => $notes !== null && $notes !== '' ? mb_substr($notes, 0, 500) : null,
            'user' => $userId, 'created' => $now
        ]);
    }

    private function formatHeader(array $r, ?array $viewer): array
    {
        $role = $viewer['role'] ?? null;
        $staff = in_array($role, self::STAFF_ROLES, true);
        $editable = in_array($r['status'], self::EDITABLE_STATUSES, true);
        $isOwner = $viewer && (int) $viewer['id'] === (int) $r['created_by'];

        return [
            'id' => (int) $r['id'],
            'st_number' => $r['st_number'],
            'from_warehouse_id' => (int) $r['from_warehouse_id'],
            'from_name' => $r['from_name'],
            'to_warehouse_id' => (int) $r['to_warehouse_id'],
            'to_name' => $r['to_name'],
            'status' => $r['status'],
            'priority' => $r['priority'],
            'needed_by' => $r['needed_by'],
            'notes' => $r['notes'],
            'item_count' => (int) ($r['item_count'] ?? 0),
            'item_names' => $r['item_names'] ?? null,
            'sent_value' => (float) $r['sent_value'],
            'short_value' => (float) $r['short_value'],
            'is_overdue' => $r['needed_by'] !== null && $r['needed_by'] < date('Y-m-d') && in_array($r['status'], ['draft', 'requested', 'in_transit'], true),
            'created_by' => (int) $r['created_by'],
            'created_by_name' => $r['created_by_name'] ?? null,
            'created_at' => $r['created_at'],
            'requested_at' => $r['requested_at'],
            'sent_at' => $r['sent_at'],
            'sent_date' => $r['sent_date'],
            'sent_via' => $r['sent_via'],
            'received_at' => $r['received_at'],
            'received_date' => $r['received_date'],
            'receive_notes' => $r['receive_notes'],
            'cancelled_at' => $r['cancelled_at'],
            'cancel_reason' => $r['cancel_reason'],
            'can_edit' => $editable && $staff,
            'can_request' => $r['status'] === 'draft' && $staff,
            'can_send' => $editable && $staff,
            'can_receive' => $r['status'] === 'in_transit' && $staff,
            'can_cancel' => in_array($r['status'], ['requested', 'in_transit'], true) && $staff,
            'can_delete' => $r['status'] === 'draft' && ($isOwner || $role === 'admin')
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
