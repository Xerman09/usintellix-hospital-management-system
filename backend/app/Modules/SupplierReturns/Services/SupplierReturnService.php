<?php

namespace App\Modules\SupplierReturns\Services;

use App\Core\Database;
use App\Modules\Procurement\Services\RecordLock;
use App\Modules\BusinessSettings\Services\BusinessSettingService;
use App\Modules\PurchaseOrders\Services\PurchaseOrderService;
use PDO;
use Throwable;

/**
 * Returns to supplier (RTS-YYYY-NNNNN): rejected, damaged, wrong or
 * near-expiry items sent back, and the credit the supplier gives.
 *
 *   draft --submit--> pending_approval --approve--> approved --send--> sent --credit--> credited
 *                        |  ^
 *                 reject |  | resubmit         (cancel: anything before it's sent)
 *                        v  |
 *                      rejected
 *
 * Each line comes from one of two places:
 *   * rejected -- a quantity rejected at receiving (goods_receipt_items).
 *     It never went into stock, so sending it changes nothing in
 *     inventory. A rejected quantity can be on only one return that
 *     isn't cancelled.
 *   * stock    -- a lot in a storage location. It leaves the lot when
 *     the return is marked sent (re-checked then, since it may have
 *     been dispensed after approval).
 *
 * The storage locations' people (PurchaseOrderService::CREATOR_ROLES)
 * prepare and send returns; an approver (admin / accountant, never the
 * preparer) approves them and records the supplier's credit memo. The
 * credit then reduces what the hospital owes the supplier: the ledger
 * shows it right away, and Accounts Payable applies it to open invoices
 * (PayableService::applyCredit).
 */
class SupplierReturnService
{
    public const STATUSES = ['draft', 'pending_approval', 'rejected', 'approved', 'sent', 'credited', 'cancelled'];

    public const EDITABLE_STATUSES = ['draft', 'rejected'];

    public const CANCELLABLE_STATUSES = ['draft', 'pending_approval', 'rejected', 'approved'];

    public const PREPARER_ROLES = PurchaseOrderService::CREATOR_ROLES;

    public const APPROVER_ROLES = PurchaseOrderService::APPROVER_ROLES;

    public const REASONS = [
        'damaged' => 'Damaged / defective',
        'expired' => 'Expired',
        'near_expiry' => 'Near expiry',
        'wrong_item' => 'Wrong item / not ordered',
        'recalled' => 'Recalled',
        'excess' => 'Excess / over-delivery',
        'other' => 'Other'
    ];

    public const INPUT_FIELDS = ['supplier_id', 'return_date', 'notes', 'items', 'submit'];

    private const EPSILON = 0.0005;

    /* ---------------------------------------------------------------
     * Reading
     * ------------------------------------------------------------- */

