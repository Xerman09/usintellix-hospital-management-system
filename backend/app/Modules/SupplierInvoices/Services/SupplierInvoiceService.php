<?php

namespace App\Modules\SupplierInvoices\Services;

use App\Core\Database;
use App\Modules\Procurement\Services\ApprovalLimitService;
use App\Modules\BusinessSettings\Services\BusinessSettingService;
use App\Modules\PurchaseOrders\Services\PurchaseOrderService;
use App\Modules\SupplierInvoices\Models\SupplierInvoice;
use App\Modules\SupplierInvoices\Models\SupplierInvoiceItem;
use PDO;
use Throwable;

/**
 * Supplier invoices and the 3-way match: before a supplier's bill is
 * approved for payment, every billed line is checked against what was
 * ordered (the purchase order line's net price, VAT treatment) and what
 * was received (the receiving reports the invoice covers).
 *
 *   draft --submit--> pending_approval --approve--> approved
 *                        |  ^                          |
 *                 reject |  | resubmit                 | cancel
 *                        v  |                          v
 *                      rejected  --cancel-->        cancelled
 *
 * One invoice bills one purchase order and one or more of its receiving
 * reports; a receiving report can be on only one invoice that isn't
 * cancelled, so nothing delivered is billed twice. Billed lines can be
 * order lines, items delivered that weren't on the order, or order lines
 * that were never delivered (always a variance).
 *
 * Per line, comparing in dispensing units so units and packages agree:
 *   not_received   -- billed, but nothing of it in the receipts
 *   qty_variance   -- billed more than was received
 *   price_variance -- net price more than PRICE_TOLERANCE_PERCENT over
 *                     the order's (or, for extras, the receiving cost)
 *   vat_mismatch   -- VAT treatment differs from the order line
 *   under_billed   -- billed less than received (fine; noted)
 *   matched
 * Delivery / other charges over what the order allowed are a variance
 * too. An invoice with any variance can still be approved, but only
 * with a written reason. As with purchase orders, the approver can't be
 * the person who recorded or submitted it.
 *
 * Approval makes the invoice owed (Accounts Payable): payment_status
 * becomes unpaid, and a blank due date is filled in from the payment
 * terms (see dueDateFromTerms). Payments (PayableService) then move it
 * to partially_paid / paid. An invoice with payments on it can't be
 * cancelled until they're voided.
 */
class SupplierInvoiceService
{
    public const STATUSES = ['draft', 'pending_approval', 'approved', 'rejected', 'cancelled'];

    public const EDITABLE_STATUSES = ['draft', 'rejected'];

    public const CANCELLABLE_STATUSES = ['pending_approval', 'approved', 'rejected'];

    /** Record and submit invoices: the buyers, plus accountants who key in the bills. */
    public const RECORDER_ROLES = ['admin', 'receptionist', 'doctor', 'accountant'];

    /** Approve invoices for payment (never ones they recorded or submitted). */
    public const APPROVER_ROLES = PurchaseOrderService::APPROVER_ROLES;

    /** Orders whose deliveries can be billed. */
    public const BILLABLE_PO_STATUSES = ['approved', 'partially_received', 'received', 'closed'];

    /** A billed net price up to this much over the expected price still matches. */
    public const PRICE_TOLERANCE_PERCENT = 1.0;

    public const INPUT_FIELDS = [
        'purchase_order_id', 'supplier_invoice_no', 'invoice_date', 'due_date', 'notes', 'other_charges',
        'receipt_ids', 'items', 'submit'
    ];

    private const EPSILON = 0.0005;

    /** Worst first: the line's status is the first of these that applies. */
    private const LINE_SEVERITY = ['not_received', 'qty_variance', 'price_variance', 'vat_mismatch', 'under_billed', 'matched'];

    private const VARIANCE_STATUSES = ['not_received', 'qty_variance', 'price_variance', 'vat_mismatch'];

    /* ---------------------------------------------------------------
     * Reading
     * ------------------------------------------------------------- */