    public function list(array $filters = [], ?array $viewer = null): array
    {
        $where = ['r.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['status']) && in_array($filters['status'], self::STATUSES, true)) {
            $where[] = 'r.status = :status';
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['supplier_id'])) {
            $where[] = 'r.supplier_id = :supplier';
            $params['supplier'] = (int) $filters['supplier_id'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT r.*, s.name AS supplier_name, s.code AS supplier_code,
                    " . self::userNameSql('r.created_by') . " AS created_by_name,
                    (SELECT COUNT(*) FROM supplier_return_items i WHERE i.supplier_return_id = r.id) AS item_count
             FROM supplier_returns r
             JOIN suppliers s ON s.id = r.supplier_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY r.id DESC
             LIMIT 2000"
        );
        $stmt->execute($params);

        return array_map(fn(array $r) => $this->formatHeader($r, $viewer), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function get(int $id, ?array $viewer = null): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT r.*, s.name AS supplier_name, s.code AS supplier_code, s.tin AS supplier_tin,
                    s.address_line, s.city, s.province, s.contact_person, s.phone, s.email,
                    " . self::userNameSql('r.created_by') . " AS created_by_name,
                    " . self::userNameSql('r.approved_by') . " AS approved_by_name,
                    " . self::userNameSql('r.rejected_by') . " AS rejected_by_name,
                    " . self::userNameSql('r.sent_by') . " AS sent_by_name,
                    " . self::userNameSql('r.credited_by') . " AS credited_by_name,
                    (SELECT COUNT(*) FROM supplier_return_items i WHERE i.supplier_return_id = r.id) AS item_count
             FROM supplier_returns r
             JOIN suppliers s ON s.id = r.supplier_id
             WHERE r.id = :id AND r.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $return = $this->formatHeader($row, $viewer);

        foreach (['created_by', 'approved_by', 'rejected_by', 'sent_by', 'credited_by'] as $field) {
            $return["{$field}_name"] = $row["{$field}_name"];
        }

        $return['supplier_tin'] = $row['supplier_tin'];
        $return['supplier_address'] = implode(', ', array_filter([$row['address_line'], $row['city'], $row['province']]));
        $return['supplier_contact'] = implode(' · ', array_filter([$row['contact_person'], $row['phone'], $row['email']]));

        $stmt = $db->prepare(
            "SELECT i.*, d.name AS drug_name, du.name AS unit_name, pu.name AS package_unit_name,
                    gr.gr_number, gr.received_date, po.po_number, gri.rejection_reason,
                    w.name AS warehouse_name, l.quantity_on_hand
             FROM supplier_return_items i
             JOIN drugs d ON d.id = i.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
             LEFT JOIN goods_receipt_items gri ON gri.id = i.goods_receipt_item_id
             LEFT JOIN goods_receipts gr ON gr.id = gri.goods_receipt_id
             LEFT JOIN purchase_orders po ON po.id = gr.purchase_order_id
             LEFT JOIN drug_inventory_lots l ON l.id = i.lot_id
             LEFT JOIN warehouses w ON w.id = COALESCE(l.warehouse_id, gr.warehouse_id)
             WHERE i.supplier_return_id = :id
             ORDER BY i.line_no, i.id"
        );
        $stmt->execute(['id' => $id]);
        $return['items'] = array_map(fn(array $r) => [
            'id' => (int) $r['id'],
            'line_no' => (int) $r['line_no'],
            'source' => $r['source'],
            'goods_receipt_item_id' => $r['goods_receipt_item_id'] !== null ? (int) $r['goods_receipt_item_id'] : null,
            'lot_id' => $r['lot_id'] !== null ? (int) $r['lot_id'] : null,
            'drug_id' => (int) $r['drug_id'],
            'drug_name' => $r['drug_name'],
            'unit_name' => $r['unit_name'],
            'package_unit_name' => $r['package_unit_name'],
            'lot_number' => $r['lot_number'],
            'expires_date' => $r['expires_date'],
            'order_unit' => $r['order_unit'],
            'units_per_package' => $r['units_per_package'] !== null ? (float) $r['units_per_package'] : null,
            'quantity' => (float) $r['quantity'],
            'base_quantity' => (float) $r['base_quantity'],
            'unit_cost' => (float) $r['unit_cost'],
            'line_total' => (float) $r['line_total'],
            'vat_type' => $r['vat_type'],
            'vat_amount' => (float) $r['vat_amount'],
            'reason' => $r['reason'],
            'reason_label' => self::REASONS[$r['reason']] ?? $r['reason'],
            'remarks' => $r['remarks'],
            'gr_number' => $r['gr_number'],
            'received_date' => $r['received_date'],
            'po_number' => $r['po_number'],
            'rejection_reason' => $r['rejection_reason'],
            'warehouse_name' => $r['warehouse_name'],
            'quantity_on_hand' => $r['quantity_on_hand'] !== null ? (float) $r['quantity_on_hand'] : null
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $stmt = $db->prepare(
            "SELECT h.id, h.action, h.notes, h.created_at, " . self::userNameSql('h.user_id') . " AS user_name
             FROM supplier_return_history h WHERE h.supplier_return_id = :id ORDER BY h.created_at, h.id"
        );
        $stmt->execute(['id' => $id]);
        $return['history'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $stmt = $db->prepare(
            "SELECT p.id, p.pv_number, p.payment_date, p.status, p.total_applied,
                    (SELECT GROUP_CONCAT(si.ap_number ORDER BY si.id SEPARATOR ', ')
                       FROM supplier_payment_allocations a JOIN supplier_invoices si ON si.id = a.supplier_invoice_id
                      WHERE a.supplier_payment_id = p.id) AS invoice_numbers
             FROM supplier_payments p WHERE p.supplier_return_id = :id ORDER BY p.id"
        );
        $stmt->execute(['id' => $id]);
        $return['applications'] = array_map(fn(array $r) => [
            'id' => (int) $r['id'],
            'pv_number' => $r['pv_number'],
            'payment_date' => $r['payment_date'],
            'status' => $r['status'],
            'total_applied' => (float) $r['total_applied'],
            'invoice_numbers' => $r['invoice_numbers']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $business = (new BusinessSettingService())->get();
        $return['buyer'] = [
            'name' => $business['name'] ?? null,
            'address' => $business['address'] ?? null,
            'phone' => $business['phone'] ?? null,
            'email' => $business['email'] ?? null
        ];

        return $return;
    }

    /**
     * What can be returned to a supplier: quantities rejected at
     * receiving not on another return yet, and stock lots received from
     * them that still have stock. $returnId: the return being edited
     * (its own lines stay available).
     */
    public function sources(int $supplierId, ?int $returnId = null): array
    {
        $db = Database::connection();

        $stmt = $db->prepare(
            "SELECT gri.id, gri.drug_id, gri.order_unit, gri.units_per_package, gri.rejected_quantity, gri.rejection_reason,
                    gri.unit_cost, gri.lot_number, gri.expires_date,
                    gr.gr_number, gr.received_date, po.po_number, po.vat_rate, poi.vat_type,
                    d.name AS drug_name, du.name AS unit_name, pu.name AS package_unit_name, w.name AS warehouse_name,
                    COALESCE((SELECT SUM(i.quantity) FROM supplier_return_items i
                              JOIN supplier_returns r ON r.id = i.supplier_return_id
                              WHERE i.goods_receipt_item_id = gri.id AND r.status <> 'cancelled' AND r.deleted_at IS NULL
                                AND r.id <> :rid), 0) AS already_returned
             FROM goods_receipt_items gri
             JOIN goods_receipts gr ON gr.id = gri.goods_receipt_id AND gr.voided_at IS NULL
             JOIN purchase_orders po ON po.id = gr.purchase_order_id
             LEFT JOIN purchase_order_items poi ON poi.id = gri.purchase_order_item_id
             JOIN drugs d ON d.id = gri.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
             LEFT JOIN warehouses w ON w.id = gr.warehouse_id
             WHERE gr.supplier_id = :supplier AND gri.rejected_quantity > 0
             ORDER BY gr.id DESC, gri.id"
        );
        $stmt->execute(['supplier' => $supplierId, 'rid' => $returnId ?? 0]);

        $rejected = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $available = round((float) $r['rejected_quantity'] - (float) $r['already_returned'], 3);

            if ($available <= self::EPSILON) {
                continue;
            }

            $per = $r['order_unit'] === 'package' && $r['units_per_package'] ? (float) $r['units_per_package'] : 1.0;

            $rejected[] = [
                'goods_receipt_item_id' => (int) $r['id'],
                'drug_id' => (int) $r['drug_id'],
                'drug_name' => $r['drug_name'],
                'unit_label' => $r['order_unit'] === 'package' ? ($r['package_unit_name'] ?: 'package') : ($r['unit_name'] ?: 'unit'),
                'order_unit' => $r['order_unit'] ?: 'unit',
                'units_per_package' => $r['order_unit'] === 'package' ? $per : null,
                'available' => $available,
                'rejection_reason' => $r['rejection_reason'],
                'lot_number' => $r['lot_number'],
                'expires_date' => $r['expires_date'],
                'gr_number' => $r['gr_number'],
                'received_date' => $r['received_date'],
                'po_number' => $r['po_number'],
                'warehouse_name' => $r['warehouse_name'],
                // Cost per return unit (the unit it was rejected in), before VAT.
                'unit_cost' => round((float) $r['unit_cost'] * $per, 4),
                'vat_type' => (float) $r['vat_rate'] > 0 && $r['vat_type'] ? $r['vat_type'] : 'vatable'
            ];
        }

        // Lots this supplier delivered that still have stock, with what they cost.
        $stmt = $db->prepare(
            "SELECT l.id, l.drug_id, l.lot_number, l.expires_date, l.quantity_on_hand, l.warehouse_id,
                    d.name AS drug_name, du.name AS unit_name, w.name AS warehouse_name,
                    (SELECT r.unit_cost FROM drug_inventory_receipts r
                      WHERE r.lot_id = l.id AND r.supplier_id = :s1 AND r.voided_at IS NULL AND r.unit_cost IS NOT NULL
                      ORDER BY r.received_date DESC, r.id DESC LIMIT 1) AS unit_cost,
                    d.unit_cost AS catalog_cost
             FROM drug_inventory_lots l
             JOIN drugs d ON d.id = l.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN warehouses w ON w.id = l.warehouse_id
             WHERE l.deleted_at IS NULL AND l.quantity_on_hand > 0
               AND EXISTS (SELECT 1 FROM drug_inventory_receipts r WHERE r.lot_id = l.id AND r.supplier_id = :s2 AND r.voided_at IS NULL)
             ORDER BY l.expires_date IS NULL, l.expires_date, d.name"
        );
        $stmt->execute(['s1' => $supplierId, 's2' => $supplierId]);

        $today = date('Y-m-d');
        $stock = array_map(fn(array $r) => [
            'lot_id' => (int) $r['id'],
            'drug_id' => (int) $r['drug_id'],
            'drug_name' => $r['drug_name'],
            'unit_label' => $r['unit_name'] ?: 'unit',
            'lot_number' => $r['lot_number'],
            'expires_date' => $r['expires_date'],
            'is_expired' => $r['expires_date'] !== null && $r['expires_date'] <= $today,
            'days_to_expiry' => $r['expires_date'] !== null ? (int) floor((strtotime($r['expires_date']) - strtotime($today)) / 86400) : null,
            'on_hand' => (float) $r['quantity_on_hand'],
            'warehouse_id' => $r['warehouse_id'] !== null ? (int) $r['warehouse_id'] : null,
            'warehouse_name' => $r['warehouse_name'],
            'unit_cost' => round((float) ($r['unit_cost'] ?? $r['catalog_cost'] ?? 0), 4),
            'vat_type' => 'vatable'
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        return [
            'rejected' => $rejected,
            'stock' => $stock,
            'reasons' => self::REASONS,
            'vat_percent' => PurchaseOrderService::VAT_RATE
        ];
    }

    /** Credited returns with credit not yet used on invoices. Filter: supplier_id? */
    public function availableCredits(?int $supplierId = null): array
    {
        $sql = "SELECT r.id, r.rts_number, r.supplier_id, s.name AS supplier_name, r.credit_memo_no, r.credit_memo_date,
                       r.credit_amount, r.credit_applied
                FROM supplier_returns r JOIN suppliers s ON s.id = r.supplier_id
                WHERE r.status = 'credited' AND r.deleted_at IS NULL AND r.credit_amount - r.credit_applied > 0.005";
        $params = [];

        if ($supplierId) {
            $sql .= ' AND r.supplier_id = :supplier';
            $params['supplier'] = $supplierId;
        }

        $stmt = Database::connection()->prepare($sql . ' ORDER BY r.credit_memo_date, r.id');
        $stmt->execute($params);

        return array_map(fn(array $r) => [
            'id' => (int) $r['id'],
            'rts_number' => $r['rts_number'],
            'supplier_id' => (int) $r['supplier_id'],
            'supplier_name' => $r['supplier_name'],
            'credit_memo_no' => $r['credit_memo_no'],
            'credit_memo_date' => $r['credit_memo_date'],
            'credit_amount' => (float) $r['credit_amount'],
            'credit_applied' => (float) $r['credit_applied'],
            'available' => round((float) $r['credit_amount'] - (float) $r['credit_applied'], 2)
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /* ---------------------------------------------------------------
     * Saving
     * ------------------------------------------------------------- */

    public function create(array $data, int $userId): array
    {
        return $this->save(null, $data, $userId);
    }

    public function update(int $id, array $data, int $userId): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Return not found.', 'not_found' => true];
        }

        if (!in_array($existing['status'], self::EDITABLE_STATUSES, true)) {
            return ['success' => false, 'message' => 'Only draft or rejected returns can be changed.'];
        }

        return $this->save($existing, $data, $userId);
    }

    private function save(?array $existing, array $data, int $userId): array
    {
        $submit = !empty($data['submit']);
        [$header, $lines, $errors] = $this->normalize($data, $submit, $existing ? (int) $existing['id'] : null);

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
                    'status' => 'pending_approval',
                    'submitted_at' => $now,
                    'submitted_by' => $userId,
                    'rejected_at' => null,
                    'rejected_by' => null,
                    'rejection_reason' => null
                ];
            }

            if ($existing) {
                $id = (int) $existing['id'];
                $this->updateRow($id, $values);
                $db->prepare("DELETE FROM supplier_return_items WHERE supplier_return_id = :id")->execute(['id' => $id]);
                $rtsNumber = $existing['rts_number'];
            } else {
                $values += ['status' => 'draft', 'created_at' => $now, 'created_by' => $userId];
                $columns = array_keys($values);
                $db->prepare(
                    "INSERT INTO supplier_returns (" . implode(', ', $columns) . ") VALUES (:" . implode(', :', $columns) . ")"
                )->execute($values);
                $id = (int) $db->lastInsertId();
                $rtsNumber = 'RTS-' . date('Y') . '-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT);
                $this->updateRow($id, ['rts_number' => $rtsNumber]);
                $this->log($id, 'created', null, $userId, $now);
            }

            $insert = $db->prepare(
                "INSERT INTO supplier_return_items (supplier_return_id, line_no, source, goods_receipt_item_id, lot_id, drug_id, lot_number,
                    expires_date, order_unit, units_per_package, quantity, base_quantity, unit_cost, line_total, vat_type, vat_amount,
                    reason, remarks, created_at)
                 VALUES (:return_id, :line_no, :source, :gri, :lot, :drug, :lot_number, :expires, :unit, :per, :qty, :base, :cost,
                    :total, :vat_type, :vat, :reason, :remarks, :now)"
            );

            foreach ($lines as $i => $line) {
                $insert->execute([
                    'return_id' => $id, 'line_no' => $i + 1, 'source' => $line['source'], 'gri' => $line['goods_receipt_item_id'],
                    'lot' => $line['lot_id'], 'drug' => $line['drug_id'], 'lot_number' => $line['lot_number'],
                    'expires' => $line['expires_date'], 'unit' => $line['order_unit'], 'per' => $line['units_per_package'],
                    'qty' => $line['quantity'], 'base' => $line['base_quantity'], 'cost' => $line['unit_cost'],
                    'total' => $line['line_total'], 'vat_type' => $line['vat_type'], 'vat' => $line['vat_amount'],
                    'reason' => $line['reason'], 'remarks' => $line['remarks'], 'now' => $now
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
            error_log('supplier return save failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to save the return.'];
        }

        return [
            'success' => true,
            'message' => $submit ? "Return {$rtsNumber} submitted for approval." : "Return {$rtsNumber} saved as a draft.",
            'data' => ['id' => $id, 'rts_number' => $rtsNumber]
        ];
    }

    /* ---------------------------------------------------------------
     * Workflow
     * ------------------------------------------------------------- */

    public function approvalBlocker(array $return, ?array $user): ?string
    {
        if (!$user || !in_array($user['role'] ?? null, self::APPROVER_ROLES, true)) {
            return 'Only an administrator or accountant can approve returns.';
        }

        if ($return['status'] !== 'pending_approval') {
            return 'This return is not waiting for approval.';
        }

        $userId = (int) ($user['id'] ?? 0);

        if ($userId === (int) $return['created_by'] || $userId === (int) $return['submitted_by']) {
            return 'You prepared or submitted this return, so someone else has to approve it.';
        }

        return null;
    }

    public function approve(int $id, string $notes, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Return not found.', 'not_found' => true];
        }

        if ($blocker = $this->approvalBlocker($existing, $user)) {
            return ['success' => false, 'message' => $blocker];
        }

        $notes = mb_substr(trim($notes), 0, 500);
        $now = date('Y-m-d H:i:s');

        if (!$this->transition($id, [
            'status' => 'approved',
            'approved_at' => $now,
            'approved_by' => (int) $user['id'],
            'approval_notes' => $notes !== '' ? $notes : null
        ], 'approved', $notes, (int) $user['id'], $now, $existing)) {
            return $this->stale($existing);
        }

        return ['success' => true, 'message' => "Return {$existing['rts_number']} approved. It can be sent to the supplier."];
    }

    public function reject(int $id, string $reason, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Return not found.', 'not_found' => true];
        }

        if ($blocker = $this->approvalBlocker($existing, $user)) {
            return ['success' => false, 'message' => $blocker];
        }

        $reason = mb_substr(trim($reason), 0, 255);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['reason' => 'Say what has to be changed.']];
        }

        $now = date('Y-m-d H:i:s');

        if (!$this->transition($id, [
            'status' => 'rejected',
            'rejected_at' => $now,
            'rejected_by' => (int) $user['id'],
            'rejection_reason' => $reason
        ], 'rejected', $reason, (int) $user['id'], $now, $existing)) {
            return $this->stale($existing);
        }

        return ['success' => true, 'message' => "Return {$existing['rts_number']} sent back for changes."];
    }

    /**
     * The goods leave: stock lines come out of their lots (refused if a
     * lot no longer has enough). Body: sent_date?, sent_via?
     */
    public function send(int $id, array $data, int $userId): array
    {
        $db = Database::connection();
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Return not found.', 'not_found' => true];
        }

        if ($existing['status'] !== 'approved') {
            return ['success' => false, 'message' => $existing['status'] === 'pending_approval'
                ? 'This return has to be approved before it is sent.'
                : 'Only approved returns can be sent.'];
        }

        $sentDate = trim((string) ($data['sent_date'] ?? '')) ?: date('Y-m-d');

        if (!$this->isValidDate($sentDate) || $sentDate > date('Y-m-d')) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['sent_date' => 'Enter the date it was sent (not in the future).']];
        }

        $sentVia = mb_substr(trim((string) ($data['sent_via'] ?? '')), 0, 150);
        $now = date('Y-m-d H:i:s');
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        } else {
            $db->exec('SAVEPOINT supplier_return_send');
        }

        $undo = function () use ($db, $ownsTransaction) {
            if ($ownsTransaction) {
                $db->rollBack();
            } else {
                $db->exec('ROLLBACK TO SAVEPOINT supplier_return_send');
            }
        };

        try {
            // Sent twice (double click, two people): the second waits here, then stops.
            if (RecordLock::changed('supplier_returns', $id, $existing)) {
                $undo();
                return $this->stale($existing);
            }

            $stmt = $db->prepare(
                "SELECT i.lot_id, SUM(i.base_quantity) AS qty, MAX(d.name) AS drug_name, MAX(i.lot_number) AS lot_number
                 FROM supplier_return_items i JOIN drugs d ON d.id = i.drug_id
                 WHERE i.supplier_return_id = :id AND i.source = 'stock' AND i.lot_id IS NOT NULL
                 GROUP BY i.lot_id"
            );
            $stmt->execute(['id' => $id]);
            $byLot = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $short = [];
            $lock = $db->prepare("SELECT quantity_on_hand FROM drug_inventory_lots WHERE id = :id AND deleted_at IS NULL FOR UPDATE");
            $take = $db->prepare(
                "UPDATE drug_inventory_lots SET quantity_on_hand = quantity_on_hand - :qty, updated_at = :now, updated_by = :user WHERE id = :id"
            );

            foreach ($byLot as $lot) {
                $lock->execute(['id' => $lot['lot_id']]);
                $onHand = $lock->fetchColumn();
                $onHand = $onHand === false ? 0.0 : (float) $onHand;

                if ($onHand + self::EPSILON < (float) $lot['qty']) {
                    $short[] = "{$lot['drug_name']} lot {$lot['lot_number']}: returning " . $this->fmt((float) $lot['qty'])
                        . ', only ' . $this->fmt($onHand) . ' left';
                    continue;
                }

                $take->execute(['qty' => round((float) $lot['qty'], 3), 'now' => $now, 'user' => $userId, 'id' => $lot['lot_id']]);
            }

            if ($short) {
                $undo();
                return ['success' => false, 'message' => 'Not enough stock left to send this return: ' . implode('; ', $short)
                    . '. Change the quantities (send it back for changes) or cancel it.'];
            }

            $this->transition($id, [
                'status' => 'sent',
                'sent_at' => $now,
                'sent_by' => $userId,
                'sent_date' => $sentDate,
                'sent_via' => $sentVia !== '' ? $sentVia : null
            ], 'sent', $sentVia !== '' ? "Via {$sentVia}" : null, $userId, $now);

            if ($ownsTransaction) {
                $db->commit();
            } else {
                $db->exec('RELEASE SAVEPOINT supplier_return_send');
            }
        } catch (Throwable $e) {
            $undo();
            error_log('supplier return send failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to send the return. Nothing was changed.'];
        }