    public function list(array $filters = [], ?array $viewer = null): array
    {
        $where = ['si.deleted_at IS NULL'];
        $params = [];

        if (!empty($filters['status']) && in_array($filters['status'], self::STATUSES, true)) {
            $where[] = 'si.status = :status';
            $params['status'] = $filters['status'];
        }

        foreach (['supplier_id' => 'si.supplier_id', 'purchase_order_id' => 'si.purchase_order_id'] as $key => $column) {
            if (!empty($filters[$key])) {
                $where[] = "{$column} = :{$key}";
                $params[$key] = (int) $filters[$key];
            }
        }

        $stmt = Database::connection()->prepare(
            "SELECT si.*, po.po_number, s.name AS supplier_name, s.code AS supplier_code,
                    " . self::userNameSql('si.created_by') . " AS created_by_name,
                    (SELECT GROUP_CONCAT(gr.gr_number ORDER BY gr.id SEPARATOR ', ')
                       FROM supplier_invoice_receipts sir JOIN goods_receipts gr ON gr.id = sir.goods_receipt_id
                      WHERE sir.supplier_invoice_id = si.id) AS receipt_numbers
             FROM supplier_invoices si
             JOIN purchase_orders po ON po.id = si.purchase_order_id
             JOIN suppliers s ON s.id = si.supplier_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY si.id DESC
             LIMIT 2000"
        );
        $stmt->execute($params);

        return array_map(fn(array $r) => $this->formatHeader($r, $viewer), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /** One invoice with its lines, receipts, history, and the parties (for printing). */
    public function get(int $id, ?array $viewer = null): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT si.*, po.po_number, po.order_date, po.payment_terms, po.status AS po_status,
                    s.name AS supplier_name, s.code AS supplier_code, s.tin AS supplier_tin,
                    s.address_line, s.city, s.province,
                    " . self::userNameSql('si.created_by') . " AS created_by_name,
                    " . self::userNameSql('si.submitted_by') . " AS submitted_by_name,
                    " . self::userNameSql('si.approved_by') . " AS approved_by_name,
                    " . self::userNameSql('si.first_approved_by') . " AS first_approved_by_name,
                    " . self::userNameSql('si.rejected_by') . " AS rejected_by_name,
                    " . self::userNameSql('si.cancelled_by') . " AS cancelled_by_name,
                    (SELECT GROUP_CONCAT(gr.gr_number ORDER BY gr.id SEPARATOR ', ')
                       FROM supplier_invoice_receipts sir JOIN goods_receipts gr ON gr.id = sir.goods_receipt_id
                      WHERE sir.supplier_invoice_id = si.id) AS receipt_numbers
             FROM supplier_invoices si
             JOIN purchase_orders po ON po.id = si.purchase_order_id
             JOIN suppliers s ON s.id = si.supplier_id
             WHERE si.id = :id AND si.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $invoice = $this->formatHeader($row, $viewer);

        foreach (['created_by', 'submitted_by', 'first_approved_by', 'approved_by', 'rejected_by', 'cancelled_by'] as $field) {
            $invoice["{$field}_name"] = $row["{$field}_name"];
        }

        $invoice['order_date'] = $row['order_date'];
        $invoice['payment_terms'] = $row['payment_terms'];
        $invoice['po_status'] = $row['po_status'];
        $invoice['supplier_tin'] = $row['supplier_tin'];
        $invoice['supplier_address'] = implode(', ', array_filter([$row['address_line'], $row['city'], $row['province']]));

        $stmt = $db->prepare(
            "SELECT gr.id, gr.gr_number, gr.received_date, gr.delivery_receipt_no, gr.invoice_no, gr.total_cost, gr.voided_at,
                    w.name AS warehouse_name
             FROM supplier_invoice_receipts sir
             JOIN goods_receipts gr ON gr.id = sir.goods_receipt_id
             LEFT JOIN warehouses w ON w.id = gr.warehouse_id
             WHERE sir.supplier_invoice_id = :id
             ORDER BY gr.id"
        );
        $stmt->execute(['id' => $id]);
        $invoice['receipts'] = array_map(fn(array $r) => [
            'id' => (int) $r['id'],
            'gr_number' => $r['gr_number'],
            'received_date' => $r['received_date'],
            'delivery_receipt_no' => $r['delivery_receipt_no'],
            'invoice_no' => $r['invoice_no'],
            'total_cost' => (float) $r['total_cost'],
            'warehouse_name' => $r['warehouse_name'],
            'voided_at' => $r['voided_at']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $stmt = $db->prepare(
            "SELECT i.*, poi.line_no AS po_line_no, d.name AS drug_name, du.name AS unit_name, pu.name AS package_unit_name
             FROM supplier_invoice_items i
             LEFT JOIN purchase_order_items poi ON poi.id = i.purchase_order_item_id
             JOIN drugs d ON d.id = i.drug_id
             LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
             LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
             WHERE i.supplier_invoice_id = :id
             ORDER BY i.line_no, i.id"
        );
        $stmt->execute(['id' => $id]);
        $invoice['items'] = array_map(fn(array $r) => [
            'id' => (int) $r['id'],
            'line_no' => (int) $r['line_no'],
            'purchase_order_item_id' => $r['purchase_order_item_id'] !== null ? (int) $r['purchase_order_item_id'] : null,
            'po_line_no' => $r['po_line_no'] !== null ? (int) $r['po_line_no'] : null,
            'on_order' => $r['purchase_order_item_id'] !== null,
            'drug_id' => (int) $r['drug_id'],
            'drug_name' => $r['drug_name'],
            'unit_name' => $r['unit_name'],
            'package_unit_name' => $r['package_unit_name'],
            'order_unit' => $r['order_unit'],
            'units_per_package' => $r['units_per_package'] !== null ? (float) $r['units_per_package'] : null,
            'quantity' => (float) $r['quantity'],
            'unit_price' => (float) $r['unit_price'],
            'discount_amount' => (float) $r['discount_amount'],
            'line_total' => (float) $r['line_total'],
            'vat_type' => $r['vat_type'],
            'vat_amount' => (float) $r['vat_amount'],
            'received_quantity' => (float) $r['received_quantity'],
            'expected_unit_price' => $r['expected_unit_price'] !== null ? (float) $r['expected_unit_price'] : null,
            'expected_vat_type' => $r['expected_vat_type'],
            'match_status' => $r['match_status'],
            'match_notes' => $r['match_notes'],
            'variance_amount' => (float) $r['variance_amount']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $stmt = $db->prepare(
            "SELECT p.id, p.pv_number, p.payment_date, p.method, p.reference_no, p.status,
                    a.amount_applied, a.ewt_rate, a.ewt_amount
             FROM supplier_payment_allocations a
             JOIN supplier_payments p ON p.id = a.supplier_payment_id
             WHERE a.supplier_invoice_id = :id
             ORDER BY p.payment_date, p.id"
        );
        $stmt->execute(['id' => $id]);
        $invoice['payments'] = array_map(fn(array $r) => [
            'id' => (int) $r['id'],
            'pv_number' => $r['pv_number'],
            'payment_date' => $r['payment_date'],
            'method' => $r['method'],
            'reference_no' => $r['reference_no'],
            'status' => $r['status'],
            'amount_applied' => (float) $r['amount_applied'],
            'ewt_rate' => (float) $r['ewt_rate'],
            'ewt_amount' => (float) $r['ewt_amount']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $stmt = $db->prepare(
            "SELECT h.id, h.action, h.notes, h.created_at, " . self::userNameSql('h.user_id') . " AS user_name
             FROM supplier_invoice_history h
             WHERE h.supplier_invoice_id = :id
             ORDER BY h.created_at, h.id"
        );
        $stmt->execute(['id' => $id]);
        $invoice['history'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $business = (new BusinessSettingService())->get();
        $invoice['buyer'] = [
            'name' => $business['name'] ?? null,
            'address' => $business['address'] ?? null,
            'phone' => $business['phone'] ?? null,
            'email' => $business['email'] ?? null
        ];

        return $invoice;
    }

    /**
     * Purchase orders with deliveries not yet billed (for "New Supplier
     * Invoice"), newest first.
     */
    public function billableOrders(): array
    {
        $placeholders = implode(', ', array_fill(0, count(self::BILLABLE_PO_STATUSES), '?'));

        $stmt = Database::connection()->prepare(
            "SELECT po.id, po.po_number, po.status, po.order_date, po.total, s.id AS supplier_id, s.name AS supplier_name,
                    COUNT(gr.id) AS unbilled_count, SUM(gr.total_cost) AS unbilled_cost, MAX(gr.received_date) AS last_received
             FROM purchase_orders po
             JOIN suppliers s ON s.id = po.supplier_id
             JOIN goods_receipts gr ON gr.purchase_order_id = po.id AND gr.voided_at IS NULL
             WHERE po.deleted_at IS NULL AND po.status IN ({$placeholders})
               AND NOT EXISTS (
                   SELECT 1 FROM supplier_invoice_receipts sir
                   JOIN supplier_invoices si ON si.id = sir.supplier_invoice_id
                   WHERE sir.goods_receipt_id = gr.id AND si.status <> 'cancelled' AND si.deleted_at IS NULL
               )
             GROUP BY po.id
             ORDER BY po.id DESC"
        );
        $stmt->execute(self::BILLABLE_PO_STATUSES);

        return array_map(fn(array $r) => [
            'id' => (int) $r['id'],
            'po_number' => $r['po_number'],
            'status' => $r['status'],
            'order_date' => $r['order_date'],
            'total' => (float) $r['total'],
            'supplier_id' => (int) $r['supplier_id'],
            'supplier_name' => $r['supplier_name'],
            'unbilled_count' => (int) $r['unbilled_count'],
            'unbilled_cost' => (float) $r['unbilled_cost'],
            'last_received' => $r['last_received']
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /**
     * Everything the invoice form needs for one order: its lines, the
     * deliveries that can go on this invoice (not voided, not on another
     * invoice) with what each received, and the delivery charges left to
     * bill.
     */
    public function orderForBilling(int $orderId, ?int $invoiceId = null): ?array
    {
        $order = (new PurchaseOrderService())->get($orderId);

        if (!$order) {
            return null;
        }

        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT gr.id, gr.gr_number, gr.received_date, gr.delivery_receipt_no, gr.invoice_no, gr.total_cost,
                    w.name AS warehouse_name
             FROM goods_receipts gr
             LEFT JOIN warehouses w ON w.id = gr.warehouse_id
             WHERE gr.purchase_order_id = :po AND gr.voided_at IS NULL
               AND NOT EXISTS (
                   SELECT 1 FROM supplier_invoice_receipts sir
                   JOIN supplier_invoices si ON si.id = sir.supplier_invoice_id
                   WHERE sir.goods_receipt_id = gr.id AND si.status <> 'cancelled' AND si.deleted_at IS NULL
                     AND si.id <> :invoice
               )
             ORDER BY gr.id"
        );
        $stmt->execute(['po' => $orderId, 'invoice' => $invoiceId ?? 0]);
        $receipts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $rows = [];
        if ($receipts) {
            $ids = array_column($receipts, 'id');
            $placeholders = implode(', ', array_fill(0, count($ids), '?'));
            $stmt = $db->prepare(
                "SELECT gri.goods_receipt_id, gri.purchase_order_item_id, gri.drug_id, gri.order_unit, gri.units_per_package,
                        gri.quantity, gri.base_quantity, gri.unit_cost, d.name AS drug_name, d.package_quantity,
                        du.name AS unit_name, pu.name AS package_unit_name
                 FROM goods_receipt_items gri
                 JOIN drugs d ON d.id = gri.drug_id
                 LEFT JOIN amount_units du ON du.id = d.dispensing_unit_id
                 LEFT JOIN amount_units pu ON pu.id = d.package_unit_id
                 WHERE gri.goods_receipt_id IN ({$placeholders}) AND gri.quantity > 0
                 ORDER BY gri.id"
            );
            $stmt->execute($ids);

            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
                $rows[(int) $r['goods_receipt_id']][] = [
                    'purchase_order_item_id' => $r['purchase_order_item_id'] !== null ? (int) $r['purchase_order_item_id'] : null,
                    'drug_id' => (int) $r['drug_id'],
                    'drug_name' => $r['drug_name'],
                    'unit_name' => $r['unit_name'],
                    'package_unit_name' => $r['package_unit_name'],
                    'package_quantity' => $r['package_quantity'] !== null && (float) $r['package_quantity'] > 0 ? (float) $r['package_quantity'] : null,
                    'order_unit' => $r['order_unit'] ?: 'unit',
                    'units_per_package' => $r['units_per_package'] !== null ? (float) $r['units_per_package'] : null,
                    'quantity' => (float) $r['quantity'],
                    'base_quantity' => (float) $r['base_quantity'],
                    'unit_cost' => $r['unit_cost'] !== null ? (float) $r['unit_cost'] : null
                ];
            }
        }

        return [
            'id' => $order['id'],
            'po_number' => $order['po_number'],
            'status' => $order['status'],
            'order_date' => $order['order_date'],
            'supplier_id' => $order['supplier_id'],
            'supplier_name' => $order['supplier_name'],
            'payment_terms' => $order['payment_terms'],
            'vat_rate' => $order['vat_rate'],
            'total' => $order['total'],
            'shipping_fee' => $order['shipping_fee'],
            'other_charges_billed' => $this->otherChargesBilled($orderId, $invoiceId),
            'items' => $order['items'],
            'receipts' => array_map(fn(array $r) => [
                'id' => (int) $r['id'],
                'gr_number' => $r['gr_number'],
                'received_date' => $r['received_date'],
                'delivery_receipt_no' => $r['delivery_receipt_no'],
                'invoice_no' => $r['invoice_no'],
                'total_cost' => (float) $r['total_cost'],
                'warehouse_name' => $r['warehouse_name'],
                'rows' => $rows[(int) $r['id']] ?? []
            ], $receipts),
            'billable' => in_array($order['status'], self::BILLABLE_PO_STATUSES, true),
            'vat_percent' => PurchaseOrderService::VAT_RATE,
            'price_tolerance_percent' => self::PRICE_TOLERANCE_PERCENT
        ];
    }

    /**
     * Run the 3-way match on unsaved form data (the form checks as you
     * type). The invoice number and dates don't affect the match, so
     * problems with them don't stop it.
     */
    public function preview(array $data, ?int $invoiceId = null): array
    {
        [$header, $lines, $receiptIds, $errors, $order] = $this->normalize($data, false, $invoiceId);

        $blocking = array_diff_key($errors, array_flip(['supplier_invoice_no', 'invoice_date', 'due_date']));

        if ($blocking || !$order) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $blocking ?: $errors];
        }

        $match = $this->match($order, $header, $lines, $receiptIds, $invoiceId);

        return ['success' => true, 'message' => 'Match checked.', 'data' => $match];
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
            return ['success' => false, 'message' => 'Supplier invoice not found.', 'not_found' => true];
        }

        if (!in_array($existing['status'], self::EDITABLE_STATUSES, true)) {
            return ['success' => false, 'message' => 'Only draft or rejected invoices can be changed.'];
        }

        return $this->save($existing, $data, $userId);
    }

    private function save(?array $existing, array $data, int $userId): array
    {
        $submit = !empty($data['submit']);
        $invoiceId = $existing ? (int) $existing['id'] : null;

        [$header, $lines, $receiptIds, $errors, $order] = $this->normalize($data, $submit, $invoiceId);

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $match = $this->match($order, $header, $lines, $receiptIds, $invoiceId);
        $now = date('Y-m-d H:i:s');
        $db = Database::connection();
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            $values = $header + [
                'supplier_id' => $order['supplier_id'],
                'match_status' => $match['match_status'],
                'subtotal' => $match['subtotal'],
                'discount_total' => $match['discount_total'],
                'vat_rate' => PurchaseOrderService::VAT_RATE,
                'vat_amount' => $match['vat_amount'],
                'total' => $match['total'],
                'variance_amount' => $match['variance_amount'],
                'variance_count' => $match['variance_count'],
                'match_notes' => $match['notes'] ? implode("\n", $match['notes']) : null
            ];

            if ($submit) {
                $values['status'] = 'pending_approval';
                $values['submitted_at'] = $now;
                $values['submitted_by'] = $userId;
                $values['rejected_at'] = null;
                $values['rejected_by'] = null;
                $values['rejection_reason'] = null;
            }

            if ($existing) {
                $id = (int) $existing['id'];
                (new SupplierInvoice())->update($values + ['updated_at' => $now, 'updated_by' => $userId], $id);
                $db->prepare("DELETE FROM supplier_invoice_items WHERE supplier_invoice_id = :id")->execute(['id' => $id]);
                $db->prepare("DELETE FROM supplier_invoice_receipts WHERE supplier_invoice_id = :id")->execute(['id' => $id]);
                $apNumber = $existing['ap_number'];
            } else {
                $id = (new SupplierInvoice())->create($values + [
                    'status' => $submit ? 'pending_approval' : 'draft',
                    'created_at' => $now,
                    'created_by' => $userId
                ]);

                if (!$id) {
                    throw new \RuntimeException('supplier invoice insert failed');
                }

                $apNumber = 'AP-' . date('Y') . '-' . str_pad((string) $id, 5, '0', STR_PAD_LEFT);
                (new SupplierInvoice())->update(['ap_number' => $apNumber], $id);
                $this->log($id, 'created', null, $userId, $now);
            }

            $link = $db->prepare("INSERT INTO supplier_invoice_receipts (supplier_invoice_id, goods_receipt_id) VALUES (:invoice, :receipt)");
            foreach ($receiptIds as $receiptId) {
                $link->execute(['invoice' => $id, 'receipt' => $receiptId]);
            }

            foreach ($match['lines'] as $i => $line) {
                $created = (new SupplierInvoiceItem())->create([
                    'supplier_invoice_id' => $id,
                    'line_no' => $i + 1,
                    'purchase_order_item_id' => $line['purchase_order_item_id'],
                    'drug_id' => $line['drug_id'],
                    'order_unit' => $line['order_unit'],
                    'units_per_package' => $line['units_per_package'],
                    'quantity' => $line['quantity'],
                    'unit_price' => $line['unit_price'],
                    'discount_amount' => $line['discount_amount'],
                    'line_total' => $line['line_total'],
                    'vat_type' => $line['vat_type'],
                    'vat_amount' => $line['vat_amount'],
                    'received_quantity' => $line['received_quantity'],
                    'expected_unit_price' => $line['expected_unit_price'],
                    'expected_vat_type' => $line['expected_vat_type'],
                    'match_status' => $line['match_status'],
                    'match_notes' => $line['match_notes'],
                    'variance_amount' => $line['variance_amount'],
                    'created_at' => $now
                ]);

                if (!$created) {
                    throw new \RuntimeException('supplier invoice line insert failed');
                }
            }

            if ($submit) {
                $this->log(
                    $id,
                    $existing && $existing['status'] === 'rejected' ? 'resubmitted' : 'submitted',
                    $match['variance_count']
                        ? "{$match['variance_count']} difference(s) from the order / deliveries, " . number_format($match['variance_amount'], 2)
                        : 'Matches the order and deliveries',
                    $userId,
                    $now
                );
            }

            if ($ownsTransaction) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }
            error_log('supplier invoice save failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to save the supplier invoice.'];
        }

        $message = !$submit
            ? "Supplier invoice {$apNumber} saved as a draft."
            : ($match['match_status'] === 'matched'
                ? "Supplier invoice {$apNumber} matches the order and deliveries, and was sent for approval."
                : "Supplier invoice {$apNumber} was sent for approval with {$match['variance_count']} difference(s) to review.");

        return [
            'success' => true,
            'message' => $message,
            'data' => ['id' => $id, 'ap_number' => $apNumber, 'match_status' => $match['match_status']]
        ];
    }

    /* ---------------------------------------------------------------
     * Approval
     * ------------------------------------------------------------- */

    /** Why $user can't approve/reject this invoice, or null if they can. */
    public function approvalBlocker(array $invoice, ?array $user): ?string
    {
        if (!$user || !in_array($user['role'] ?? null, self::APPROVER_ROLES, true)) {
            return 'Only an administrator or accountant can approve supplier invoices.';
        }

        if ($invoice['status'] !== 'pending_approval') {
            return 'This invoice is not waiting for approval.';
        }

        $userId = (int) ($user['id'] ?? 0);

        if ($userId === (int) $invoice['created_by'] || $userId === (int) $invoice['submitted_by']) {
            return 'You recorded or submitted this invoice, so someone else has to approve it.';
        }

        // Above the approval limit: after an accountant's first approval only an administrator can finish it.
        if (!empty($invoice['first_approved_by']) && ($user['role'] ?? null) !== ApprovalLimitService::FINAL_ROLE
            && (new ApprovalLimitService())->needsAdmin('supplier_invoice', (float) $invoice['total'])) {
            return 'Already approved at the first level. It is ' . (new ApprovalLimitService())->describe('supplier_invoice') . ', so an administrator gives the final approval.';
        }

        return null;
    }

    public function approve(int $id, string $notes, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Supplier invoice not found.', 'not_found' => true];
        }

        if ($blocker = $this->approvalBlocker($existing, $user)) {
            return ['success' => false, 'message' => $blocker];
        }

        $notes = mb_substr(trim($notes), 0, 500);

        if ($existing['match_status'] === 'variance' && $notes === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => [
                'notes' => 'This invoice doesn\'t match the order or deliveries. Explain why the difference is accepted.'
            ]];
        }

        $now = date('Y-m-d H:i:s');
        $userId = (int) $user['id'];
        $limits = new ApprovalLimitService();

        if ($limits->needsAdmin('supplier_invoice', (float) $existing['total']) && ($user['role'] ?? null) !== ApprovalLimitService::FINAL_ROLE) {
            $this->transition($id, [
                'first_approved_at' => $now,
                'first_approved_by' => $userId,
                'first_approval_notes' => $notes !== '' ? $notes : null
            ], 'first_approved', $notes, $userId, $now);

            return ['success' => true, 'message' => "Supplier invoice {$existing['ap_number']} approved at your level. It is "
                . $limits->describe('supplier_invoice') . ', so an administrator must also approve it.'];
        }

        $dueDate = $existing['due_date'] ?: $this->defaultDueDate($existing);

        $this->transition($id, [
            'status' => 'approved',
            'approved_at' => $now,
            'approved_by' => $userId,
            'approval_notes' => $notes !== '' ? $notes : null,
            'due_date' => $dueDate,
            'payment_status' => 'unpaid'
        ], 'approved', $notes, $userId, $now);

        return ['success' => true, 'message' => "Supplier invoice {$existing['ap_number']} approved for payment, due " . date('M j, Y', strtotime($dueDate)) . '.'];
    }

    public function reject(int $id, string $reason, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Supplier invoice not found.', 'not_found' => true];
        }

        if ($blocker = $this->approvalBlocker($existing, $user)) {
            return ['success' => false, 'message' => $blocker];
        }

        $reason = mb_substr(trim($reason), 0, 255);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => [
                'reason' => 'Say what has to be fixed (e.g. ask the supplier for a corrected invoice).'
            ]];
        }