        return [
            'success' => true,
            'message' => "Return {$existing['rts_number']} sent." . ($byLot ? ' The returned stock was taken out of inventory.' : '')
        ];
    }

    /** The supplier's credit memo. Body: credit_memo_no, credit_memo_date, credit_amount */
    public function credit(int $id, array $data, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Return not found.', 'not_found' => true];
        }

        if (!in_array($user['role'] ?? null, self::APPROVER_ROLES, true)) {
            return ['success' => false, 'message' => 'Only an administrator or accountant can record the supplier\'s credit.'];
        }

        if ($existing['status'] !== 'sent') {
            return ['success' => false, 'message' => $existing['status'] === 'credited'
                ? 'The credit for this return is already recorded.'
                : 'Record the credit once the return has been sent.'];
        }

        $errors = [];
        $number = mb_substr(trim((string) ($data['credit_memo_no'] ?? '')), 0, 100);
        $date = trim((string) ($data['credit_memo_date'] ?? ''));
        $raw = $data['credit_amount'] ?? '';
        $amount = is_numeric($raw) ? round((float) $raw, 2) : 0.0;

        if ($number === '') {
            $errors['credit_memo_no'] = 'Enter the supplier\'s credit memo number.';
        } else {
            $stmt = Database::connection()->prepare(
                "SELECT rts_number FROM supplier_returns WHERE supplier_id = :s AND LOWER(credit_memo_no) = LOWER(:n) AND id <> :id AND deleted_at IS NULL LIMIT 1"
            );
            $stmt->execute(['s' => $existing['supplier_id'], 'n' => $number, 'id' => $id]);

            if ($dup = $stmt->fetchColumn()) {
                $errors['credit_memo_no'] = "This credit memo is already recorded on {$dup}.";
            }
        }

        if (!$this->isValidDate($date) || $date > date('Y-m-d')) {
            $errors['credit_memo_date'] = 'Enter the credit memo date (not in the future).';
        }

        if ($amount <= 0) {
            $errors['credit_amount'] = 'Enter the amount credited.';
        } elseif ($amount > (float) $existing['total'] + 0.005) {
            $errors['credit_amount'] = 'More than the return\'s value of ' . number_format((float) $existing['total'], 2) . '.';
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $now = date('Y-m-d H:i:s');

        if (!$this->transition($id, [
            'status' => 'credited',
            'credit_memo_no' => $number,
            'credit_memo_date' => $date,
            'credit_amount' => $amount,
            'credited_at' => $now,
            'credited_by' => (int) $user['id']
        ], 'credited', "Credit memo {$number}: " . number_format($amount, 2)
            . ($amount < (float) $existing['total'] - 0.005 ? ' (return value ' . number_format((float) $existing['total'], 2) . ')' : ''),
            (int) $user['id'], $now, $existing)) {
            return $this->stale($existing);
        }

        return ['success' => true, 'message' => "Credit of " . number_format($amount, 2) . " recorded for {$existing['rts_number']}. Apply it to the supplier's invoices under Accounts Payable."];
    }

    public function cancel(int $id, string $reason, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Return not found.', 'not_found' => true];
        }

        if (!in_array($existing['status'], self::CANCELLABLE_STATUSES, true)) {
            return ['success' => false, 'message' => $existing['status'] === 'cancelled'
                ? 'This return is already cancelled.'
                : 'This return has already been sent, so it can\'t be cancelled.'];
        }

        $reason = mb_substr(trim($reason), 0, 255);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['reason' => 'Say why this return is cancelled.']];
        }

        $now = date('Y-m-d H:i:s');

        if (!$this->transition($id, [
            'status' => 'cancelled',
            'cancelled_at' => $now,
            'cancelled_by' => (int) $user['id'],
            'cancel_reason' => $reason
        ], 'cancelled', $reason, (int) $user['id'], $now, $existing)) {
            return $this->stale($existing);
        }

        return ['success' => true, 'message' => "Return {$existing['rts_number']} cancelled."];
    }

    public function remove(int $id, int $userId): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Return not found.', 'not_found' => true];
        }

        if ($existing['status'] !== 'draft') {
            return ['success' => false, 'message' => 'Only drafts can be deleted. Cancel it instead.'];
        }

        $this->updateRow($id, ['deleted_at' => date('Y-m-d H:i:s'), 'deleted_by' => $userId]);

        return ['success' => true, 'message' => "Draft {$existing['rts_number']} deleted."];
    }

    /** Used by Accounts Payable when a credit is applied to invoices (or that is voided). */
    public function addApplied(int $id, float $amount): void
    {
        Database::connection()->prepare(
            "UPDATE supplier_returns SET credit_applied = GREATEST(0, credit_applied + :amount) WHERE id = :id"
        )->execute(['amount' => round($amount, 2), 'id' => $id]);
    }

    /* ---------------------------------------------------------------
     * Validation
     * ------------------------------------------------------------- */

    /** @return array{0: array, 1: array, 2: array} [header, lines, errors] */
    private function normalize(array $data, bool $submit, ?int $returnId): array
    {
        $db = Database::connection();
        $errors = [];
        $header = [];

        $supplierId = (int) ($data['supplier_id'] ?? 0);
        $stmt = $db->prepare("SELECT id FROM suppliers WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $supplierId]);

        if (!$supplierId || !$stmt->fetchColumn()) {
            return [$header, [], ['supplier_id' => 'Choose the supplier the items go back to.']];
        }

        $header['supplier_id'] = $supplierId;

        $date = trim((string) ($data['return_date'] ?? '')) ?: date('Y-m-d');
        $header['return_date'] = $date;

        if (!$this->isValidDate($date)) {
            $errors['return_date'] = 'Enter a valid date.';
        } elseif ($date > date('Y-m-d')) {
            $errors['return_date'] = 'The return date can\'t be in the future.';
        }

        $notes = trim((string) ($data['notes'] ?? ''));
        $header['notes'] = $notes !== '' ? mb_substr($notes, 0, 2000) : null;

        $sources = $this->sources($supplierId, $returnId);
        $rejected = [];
        foreach ($sources['rejected'] as $row) {
            $rejected[$row['goods_receipt_item_id']] = $row;
        }

        $items = is_array($data['items'] ?? null) ? array_values($data['items']) : [];
        $lines = [];
        $seen = [];
        $subtotal = 0.0;
        $vatTotal = 0.0;
        $rate = PurchaseOrderService::VAT_RATE;
        $lotStmt = $db->prepare(
            "SELECT l.id, l.drug_id, l.lot_number, l.expires_date, l.quantity_on_hand, l.warehouse_id
             FROM drug_inventory_lots l WHERE l.id = :id AND l.deleted_at IS NULL"
        );

        foreach ($items as $i => $item) {
            $key = "items.{$i}";
            $item = is_array($item) ? $item : [];
            $source = $item['source'] ?? '';

            $qtyRaw = $item['quantity'] ?? '';
            $quantity = is_numeric($qtyRaw) ? round((float) $qtyRaw, 3) : 0.0;

            if ($quantity <= 0) {
                $errors["{$key}.quantity"] = 'Enter the quantity going back.';
            }

            if ($source === 'rejected') {
                $griId = (int) ($item['goods_receipt_item_id'] ?? 0);
                $row = $rejected[$griId] ?? null;

                if (!$row) {
                    $errors["{$key}.quantity"] = 'This rejected item isn\'t available (already on another return, or not from this supplier).';
                    continue;
                }

                if (isset($seen["G{$griId}"])) {
                    $errors["{$key}.quantity"] = 'This item is already on the return.';
                    continue;
                }
                $seen["G{$griId}"] = true;

                if ($quantity > $row['available'] + self::EPSILON) {
                    $errors["{$key}.quantity"] = 'Only ' . $this->fmt($row['available']) . " {$row['unit_label']} were rejected and not yet returned.";
                }

                $per = $row['units_per_package'] ?: 1.0;
                $line = [
                    'source' => 'rejected', 'goods_receipt_item_id' => $griId, 'lot_id' => null, 'drug_id' => $row['drug_id'],
                    'lot_number' => $row['lot_number'], 'expires_date' => $row['expires_date'], 'order_unit' => $row['order_unit'],
                    'units_per_package' => $row['units_per_package'], 'quantity' => $quantity, 'base_quantity' => round($quantity * $per, 3),
                    'default_cost' => $row['unit_cost'], 'default_vat' => $row['vat_type']
                ];
            } elseif ($source === 'stock') {
                $lotId = (int) ($item['lot_id'] ?? 0);
                $lotStmt->execute(['id' => $lotId]);
                $lot = $lotStmt->fetch(PDO::FETCH_ASSOC);
                $stockRow = null;
                foreach ($sources['stock'] as $candidate) {
                    if ($candidate['lot_id'] === $lotId) {
                        $stockRow = $candidate;
                        break;
                    }
                }

                if (!$lot || !$stockRow) {
                    $errors["{$key}.quantity"] = 'This lot has no stock left, or wasn\'t delivered by this supplier.';
                    continue;
                }

                if (isset($seen["L{$lotId}"])) {
                    $errors["{$key}.quantity"] = 'This lot is already on the return.';
                    continue;
                }
                $seen["L{$lotId}"] = true;

                if ($quantity > (float) $lot['quantity_on_hand'] + self::EPSILON) {
                    $errors["{$key}.quantity"] = 'Only ' . $this->fmt((float) $lot['quantity_on_hand']) . ' left in this lot.';
                }

                $line = [
                    'source' => 'stock', 'goods_receipt_item_id' => null, 'lot_id' => $lotId, 'drug_id' => (int) $lot['drug_id'],
                    'lot_number' => $lot['lot_number'], 'expires_date' => $lot['expires_date'], 'order_unit' => 'unit',
                    'units_per_package' => null, 'quantity' => $quantity, 'base_quantity' => $quantity,
                    'default_cost' => $stockRow['unit_cost'], 'default_vat' => 'vatable'
                ];

                $header['warehouse_id'] ??= $lot['warehouse_id'] !== null ? (int) $lot['warehouse_id'] : null;
            } else {
                $errors["{$key}.quantity"] = 'Unknown line.';
                continue;
            }

            $costRaw = $item['unit_cost'] ?? '';
            $unitCost = ($costRaw === '' || $costRaw === null) ? (float) $line['default_cost'] : (is_numeric($costRaw) ? round((float) $costRaw, 4) : -1.0);

            if ($unitCost < 0) {
                $errors["{$key}.unit_cost"] = 'Enter zero or more.';
                $unitCost = 0.0;
            }

            $vatType = (string) ($item['vat_type'] ?? '') ?: $line['default_vat'];

            if (!in_array($vatType, PurchaseOrderService::VAT_TYPES, true)) {
                $errors["{$key}.vat_type"] = 'Choose VAT, VAT-exempt or zero-rated.';
                $vatType = 'vatable';
            }

            $reason = (string) ($item['reason'] ?? '');

            if (!isset(self::REASONS[$reason])) {
                $errors["{$key}.reason"] = 'Choose why it is going back.';
                $reason = 'other';
            }

            $remarks = trim((string) ($item['remarks'] ?? ''));
            $lineTotal = round(max(0, $quantity) * $unitCost, 2);
            $lineVat = $vatType === 'vatable' ? round($lineTotal * $rate / 100, 2) : 0.0;

            unset($line['default_cost'], $line['default_vat']);
            $lines[] = $line + [
                'unit_cost' => $unitCost,
                'line_total' => $lineTotal,
                'vat_type' => $vatType,
                'vat_amount' => $lineVat,
                'reason' => $reason,
                'remarks' => $remarks !== '' ? mb_substr($remarks, 0, 255) : null
            ];

            $subtotal += $lineTotal;
            $vatTotal += $lineVat;
        }

        if ($submit && !$items) {
            $errors['items'] = 'Add the items going back.';
        }

        $header['warehouse_id'] ??= null;
        $header['subtotal'] = round($subtotal, 2);
        $header['vat_rate'] = $rate;
        $header['vat_amount'] = round($vatTotal, 2);
        $header['total'] = round($subtotal + $vatTotal, 2);

        return [$header, $lines, $errors];
    }

    /* ---------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------- */

    private function find(int $id): ?array
    {
        $stmt = Database::connection()->prepare("SELECT * FROM supplier_returns WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $id]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    private function updateRow(int $id, array $values): void
    {
        $sets = implode(', ', array_map(fn($c) => "{$c} = :{$c}", array_keys($values)));
        Database::connection()->prepare("UPDATE supplier_returns SET {$sets} WHERE id = :__id")->execute($values + ['__id' => $id]);
    }

    /** Refusal for a step whose record changed after it was read. */
    private function stale(array $record): array
    {
        return ['success' => false, 'message' => "Return {$record['rts_number']} " . RecordLock::STALE_MESSAGE, 'stale' => true];
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
            if ($seen !== null && RecordLock::changed('supplier_returns', $id, $seen, ['status', 'updated_at'])) {
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

    private function log(int $returnId, string $action, ?string $notes, int $userId, string $now): void
    {
        Database::connection()->prepare(
            "INSERT INTO supplier_return_history (supplier_return_id, action, notes, user_id, created_at)
             VALUES (:id, :action, :notes, :user, :created)"
        )->execute([
            'id' => $returnId,
            'action' => $action,
            'notes' => $notes !== null && $notes !== '' ? mb_substr($notes, 0, 500) : null,
            'user' => $userId,
            'created' => $now
        ]);
    }

    private function formatHeader(array $r, ?array $viewer): array
    {
        $role = $viewer['role'] ?? null;

        return [
            'id' => (int) $r['id'],
            'rts_number' => $r['rts_number'],
            'supplier_id' => (int) $r['supplier_id'],
            'supplier_name' => $r['supplier_name'],
            'supplier_code' => $r['supplier_code'],
            'return_date' => $r['return_date'],
            'status' => $r['status'],
            'notes' => $r['notes'],
            'item_count' => (int) ($r['item_count'] ?? 0),
            'subtotal' => (float) $r['subtotal'],
            'vat_rate' => (float) $r['vat_rate'],
            'vat_amount' => (float) $r['vat_amount'],
            'total' => (float) $r['total'],
            'submitted_at' => $r['submitted_at'],
            'approved_at' => $r['approved_at'],
            'approval_notes' => $r['approval_notes'],
            'rejected_at' => $r['rejected_at'],
            'rejection_reason' => $r['rejection_reason'],
            'sent_at' => $r['sent_at'],
            'sent_date' => $r['sent_date'],
            'sent_via' => $r['sent_via'],
            'credit_memo_no' => $r['credit_memo_no'],
            'credit_memo_date' => $r['credit_memo_date'],
            'credit_amount' => (float) $r['credit_amount'],
            'credit_applied' => (float) $r['credit_applied'],
            'credit_available' => $r['status'] === 'credited' ? round((float) $r['credit_amount'] - (float) $r['credit_applied'], 2) : 0.0,
            'cancelled_at' => $r['cancelled_at'],
            'cancel_reason' => $r['cancel_reason'],
            'created_by_name' => $r['created_by_name'] ?? null,
            'created_at' => $r['created_at'],
            'can_edit' => in_array($r['status'], self::EDITABLE_STATUSES, true) && in_array($role, self::PREPARER_ROLES, true),
            'can_approve' => $viewer !== null && $this->approvalBlocker($r, $viewer) === null,
            'approval_blocker' => $r['status'] === 'pending_approval' ? $this->approvalBlocker($r, $viewer) : null,
            'can_send' => $r['status'] === 'approved' && in_array($role, self::PREPARER_ROLES, true),
            'can_credit' => $r['status'] === 'sent' && in_array($role, self::APPROVER_ROLES, true),
            'can_cancel' => in_array($r['status'], self::CANCELLABLE_STATUSES, true)
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