        $now = date('Y-m-d H:i:s');
        $userId = (int) $user['id'];

        $this->transition($id, [
            'status' => 'rejected',
            'rejected_at' => $now,
            'rejected_by' => $userId,
            'rejection_reason' => $reason,
            // A resubmitted document starts its approvals over.
            'first_approved_at' => null,
            'first_approved_by' => null,
            'first_approval_notes' => null
        ], 'rejected', $reason, $userId, $now);

        return ['success' => true, 'message' => "Supplier invoice {$existing['ap_number']} rejected and sent back for correction."];
    }

    /** Frees its deliveries so they can be billed on another invoice. */
    public function cancel(int $id, string $reason, array $user): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Supplier invoice not found.', 'not_found' => true];
        }

        if (!in_array($existing['status'], self::CANCELLABLE_STATUSES, true)) {
            return ['success' => false, 'message' => $existing['status'] === 'cancelled'
                ? 'This invoice is already cancelled.'
                : 'Drafts are deleted, not cancelled.'];
        }

        if ((float) ($existing['amount_paid'] ?? 0) > 0) {
            return ['success' => false, 'message' => "{$existing['ap_number']} already has payments on it. Void those payments under Accounts Payable first."];
        }

        if ($existing['status'] === 'approved' && !in_array($user['role'] ?? null, self::APPROVER_ROLES, true)) {
            return ['success' => false, 'message' => 'Only an administrator or accountant can cancel an approved invoice.'];
        }

        $reason = mb_substr(trim($reason), 0, 255);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => [
                'reason' => 'Say why this invoice is being cancelled.'
            ]];
        }

        $now = date('Y-m-d H:i:s');
        $userId = (int) $user['id'];

        $this->transition($id, [
            'status' => 'cancelled',
            'cancelled_at' => $now,
            'cancelled_by' => $userId,
            'cancel_reason' => $reason,
            'payment_status' => null
        ], 'cancelled', $reason, $userId, $now);

        return ['success' => true, 'message' => "Supplier invoice {$existing['ap_number']} cancelled. Its deliveries can be billed again."];
    }

    /** Drafts only; anything submitted is cancelled instead so its record stays. */
    public function remove(int $id, int $userId): array
    {
        $existing = $this->find($id);

        if (!$existing) {
            return ['success' => false, 'message' => 'Supplier invoice not found.', 'not_found' => true];
        }

        if ($existing['status'] !== 'draft') {
            return ['success' => false, 'message' => 'Only drafts can be deleted. Cancel a submitted invoice instead.'];
        }

        $db = Database::connection();
        $db->prepare("DELETE FROM supplier_invoice_receipts WHERE supplier_invoice_id = :id")->execute(['id' => $id]);
        (new SupplierInvoice())->update(['deleted_at' => date('Y-m-d H:i:s'), 'deleted_by' => $userId], $id);

        return ['success' => true, 'message' => "Draft {$existing['ap_number']} deleted."];
    }

    /* ---------------------------------------------------------------
     * Validation + the 3-way match
     * ------------------------------------------------------------- */

    /**
     * @return array{0: array, 1: array, 2: int[], 3: array, 4: ?array}
     *         [header columns, lines, receipt ids, errors, order (from orderForBilling)]
     */
    private function normalize(array $data, bool $submit, ?int $invoiceId): array
    {
        $db = Database::connection();
        $errors = [];
        $header = [];

        $orderId = (int) ($data['purchase_order_id'] ?? 0);
        $order = $orderId ? $this->orderForBilling($orderId, $invoiceId) : null;

        if (!$order) {
            $errors['purchase_order_id'] = 'Choose the purchase order this invoice is for.';
            return [$header, [], [], $errors, null];
        }

        if (!$order['billable']) {
            $errors['purchase_order_id'] = "{$order['po_number']} can't be billed (it is {$order['status']}).";
            return [$header, [], [], $errors, $order];
        }

        $header['purchase_order_id'] = $orderId;

        // Supplier's invoice number, unique per supplier among invoices that aren't cancelled.
        $number = mb_substr(trim((string) ($data['supplier_invoice_no'] ?? '')), 0, 100);
        $header['supplier_invoice_no'] = $number;

        if ($number === '') {
            $errors['supplier_invoice_no'] = 'Enter the invoice number printed on the supplier\'s invoice.';
        } else {
            $stmt = $db->prepare(
                "SELECT ap_number FROM supplier_invoices
                 WHERE supplier_id = :supplier AND LOWER(TRIM(supplier_invoice_no)) = LOWER(:number)
                   AND status <> 'cancelled' AND deleted_at IS NULL AND id <> :id
                 LIMIT 1"
            );
            $stmt->execute(['supplier' => $order['supplier_id'], 'number' => $number, 'id' => $invoiceId ?? 0]);

            if ($duplicate = $stmt->fetchColumn()) {
                $errors['supplier_invoice_no'] = "This supplier's invoice {$number} is already recorded as {$duplicate}.";
            }
        }

        $invoiceDate = trim((string) ($data['invoice_date'] ?? ''));
        $header['invoice_date'] = $invoiceDate;

        if (!$this->isValidDate($invoiceDate)) {
            $errors['invoice_date'] = 'Enter the date on the supplier\'s invoice.';
        } elseif ($invoiceDate > date('Y-m-d')) {
            $errors['invoice_date'] = 'The invoice date can\'t be in the future.';
        } elseif ($invoiceDate < $order['order_date']) {
            $errors['invoice_date'] = "The invoice date is before the order date ({$order['order_date']}).";
        }

        $dueDate = trim((string) ($data['due_date'] ?? ''));
        $header['due_date'] = $dueDate === '' ? null : $dueDate;

        if ($header['due_date'] !== null) {
            if (!$this->isValidDate($header['due_date'])) {
                $errors['due_date'] = 'Enter a valid date.';
            } elseif (!isset($errors['invoice_date']) && $header['due_date'] < $invoiceDate) {
                $errors['due_date'] = 'The due date can\'t be before the invoice date.';
            }
        }

        $notes = trim((string) ($data['notes'] ?? ''));
        $header['notes'] = $notes === '' ? null : mb_substr($notes, 0, 2000);

        $rawCharges = $data['other_charges'] ?? '';
        $header['other_charges'] = is_numeric($rawCharges) ? round((float) $rawCharges, 2) : 0.0;

        if (($rawCharges !== '' && $rawCharges !== null && !is_numeric($rawCharges)) || $header['other_charges'] < 0) {
            $errors['other_charges'] = 'Enter zero or more.';
            $header['other_charges'] = 0.0;
        }

        // Deliveries billed
        $available = [];
        foreach ($order['receipts'] as $receipt) {
            $available[$receipt['id']] = $receipt;
        }

        $receiptIds = array_values(array_unique(array_map('intval', is_array($data['receipt_ids'] ?? null) ? $data['receipt_ids'] : [])));

        foreach ($receiptIds as $receiptId) {
            if (!isset($available[$receiptId])) {
                $errors['receipt_ids'] = 'One of the deliveries is voided, belongs to another order, or is already on another invoice. Reload and choose again.';
                break;
            }
        }

        if ($submit && !$receiptIds) {
            $errors['receipt_ids'] = 'Choose the deliveries (receiving reports) this invoice bills.';
        }

        // Billed lines
        $orderLines = [];
        foreach ($order['items'] as $item) {
            $orderLines[$item['id']] = $item;
        }

        $deliveredExtras = [];
        foreach ($receiptIds as $receiptId) {
            foreach ($available[$receiptId]['rows'] ?? [] as $row) {
                if ($row['purchase_order_item_id'] === null) {
                    $deliveredExtras[$row['drug_id']] = $row;
                }
            }
        }

        $items = is_array($data['items'] ?? null) ? array_values($data['items']) : [];
        $lines = [];
        $seen = [];

        foreach ($items as $i => $item) {
            $key = "items.{$i}";
            $item = is_array($item) ? $item : [];
            $lineId = (int) ($item['purchase_order_item_id'] ?? 0);

            if ($lineId) {
                $orderLine = $orderLines[$lineId] ?? null;

                if (!$orderLine) {
                    $errors["{$key}.quantity"] = 'This line is not on the purchase order.';
                    continue;
                }

                $seenKey = "L{$lineId}";
                $drugId = $orderLine['drug_id'];
                $orderUnit = $orderLine['order_unit'];
                $perPackage = $orderUnit === 'package' ? $orderLine['units_per_package'] : null;
            } else {
                $drugId = (int) ($item['drug_id'] ?? 0);
                $extra = $deliveredExtras[$drugId] ?? null;

                if (!$extra) {
                    $errors["{$key}.quantity"] = 'This item isn\'t on the order or in the chosen deliveries.';
                    continue;
                }

                $seenKey = "D{$drugId}";
                $orderUnit = ($item['order_unit'] ?? 'unit') === 'package' && $extra['package_quantity'] ? 'package' : 'unit';
                $perPackage = $orderUnit === 'package' ? $extra['package_quantity'] : null;
            }

            if (isset($seen[$seenKey])) {
                $errors["{$key}.quantity"] = 'This item is already on line ' . ($seen[$seenKey] + 1) . '.';
                continue;
            }
            $seen[$seenKey] = $i;

            $rawQty = $item['quantity'] ?? '';
            $quantity = is_numeric($rawQty) ? round((float) $rawQty, 3) : 0.0;

            if ($quantity <= 0) {
                $errors["{$key}.quantity"] = 'Enter the quantity billed.';
            }

            $rawPrice = $item['unit_price'] ?? '';
            $unitPrice = is_numeric($rawPrice) ? round((float) $rawPrice, 4) : -1.0;

            if ($unitPrice < 0) {
                $errors["{$key}.unit_price"] = 'Enter the price billed (before VAT).';
            }

            $rawDiscount = $item['discount_amount'] ?? '';
            $discount = ($rawDiscount === '' || $rawDiscount === null) ? 0.0 : (is_numeric($rawDiscount) ? round((float) $rawDiscount, 2) : -1.0);
            $gross = round(max(0, $quantity) * max(0, $unitPrice), 2);

            if ($discount < 0) {
                $errors["{$key}.discount_amount"] = 'Discount cannot be negative.';
            } elseif ($discount > $gross) {
                $errors["{$key}.discount_amount"] = 'Discount is more than the line amount.';
            }

            $vatType = (string) ($item['vat_type'] ?? '') ?: 'vatable';

            if (!in_array($vatType, PurchaseOrderService::VAT_TYPES, true)) {
                $errors["{$key}.vat_type"] = 'Choose VAT, VAT-exempt or zero-rated.';
                $vatType = 'vatable';
            }

            $lines[] = [
                'purchase_order_item_id' => $lineId ?: null,
                'drug_id' => $drugId,
                'order_unit' => $orderUnit,
                'units_per_package' => $perPackage,
                'quantity' => max(0, $quantity),
                'unit_price' => max(0, $unitPrice),
                'discount_amount' => max(0, min($discount, $gross)),
                'gross' => $gross,
                'line_total' => round($gross - max(0, min($discount, $gross)), 2),
                'vat_type' => $vatType
            ];
        }

        if ($submit && !$items) {
            $errors['items'] = 'Add the lines billed on the invoice.';
        }

        return [$header, $lines, $receiptIds, $errors, $order];
    }

    /**
     * The 3-way match. Returns the lines with their match result, the
     * invoice totals, and header-level notes (charges over the order,
     * things received but not billed).
     */
    private function match(array $order, array $header, array $lines, array $receiptIds, ?int $invoiceId): array
    {
        $rate = PurchaseOrderService::VAT_RATE;
        $tolerance = self::PRICE_TOLERANCE_PERCENT / 100;

        $orderLines = [];
        foreach ($order['items'] as $item) {
            $orderLines[$item['id']] = $item;
        }

        // What the chosen deliveries received, in dispensing units, per order line / extra item.
        $received = [];
        foreach ($order['receipts'] as $receipt) {
            if (!in_array($receipt['id'], $receiptIds, true)) {
                continue;
            }

            foreach ($receipt['rows'] as $row) {
                $key = $row['purchase_order_item_id'] !== null ? "L{$row['purchase_order_item_id']}" : "D{$row['drug_id']}";
                $received[$key] ??= ['base' => 0.0, 'cost' => 0.0, 'row' => $row];
                $received[$key]['base'] += $row['base_quantity'];
                $received[$key]['cost'] += ($row['unit_cost'] ?? 0) * $row['base_quantity'];
            }
        }

        $out = [];
        $billedKeys = [];
        $subtotal = 0.0;
        $discountTotal = 0.0;
        $vatTotal = 0.0;
        $varianceTotal = 0.0;
        $varianceCount = 0;

        foreach ($lines as $line) {
            $key = $line['purchase_order_item_id'] !== null ? "L{$line['purchase_order_item_id']}" : "D{$line['drug_id']}";
            $billedKeys[$key] = true;
            $orderLine = $line['purchase_order_item_id'] !== null ? $orderLines[$line['purchase_order_item_id']] : null;

            $per = $line['order_unit'] === 'package' && $line['units_per_package'] ? $line['units_per_package'] : 1.0;
            $billedBase = $line['quantity'] * $per;
            $receivedBase = $received[$key]['base'] ?? 0.0;

            // Expected net price per dispensing unit (VAT-exclusive).
            if ($orderLine) {
                $orderPer = $orderLine['order_unit'] === 'package' && $orderLine['units_per_package'] ? $orderLine['units_per_package'] : 1.0;
                $expectedPerBase = $orderLine['net_unit_price'] / $orderPer;
                $expectedVatType = $order['vat_rate'] > 0 ? $orderLine['vat_type'] : null;
            } else {
                $expectedPerBase = $receivedBase > 0 ? $received[$key]['cost'] / $receivedBase : null;
                $expectedVatType = null;
            }

            $lineVat = $line['vat_type'] === 'vatable' ? round($line['line_total'] * $rate / 100, 2) : 0.0;
            $billedPerBase = $billedBase > 0 ? $line['line_total'] / $billedBase : 0.0;

            $flags = [];
            $notes = [];
            $variance = 0.0;
            $unit = $this->unitName($line, $orderLine, $received[$key]['row'] ?? null);

            if ($receivedBase <= self::EPSILON) {
                $flags[] = 'not_received';
                $notes[] = 'Billed, but not in the chosen deliveries.';
                $variance += $line['line_total'] + $lineVat;
            } else {
                $allowedBase = min($billedBase, $receivedBase);

                if ($billedBase > $receivedBase + self::EPSILON) {
                    $flags[] = 'qty_variance';
                    $notes[] = 'Billed ' . $this->fmt($billedBase / $per) . ", received {$this->fmt($receivedBase / $per)} {$unit}.";
                } elseif ($billedBase + self::EPSILON < $receivedBase) {
                    $flags[] = 'under_billed';
                    $notes[] = 'Billed ' . $this->fmt($billedBase / $per) . " of {$this->fmt($receivedBase / $per)} {$unit} received.";
                }

                if ($expectedPerBase !== null) {
                    if ($billedPerBase > $expectedPerBase * (1 + $tolerance) + 0.00005) {
                        $flags[] = 'price_variance';
                        $notes[] = 'Net price ' . number_format($billedPerBase * $per, 2) . ' vs ' . number_format($expectedPerBase * $per, 2)
                            . ($orderLine ? ' on the order' : ' when received') . " per {$unit}.";
                    } elseif ($billedPerBase < $expectedPerBase * (1 - $tolerance) - 0.00005) {
                        $notes[] = 'Billed below the order price.';
                    }

                    // Overcharge on goods: the billed amount over what the received quantity should cost.
                    if (array_intersect($flags, ['qty_variance', 'price_variance'])) {
                        $variance += max(0, $line['line_total'] - $allowedBase * $expectedPerBase);
                    }
                }

                if ($expectedVatType !== null && $line['vat_type'] !== $expectedVatType) {
                    $flags[] = 'vat_mismatch';
                    $notes[] = 'VAT treatment is ' . $this->vatLabel($line['vat_type']) . ', the order says ' . $this->vatLabel($expectedVatType) . '.';
                    $expectedVat = $expectedVatType === 'vatable' ? round($line['line_total'] * $rate / 100, 2) : 0.0;
                    $variance += max(0, $lineVat - $expectedVat);
                }
            }

            $status = 'matched';
            foreach (self::LINE_SEVERITY as $candidate) {
                if (in_array($candidate, $flags, true)) {
                    $status = $candidate;
                    break;
                }
            }

            if (array_intersect($flags, self::VARIANCE_STATUSES)) {
                $varianceCount++;
            }

            $variance = round($variance, 2);
            $varianceTotal += $variance;
            $subtotal += $line['gross'];
            $discountTotal += $line['discount_amount'];
            $vatTotal += $lineVat;

            $out[] = [
                'purchase_order_item_id' => $line['purchase_order_item_id'],
                'drug_id' => $line['drug_id'],
                'order_unit' => $line['order_unit'],
                'units_per_package' => $line['units_per_package'],
                'quantity' => $line['quantity'],
                'unit_price' => $line['unit_price'],
                'discount_amount' => $line['discount_amount'],
                'line_total' => $line['line_total'],
                'vat_type' => $line['vat_type'],
                'vat_amount' => $lineVat,
                'received_quantity' => round($receivedBase / $per, 3),
                'expected_unit_price' => $expectedPerBase !== null ? round($expectedPerBase * $per, 4) : null,
                'expected_vat_type' => $expectedVatType,
                'match_status' => $status,
                'match_notes' => $notes ? mb_substr(implode(' ', $notes), 0, 500) : null,
                'variance_amount' => $variance
            ];
        }

        $headerNotes = [];

        // Delivery / other charges: no more than the order allowed, less what other invoices already billed.
        $chargesLeft = max(0, round($order['shipping_fee'] - $order['other_charges_billed'], 2));
        $charges = (float) ($header['other_charges'] ?? 0);

        if ($charges > $chargesLeft + max(0.01, $chargesLeft * $tolerance)) {
            $over = round($charges - $chargesLeft, 2);
            $headerNotes[] = 'Delivery / other charges are ' . number_format($over, 2) . ' more than the order allows ('
                . number_format($chargesLeft, 2) . ' left to bill).';
            $varianceTotal += $over;
            $varianceCount++;
        }

        // Received in the chosen deliveries but not on the invoice -- the supplier may bill it later.
        $unbilled = [];
        foreach ($received as $key => $info) {
            if (!isset($billedKeys[$key]) && $info['base'] > self::EPSILON) {
                $row = $info['row'];
                $per = $row['order_unit'] === 'package' && $row['units_per_package'] ? $row['units_per_package'] : 1.0;
                $unbilled[] = "{$row['drug_name']} ({$this->fmt($info['base'] / $per)} "
                    . ($row['order_unit'] === 'package' ? ($row['package_unit_name'] ?: 'package') : ($row['unit_name'] ?: 'unit')) . ')';
            }
        }

        if ($unbilled) {
            $headerNotes[] = 'Received but not billed on this invoice: ' . implode(', ', $unbilled) . '.';
        }

        $subtotal = round($subtotal, 2);
        $discountTotal = round($discountTotal, 2);
        $vatTotal = round($vatTotal, 2);

        return [
            'lines' => $out,
            'subtotal' => $subtotal,
            'discount_total' => $discountTotal,
            'vat_amount' => $vatTotal,
            'other_charges' => $charges,
            'total' => round($subtotal - $discountTotal + $vatTotal + $charges, 2),
            'variance_amount' => round($varianceTotal, 2),
            'variance_count' => $varianceCount,
            'match_status' => $varianceCount ? 'variance' : 'matched',
            'notes' => $headerNotes,
            'other_charges_left' => $chargesLeft
        ];
    }

    /* ---------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------- */

    /**
     * Due date for an approved invoice left without one: the order's
     * payment terms, else the supplier's, else the invoice date.
     */
    private function defaultDueDate(array $invoice): string
    {
        $stmt = Database::connection()->prepare(
            "SELECT po.payment_terms AS po_terms, s.payment_terms AS supplier_terms
             FROM purchase_orders po JOIN suppliers s ON s.id = po.supplier_id
             WHERE po.id = :id"
        );
        $stmt->execute(['id' => $invoice['purchase_order_id']]);
        $terms = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];

        return self::dueDateFromTerms($terms['po_terms'] ?? null, $invoice['invoice_date'])
            ?? self::dueDateFromTerms($terms['supplier_terms'] ?? null, $invoice['invoice_date'])
            ?? $invoice['invoice_date'];
    }

    /**
     * "Net 30" / "30 days" -> invoice date + 30 days; cash / COD /
     * consignment terms -> the invoice date. Null when the terms don't
     * say (so the next source can be tried).
     */
    public static function dueDateFromTerms(?string $terms, string $invoiceDate): ?string
    {
        $terms = trim((string) $terms);

        if ($terms === '') {
            return null;
        }

        if (preg_match('/(?:net\s*(\d+))|(\d+)\s*(?:days?|d\b)/i', $terms, $m)) {
            $days = (int) ($m[1] !== '' ? $m[1] : $m[2]);
            return date('Y-m-d', strtotime("{$invoiceDate} +{$days} days"));
        }

        if (preg_match('/cash|cod|c\.o\.d|advance|consign/i', $terms)) {
            return $invoiceDate;
        }

        return null;
    }

    /** Delivery / other charges already on this order's other invoices that aren't cancelled. */
    private function otherChargesBilled(int $orderId, ?int $invoiceId): float
    {
        $stmt = Database::connection()->prepare(
            "SELECT COALESCE(SUM(other_charges), 0) FROM supplier_invoices
             WHERE purchase_order_id = :po AND status <> 'cancelled' AND deleted_at IS NULL AND id <> :id"
        );
        $stmt->execute(['po' => $orderId, 'id' => $invoiceId ?? 0]);

        return round((float) $stmt->fetchColumn(), 2);
    }

    private function find(int $id): ?array
    {
        $invoice = $id ? (new SupplierInvoice())->where('id', $id)->first() : null;

        return $invoice && $invoice['deleted_at'] === null ? $invoice : null;
    }

    /** Status change + its history entry, together. */
    private function transition(int $id, array $values, string $action, ?string $notes, int $userId, string $now): void
    {
        $db = Database::connection();
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            (new SupplierInvoice())->update($values + ['updated_at' => $now, 'updated_by' => $userId], $id);
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

    private function log(int $invoiceId, string $action, ?string $notes, int $userId, string $now): void
    {
        Database::connection()->prepare(
            "INSERT INTO supplier_invoice_history (supplier_invoice_id, action, notes, user_id, created_at)
             VALUES (:invoice, :action, :notes, :user, :created)"
        )->execute([
            'invoice' => $invoiceId,
            'action' => $action,
            'notes' => $notes !== null && $notes !== '' ? mb_substr($notes, 0, 500) : null,
            'user' => $userId,
            'created' => $now
        ]);
    }

    private function formatHeader(array $r, ?array $viewer): array
    {
        return [
            'id' => (int) $r['id'],
            'ap_number' => $r['ap_number'],
            'supplier_id' => (int) $r['supplier_id'],
            'supplier_name' => $r['supplier_name'],
            'supplier_code' => $r['supplier_code'],
            'purchase_order_id' => (int) $r['purchase_order_id'],
            'po_number' => $r['po_number'],
            'supplier_invoice_no' => $r['supplier_invoice_no'],
            'invoice_date' => $r['invoice_date'],
            'due_date' => $r['due_date'],
            'status' => $r['status'],
            'match_status' => $r['match_status'],
            'subtotal' => (float) $r['subtotal'],
            'discount_total' => (float) $r['discount_total'],
            'vat_rate' => (float) $r['vat_rate'],
            'vat_amount' => (float) $r['vat_amount'],
            'other_charges' => (float) $r['other_charges'],
            'total' => (float) $r['total'],
            'variance_amount' => (float) $r['variance_amount'],
            'variance_count' => (int) $r['variance_count'],
            'amount_paid' => (float) ($r['amount_paid'] ?? 0),
            'balance' => $r['status'] === 'approved' ? round((float) $r['total'] - (float) ($r['amount_paid'] ?? 0), 2) : null,
            'payment_status' => $r['payment_status'] ?? null,
            'paid_at' => $r['paid_at'] ?? null,
            'is_overdue' => $r['status'] === 'approved' && ($r['payment_status'] ?? null) !== 'paid'
                && $r['due_date'] !== null && $r['due_date'] < date('Y-m-d'),
            'match_notes' => $r['match_notes'] !== null && $r['match_notes'] !== '' ? explode("\n", $r['match_notes']) : [],
            'notes' => $r['notes'],
            'receipt_numbers' => $r['receipt_numbers'] ?? null,
            'created_by_name' => $r['created_by_name'] ?? null,
            'submitted_at' => $r['submitted_at'],
            'approved_at' => $r['approved_at'],
            'approval_notes' => $r['approval_notes'],
            'rejected_at' => $r['rejected_at'],
            'rejection_reason' => $r['rejection_reason'],
            'cancelled_at' => $r['cancelled_at'],
            'cancel_reason' => $r['cancel_reason'],
            'created_at' => $r['created_at'],
            'can_edit' => in_array($r['status'], self::EDITABLE_STATUSES, true),
            'can_approve' => $viewer !== null && $this->approvalBlocker($r, $viewer) === null,
            'approval_blocker' => $r['status'] === 'pending_approval' ? $this->approvalBlocker($r, $viewer) : null,
            // Approval limit: above it an administrator must also approve.
            'approval_limit' => (new ApprovalLimitService())->limitFor('supplier_invoice'),
            'needs_admin_approval' => (new ApprovalLimitService())->needsAdmin('supplier_invoice', (float) $r['total']),
            'first_approved_at' => $r['first_approved_at'] ?? null,
            'first_approved_by' => !empty($r['first_approved_by']) ? (int) $r['first_approved_by'] : null,
            'first_approval_notes' => $r['first_approval_notes'] ?? null,
            'can_cancel' => in_array($r['status'], self::CANCELLABLE_STATUSES, true)
                && (float) ($r['amount_paid'] ?? 0) <= 0
                && ($r['status'] !== 'approved' || in_array($viewer['role'] ?? null, self::APPROVER_ROLES, true))
        ];
    }

    private function unitName(array $line, ?array $orderLine, ?array $receivedRow): string
    {
        $names = $orderLine ?? $receivedRow ?? [];

        return $line['order_unit'] === 'package'
            ? ($names['package_unit_name'] ?? null ?: 'package')
            : ($names['unit_name'] ?? null ?: 'unit');
    }

    private function vatLabel(string $type): string
    {
        return ['vatable' => 'VAT', 'exempt' => 'VAT-exempt', 'zero_rated' => 'zero-rated'][$type] ?? $type;
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
