<?php

namespace App\Modules\Payables\Services;

use App\Core\Database;
use App\Modules\BusinessSettings\Services\BusinessSettingService;
use App\Modules\SupplierInvoices\Models\SupplierInvoice;
use PDO;
use Throwable;

/**
 * Accounts payable: what the hospital owes its suppliers, and paying it.
 *
 * An approved supplier invoice (Pharmacy > Supplier Invoices) is owed
 * from approval until its balance (total - amount_paid) is zero. A
 * payment (PV-YYYY-NNNNN) is one disbursement to one supplier that can
 * settle several of its invoices, fully or in part:
 *
 *   amount applied to an invoice = cash paid + expanded withholding tax
 *
 * EWT is optional (rate 0 = none). It's computed on the VAT-exclusive
 * part of what's applied, so a fully paid ₱1,120 invoice (₱1,000 + ₱120
 * VAT) at 1% withholds ₱10.00 and pays ₱1,110.00 in cash.
 *
 * Payments are never edited or deleted. One entered by mistake is
 * voided, which puts the amounts back on its invoices.
 *
 * Aging buckets a balance by how far past its due date it is, as of a
 * date: Current (not due yet), 1-30, 31-60, 61-90 and over 90 days.
 */
class PayableService
{
    /** Accounts payable is the accountants' (and admins') area. */
    public const ROLES = ['admin', 'accountant'];

    public const METHODS = ['check', 'bank_transfer', 'cash', 'other'];

    /** Common BIR expanded withholding tax rates (1% goods, 2% services...). */
    public const EWT_RATES = [0, 1, 2, 5, 10, 15];

    public const AGING_BUCKETS = ['current', 'd1_30', 'd31_60', 'd61_90', 'd90_plus'];

    private const EPSILON = 0.005;

    /* ---------------------------------------------------------------
     * Owed
     * ------------------------------------------------------------- */

    /** The numbers for the top of the Accounts Payable screen. */
    public function summary(): array
    {
        $today = date('Y-m-d');
        $weekEnd = date('Y-m-d', strtotime('+7 days'));

        $stmt = Database::connection()->prepare(
            "SELECT COUNT(*) AS open_count,
                    COALESCE(SUM(total - amount_paid), 0) AS total_payable,
                    COALESCE(SUM(CASE WHEN due_date < :today1 THEN total - amount_paid END), 0) AS overdue_amount,
                    COALESCE(SUM(CASE WHEN due_date < :today2 THEN 1 END), 0) AS overdue_count,
                    COALESCE(SUM(CASE WHEN due_date BETWEEN :today3 AND :week1 THEN total - amount_paid END), 0) AS due_week_amount,
                    COALESCE(SUM(CASE WHEN due_date BETWEEN :today4 AND :week2 THEN 1 END), 0) AS due_week_count
             FROM supplier_invoices
             WHERE status = 'approved' AND deleted_at IS NULL AND total - amount_paid > " . self::EPSILON
        );
        $stmt->execute(['today1' => $today, 'today2' => $today, 'today3' => $today, 'today4' => $today, 'week1' => $weekEnd, 'week2' => $weekEnd]);
        $owed = $stmt->fetch(PDO::FETCH_ASSOC);

        $stmt = Database::connection()->prepare(
            "SELECT COALESCE(SUM(amount_paid), 0) FROM supplier_payments
             WHERE status = 'posted' AND payment_date >= :start"
        );
        $stmt->execute(['start' => date('Y-m-01')]);

        return [
            'open_count' => (int) $owed['open_count'],
            'total_payable' => round((float) $owed['total_payable'], 2),
            'overdue_amount' => round((float) $owed['overdue_amount'], 2),
            'overdue_count' => (int) $owed['overdue_count'],
            'due_week_amount' => round((float) $owed['due_week_amount'], 2),
            'due_week_count' => (int) $owed['due_week_count'],
            'paid_this_month' => round((float) $stmt->fetchColumn(), 2)
        ];
    }

    /** Approved invoices with a balance, soonest due first. Filters: supplier_id? */
    public function openBills(array $filters = []): array
    {
        $where = ["si.status = 'approved'", 'si.deleted_at IS NULL', 'si.total - si.amount_paid > ' . self::EPSILON];
        $params = [];

        if (!empty($filters['supplier_id'])) {
            $where[] = 'si.supplier_id = :supplier';
            $params['supplier'] = (int) $filters['supplier_id'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT si.id, si.ap_number, si.supplier_invoice_no, si.invoice_date, si.due_date, si.total, si.vat_amount,
                    si.amount_paid, si.payment_status, si.match_status, si.supplier_id, si.purchase_order_id,
                    s.name AS supplier_name, s.code AS supplier_code, s.tin AS supplier_tin, s.payment_terms, po.po_number
             FROM supplier_invoices si
             JOIN suppliers s ON s.id = si.supplier_id
             JOIN purchase_orders po ON po.id = si.purchase_order_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY si.due_date IS NULL, si.due_date, si.id"
        );
        $stmt->execute($params);

        return array_map(fn(array $r) => $this->formatBill($r, date('Y-m-d')), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /* ---------------------------------------------------------------
     * Payments
     * ------------------------------------------------------------- */

    /** Filters: supplier_id?, status? */
    public function payments(array $filters = []): array
    {
        $where = ['1 = 1'];
        $params = [];

        if (!empty($filters['supplier_id'])) {
            $where[] = 'p.supplier_id = :supplier';
            $params['supplier'] = (int) $filters['supplier_id'];
        }

        if (!empty($filters['status']) && in_array($filters['status'], ['posted', 'voided'], true)) {
            $where[] = 'p.status = :status';
            $params['status'] = $filters['status'];
        }

        $stmt = Database::connection()->prepare(
            "SELECT p.*, s.name AS supplier_name, s.code AS supplier_code,
                    " . self::userNameSql('p.created_by') . " AS created_by_name,
                    (SELECT GROUP_CONCAT(si.ap_number ORDER BY si.id SEPARATOR ', ')
                       FROM supplier_payment_allocations a JOIN supplier_invoices si ON si.id = a.supplier_invoice_id
                      WHERE a.supplier_payment_id = p.id) AS invoice_numbers
             FROM supplier_payments p
             JOIN suppliers s ON s.id = p.supplier_id
             WHERE " . implode(' AND ', $where) . "
             ORDER BY p.payment_date DESC, p.id DESC
             LIMIT 2000"
        );
        $stmt->execute($params);

        return array_map(fn(array $r) => $this->formatPayment($r), $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    public function payment(int $id): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT p.*, s.name AS supplier_name, s.code AS supplier_code, s.tin AS supplier_tin,
                    s.address_line, s.city, s.province,
                    " . self::userNameSql('p.created_by') . " AS created_by_name,
                    " . self::userNameSql('p.voided_by') . " AS voided_by_name,
                    (SELECT GROUP_CONCAT(si.ap_number ORDER BY si.id SEPARATOR ', ')
                       FROM supplier_payment_allocations a JOIN supplier_invoices si ON si.id = a.supplier_invoice_id
                      WHERE a.supplier_payment_id = p.id) AS invoice_numbers
             FROM supplier_payments p
             JOIN suppliers s ON s.id = p.supplier_id
             WHERE p.id = :id"
        );
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        $payment = $this->formatPayment($row);
        $payment['supplier_tin'] = $row['supplier_tin'];
        $payment['supplier_address'] = implode(', ', array_filter([$row['address_line'], $row['city'], $row['province']]));
        $payment['voided_by_name'] = $row['voided_by_name'];

        $stmt = $db->prepare(
            "SELECT a.*, si.ap_number, si.supplier_invoice_no, si.invoice_date, si.due_date, si.total, si.amount_paid AS invoice_paid,
                    po.po_number
             FROM supplier_payment_allocations a
             JOIN supplier_invoices si ON si.id = a.supplier_invoice_id
             JOIN purchase_orders po ON po.id = si.purchase_order_id
             WHERE a.supplier_payment_id = :id
             ORDER BY a.id"
        );
        $stmt->execute(['id' => $id]);
        $payment['allocations'] = array_map(fn(array $r) => [
            'supplier_invoice_id' => (int) $r['supplier_invoice_id'],
            'ap_number' => $r['ap_number'],
            'supplier_invoice_no' => $r['supplier_invoice_no'],
            'po_number' => $r['po_number'],
            'invoice_date' => $r['invoice_date'],
            'due_date' => $r['due_date'],
            'invoice_total' => (float) $r['total'],
            'invoice_balance' => round((float) $r['total'] - (float) $r['invoice_paid'], 2),
            'amount_applied' => (float) $r['amount_applied'],
            'ewt_rate' => (float) $r['ewt_rate'],
            'ewt_base' => (float) $r['ewt_base'],
            'ewt_amount' => (float) $r['ewt_amount'],
            'cash' => round((float) $r['amount_applied'] - (float) $r['ewt_amount'], 2)
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $business = (new BusinessSettingService())->get();
        $payment['buyer'] = [
            'name' => $business['name'] ?? null,
            'address' => $business['address'] ?? null,
            'phone' => $business['phone'] ?? null,
            'email' => $business['email'] ?? null
        ];

        return $payment;
    }

    /**
     * Pays one supplier. Body: supplier_id, payment_date, method,
     * reference_no (check / transfer no.), check_date?, paid_from?,
     * ewt_rate?, notes?, allocations: [{ supplier_invoice_id, amount }].
     */
    public function record(array $data, int $userId): array
    {
        $db = Database::connection();
        $errors = [];

        $supplierId = (int) ($data['supplier_id'] ?? 0);
        $stmt = $db->prepare("SELECT id, name FROM suppliers WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $supplierId]);
        $supplier = $supplierId ? $stmt->fetch(PDO::FETCH_ASSOC) : false;

        if (!$supplier) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['supplier_id' => 'Choose the supplier being paid.']];
        }

        $paymentDate = trim((string) ($data['payment_date'] ?? ''));

        if (!$this->isValidDate($paymentDate)) {
            $errors['payment_date'] = 'Enter the payment date.';
        } elseif ($paymentDate > date('Y-m-d')) {
            $errors['payment_date'] = 'The payment date can\'t be in the future.';
        }

        $method = (string) ($data['method'] ?? '');

        if (!in_array($method, self::METHODS, true)) {
            $errors['method'] = 'Choose how it was paid.';
        }

        $reference = mb_substr(trim((string) ($data['reference_no'] ?? '')), 0, 100);

        if ($reference === '' && in_array($method, ['check', 'bank_transfer'], true)) {
            $errors['reference_no'] = $method === 'check' ? 'Enter the check number.' : 'Enter the transfer reference number.';
        }

        $checkDate = trim((string) ($data['check_date'] ?? ''));
        $checkDate = $method === 'check' && $checkDate !== '' ? $checkDate : null;

        if ($checkDate !== null && !$this->isValidDate($checkDate)) {
            $errors['check_date'] = 'Enter a valid date.';
        }

        $paidFrom = mb_substr(trim((string) ($data['paid_from'] ?? '')), 0, 150);
        $notes = trim((string) ($data['notes'] ?? ''));

        $rawRate = $data['ewt_rate'] ?? 0;
        $ewtRate = is_numeric($rawRate) ? (float) $rawRate : -1;

        if (!in_array($ewtRate, array_map('floatval', self::EWT_RATES), true)) {
            $errors['ewt_rate'] = 'Choose a withholding tax rate.';
            $ewtRate = 0.0;
        }

        $rows = is_array($data['allocations'] ?? null) ? array_values($data['allocations']) : [];
        $wanted = [];

        foreach ($rows as $i => $row) {
            $invoiceId = (int) ($row['supplier_invoice_id'] ?? 0);
            $raw = $row['amount'] ?? '';

            if ($raw === '' || $raw === null || (is_numeric($raw) && (float) $raw == 0)) {
                continue; // invoice listed but not being paid now
            }

            if (!is_numeric($raw) || (float) $raw < 0) {
                $errors["allocations.{$i}.amount"] = 'Enter an amount greater than zero.';
                continue;
            }

            if (isset($wanted[$invoiceId])) {
                $errors["allocations.{$i}.amount"] = 'This invoice is listed twice.';
                continue;
            }

            $wanted[$invoiceId] = ['index' => $i, 'amount' => round((float) $raw, 2)];
        }

        if (!$wanted && !$errors) {
            $errors['allocations'] = 'Enter how much is paid on at least one invoice.';
        }

        if ($errors) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $now = date('Y-m-d H:i:s');
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        } else {
            $db->exec('SAVEPOINT supplier_payment');
        }

        $undo = function () use ($db, $ownsTransaction) {
            if ($ownsTransaction) {
                $db->rollBack();
            } else {
                $db->exec('ROLLBACK TO SAVEPOINT supplier_payment');
            }
        };

        try {
            // Lock the invoices so two payments can't both take the same balance.
            $placeholders = implode(', ', array_fill(0, count($wanted), '?'));
            $stmt = $db->prepare(
                "SELECT id, ap_number, supplier_id, status, total, vat_amount, amount_paid, invoice_date
                 FROM supplier_invoices WHERE id IN ({$placeholders}) AND deleted_at IS NULL FOR UPDATE"
            );
            $stmt->execute(array_keys($wanted));
            $invoices = [];
            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $invoice) {
                $invoices[(int) $invoice['id']] = $invoice;
            }

            $lines = [];
            foreach ($wanted as $invoiceId => $want) {
                $key = "allocations.{$want['index']}.amount";
                $invoice = $invoices[$invoiceId] ?? null;

                if (!$invoice || (int) $invoice['supplier_id'] !== $supplierId) {
                    $errors[$key] = 'This invoice isn\'t one of this supplier\'s.';
                    continue;
                }

                if ($invoice['status'] !== 'approved') {
                    $errors[$key] = "{$invoice['ap_number']} isn't approved for payment.";
                    continue;
                }

                $balance = round((float) $invoice['total'] - (float) $invoice['amount_paid'], 2);

                if ($want['amount'] > $balance + self::EPSILON) {
                    $errors[$key] = 'More than the balance of ' . number_format($balance, 2) . '.';
                    continue;
                }

                if (!isset($errors['payment_date']) && $paymentDate < $invoice['invoice_date']) {
                    $errors['payment_date'] = "The payment date is before {$invoice['ap_number']}'s invoice date ({$invoice['invoice_date']}).";
                }

                // EWT on the VAT-exclusive share of what's applied.
                $total = (float) $invoice['total'];
                $base = $total > 0 ? round($want['amount'] * ($total - (float) $invoice['vat_amount']) / $total, 2) : 0.0;
                $ewt = round($base * $ewtRate / 100, 2);

                $lines[] = [
                    'invoice' => $invoice,
                    'amount' => $want['amount'],
                    'base' => $ewtRate > 0 ? $base : 0.0,
                    'ewt' => $ewt,
                    'settles' => $want['amount'] >= $balance - self::EPSILON
                ];
            }

            if ($errors) {
                $undo();
                return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
            }

            $totalApplied = round(array_sum(array_column($lines, 'amount')), 2);
            $totalEwt = round(array_sum(array_column($lines, 'ewt')), 2);

            $db->prepare(
                "INSERT INTO supplier_payments (supplier_id, payment_date, method, reference_no, check_date, paid_from, ewt_rate,
                                                total_applied, ewt_amount, amount_paid, notes, status, created_at, created_by)
                 VALUES (:supplier, :date, :method, :reference, :check_date, :paid_from, :rate,
                         :applied, :ewt, :paid, :notes, 'posted', :now, :user)"
            )->execute([
                'supplier' => $supplierId,
                'date' => $paymentDate,
                'method' => $method,
                'reference' => $reference !== '' ? $reference : null,
                'check_date' => $checkDate,
                'paid_from' => $paidFrom !== '' ? $paidFrom : null,
                'rate' => $ewtRate,
                'applied' => $totalApplied,
                'ewt' => $totalEwt,
                'paid' => round($totalApplied - $totalEwt, 2),
                'notes' => $notes !== '' ? mb_substr($notes, 0, 2000) : null,
                'now' => $now,
                'user' => $userId
            ]);
            $paymentId = (int) $db->lastInsertId();
            $pvNumber = 'PV-' . date('Y') . '-' . str_pad((string) $paymentId, 5, '0', STR_PAD_LEFT);
            $db->prepare("UPDATE supplier_payments SET pv_number = :pv WHERE id = :id")->execute(['pv' => $pvNumber, 'id' => $paymentId]);

            $allocate = $db->prepare(
                "INSERT INTO supplier_payment_allocations (supplier_payment_id, supplier_invoice_id, amount_applied, ewt_rate, ewt_base, ewt_amount, created_at)
                 VALUES (:payment, :invoice, :amount, :rate, :base, :ewt, :now)"
            );

            foreach ($lines as $line) {
                $invoice = $line['invoice'];
                $allocate->execute([
                    'payment' => $paymentId,
                    'invoice' => $invoice['id'],
                    'amount' => $line['amount'],
                    'rate' => $ewtRate,
                    'base' => $line['base'],
                    'ewt' => $line['ewt'],
                    'now' => $now
                ]);

                $paid = round((float) $invoice['amount_paid'] + $line['amount'], 2);
                (new SupplierInvoice())->update([
                    'amount_paid' => $line['settles'] ? (float) $invoice['total'] : $paid,
                    'payment_status' => $line['settles'] ? 'paid' : 'partially_paid',
                    'paid_at' => $line['settles'] ? $now : null,
                    'updated_at' => $now,
                    'updated_by' => $userId
                ], (int) $invoice['id']);

                $this->logInvoice(
                    (int) $invoice['id'],
                    $line['settles'] ? 'paid' : 'partially_paid',
                    "{$pvNumber}: " . number_format($line['amount'], 2)
                        . ($line['ewt'] > 0 ? ' (incl. ' . number_format($line['ewt'], 2) . ' EWT withheld)' : ''),
                    $userId,
                    $now
                );
            }

            if ($ownsTransaction) {
                $db->commit();
            } else {
                $db->exec('RELEASE SAVEPOINT supplier_payment');
            }
        } catch (Throwable $e) {
            $undo();
            error_log('supplier payment failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to record the payment. Nothing was saved.'];
        }

        return [
            'success' => true,
            'message' => "{$pvNumber} recorded: " . number_format($totalApplied - $totalEwt, 2) . " paid to {$supplier['name']}"
                . ($totalEwt > 0 ? ', ' . number_format($totalEwt, 2) . ' withheld' : '') . '.',
            'data' => ['id' => $paymentId, 'pv_number' => $pvNumber]
        ];
    }

    /** Reverses a payment entered by mistake; its amounts go back on the invoices. */
    public function void(int $id, string $reason, int $userId): array
    {
        $db = Database::connection();
        $payment = $this->payment($id);

        if (!$payment) {
            return ['success' => false, 'message' => 'Payment not found.', 'not_found' => true];
        }

        if ($payment['status'] === 'voided') {
            return ['success' => false, 'message' => "{$payment['pv_number']} is already voided."];
        }

        $reason = mb_substr(trim($reason), 0, 255);

        if ($reason === '') {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => [
                'reason' => 'Say why this payment is being voided (e.g. check cancelled, wrong supplier).'
            ]];
        }

        $now = date('Y-m-d H:i:s');
        $ownsTransaction = !$db->inTransaction();

        if ($ownsTransaction) {
            $db->beginTransaction();
        }

        try {
            foreach ($payment['allocations'] as $allocation) {
                $stmt = $db->prepare("SELECT total, amount_paid FROM supplier_invoices WHERE id = :id FOR UPDATE");
                $stmt->execute(['id' => $allocation['supplier_invoice_id']]);
                $invoice = $stmt->fetch(PDO::FETCH_ASSOC);

                $paid = max(0, round((float) $invoice['amount_paid'] - $allocation['amount_applied'], 2));

                (new SupplierInvoice())->update([
                    'amount_paid' => $paid,
                    'payment_status' => $paid <= self::EPSILON ? 'unpaid' : 'partially_paid',
                    'paid_at' => null,
                    'updated_at' => $now,
                    'updated_by' => $userId
                ], $allocation['supplier_invoice_id']);

                $this->logInvoice(
                    $allocation['supplier_invoice_id'],
                    'payment_voided',
                    "{$payment['pv_number']}: " . number_format($allocation['amount_applied'], 2) . " back on the balance. {$reason}",
                    $userId,
                    $now
                );
            }

            $db->prepare(
                "UPDATE supplier_payments SET status = 'voided', voided_at = :now, voided_by = :user, void_reason = :reason WHERE id = :id"
            )->execute(['now' => $now, 'user' => $userId, 'reason' => $reason, 'id' => $id]);

            if ($ownsTransaction) {
                $db->commit();
            }
        } catch (Throwable $e) {
            if ($ownsTransaction) {
                $db->rollBack();
            }
            error_log('supplier payment void failed: ' . $e->getMessage());
            return ['success' => false, 'message' => 'Failed to void the payment. Nothing was changed.'];
        }

        return ['success' => true, 'message' => "{$payment['pv_number']} voided. Its amounts are back on the invoices' balances."];
    }

    /* ---------------------------------------------------------------
     * Reports
     * ------------------------------------------------------------- */

    /**
     * AP aging as of a date: each approved invoice's balance on that date
     * (payments dated on or before it), bucketed by days past due, and
     * totalled per supplier.
     */
    public function aging(?string $asOf = null): array
    {
        $asOf = $asOf && $this->isValidDate($asOf) ? $asOf : date('Y-m-d');

        $stmt = Database::connection()->prepare(
            "SELECT si.id, si.ap_number, si.supplier_invoice_no, si.invoice_date, si.due_date, si.total, si.supplier_id,
                    s.name AS supplier_name, s.code AS supplier_code, po.po_number,
                    COALESCE((SELECT SUM(a.amount_applied) FROM supplier_payment_allocations a
                              JOIN supplier_payments p ON p.id = a.supplier_payment_id
                              WHERE a.supplier_invoice_id = si.id AND p.status = 'posted' AND p.payment_date <= :as1), 0) AS paid_by_then
             FROM supplier_invoices si
             JOIN suppliers s ON s.id = si.supplier_id
             JOIN purchase_orders po ON po.id = si.purchase_order_id
             WHERE si.status = 'approved' AND si.deleted_at IS NULL
               AND si.invoice_date <= :as2 AND DATE(si.approved_at) <= :as3
             ORDER BY s.name, si.due_date, si.id"
        );
        $stmt->execute(['as1' => $asOf, 'as2' => $asOf, 'as3' => $asOf]);

        $suppliers = [];
        $totals = array_fill_keys(array_merge(self::AGING_BUCKETS, ['total']), 0.0);

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $balance = round((float) $r['total'] - (float) $r['paid_by_then'], 2);

            if ($balance <= self::EPSILON) {
                continue;
            }

            $due = $r['due_date'] ?: $r['invoice_date'];
            $daysPast = (int) floor((strtotime($asOf) - strtotime($due)) / 86400);
            $bucket = $daysPast <= 0 ? 'current' : ($daysPast <= 30 ? 'd1_30' : ($daysPast <= 60 ? 'd31_60' : ($daysPast <= 90 ? 'd61_90' : 'd90_plus')));

            $sid = (int) $r['supplier_id'];
            $suppliers[$sid] ??= ['supplier_id' => $sid, 'supplier_name' => $r['supplier_name'], 'supplier_code' => $r['supplier_code'], 'invoices' => []]
                + array_fill_keys(array_merge(self::AGING_BUCKETS, ['total']), 0.0);

            $suppliers[$sid][$bucket] = round($suppliers[$sid][$bucket] + $balance, 2);
            $suppliers[$sid]['total'] = round($suppliers[$sid]['total'] + $balance, 2);
            $totals[$bucket] = round($totals[$bucket] + $balance, 2);
            $totals['total'] = round($totals['total'] + $balance, 2);

            $suppliers[$sid]['invoices'][] = [
                'id' => (int) $r['id'],
                'ap_number' => $r['ap_number'],
                'supplier_invoice_no' => $r['supplier_invoice_no'],
                'po_number' => $r['po_number'],
                'invoice_date' => $r['invoice_date'],
                'due_date' => $due,
                'days_past_due' => max(0, $daysPast),
                'bucket' => $bucket,
                'total' => (float) $r['total'],
                'balance' => $balance
            ];
        }

        return ['as_of' => $asOf, 'suppliers' => array_values($suppliers), 'totals' => $totals];
    }

    /**
     * One supplier's statement: approved invoices (owed, on their invoice
     * date) and posted payments (paid, on their payment date) with a
     * running balance. from/to optional; before `from` becomes the
     * opening balance.
     */
    public function ledger(int $supplierId, ?string $from = null, ?string $to = null): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT id, name, code, tin, payment_terms FROM suppliers WHERE id = :id AND deleted_at IS NULL");
        $stmt->execute(['id' => $supplierId]);
        $supplier = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$supplier) {
            return null;
        }

        $from = $from && $this->isValidDate($from) ? $from : null;
        $to = $to && $this->isValidDate($to) ? $to : null;

        $stmt = $db->prepare(
            "SELECT si.id, si.ap_number, si.supplier_invoice_no, si.invoice_date AS entry_date, si.due_date, si.total, po.po_number
             FROM supplier_invoices si JOIN purchase_orders po ON po.id = si.purchase_order_id
             WHERE si.supplier_id = :id AND si.status = 'approved' AND si.deleted_at IS NULL"
        );
        $stmt->execute(['id' => $supplierId]);
        $entries = array_map(fn(array $r) => [
            'type' => 'invoice',
            'id' => (int) $r['id'],
            'date' => $r['entry_date'],
            'reference' => $r['ap_number'],
            'description' => "Invoice {$r['supplier_invoice_no']} · {$r['po_number']}",
            'due_date' => $r['due_date'],
            'charge' => (float) $r['total'],
            'payment' => 0.0,
            'ewt' => 0.0
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));

        $stmt = $db->prepare(
            "SELECT p.id, p.pv_number, p.payment_date, p.method, p.reference_no, p.total_applied, p.ewt_amount,
                    (SELECT GROUP_CONCAT(si.ap_number ORDER BY si.id SEPARATOR ', ')
                       FROM supplier_payment_allocations a JOIN supplier_invoices si ON si.id = a.supplier_invoice_id
                      WHERE a.supplier_payment_id = p.id) AS invoice_numbers
             FROM supplier_payments p
             WHERE p.supplier_id = :id AND p.status = 'posted'"
        );
        $stmt->execute(['id' => $supplierId]);
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $entries[] = [
                'type' => 'payment',
                'id' => (int) $r['id'],
                'date' => $r['payment_date'],
                'reference' => $r['pv_number'],
                'description' => $this->methodLabel($r['method']) . ($r['reference_no'] ? " {$r['reference_no']}" : '')
                    . ($r['invoice_numbers'] ? " · for {$r['invoice_numbers']}" : ''),
                'due_date' => null,
                'charge' => 0.0,
                'payment' => (float) $r['total_applied'],
                'ewt' => (float) $r['ewt_amount']
            ];
        }

        // Same day: bills before the payments that settle them.
        usort($entries, fn($a, $b) => [$a['date'], $a['type'] === 'payment', $a['id']] <=> [$b['date'], $b['type'] === 'payment', $b['id']]);

        $opening = 0.0;
        $rows = [];
        $balance = 0.0;
        $charges = 0.0;
        $payments = 0.0;

        foreach ($entries as $entry) {
            if ($from !== null && $entry['date'] < $from) {
                $opening = round($opening + $entry['charge'] - $entry['payment'], 2);
                continue;
            }

            if ($to !== null && $entry['date'] > $to) {
                continue;
            }

            if (!$rows) {
                $balance = $opening;
            }

            $balance = round($balance + $entry['charge'] - $entry['payment'], 2);
            $charges += $entry['charge'];
            $payments += $entry['payment'];
            $rows[] = $entry + ['balance' => $balance];
        }

        return [
            'supplier' => [
                'id' => (int) $supplier['id'],
                'name' => $supplier['name'],
                'code' => $supplier['code'],
                'tin' => $supplier['tin'],
                'payment_terms' => $supplier['payment_terms']
            ],
            'from' => $from,
            'to' => $to,
            'opening_balance' => $opening,
            'entries' => $rows,
            'total_charges' => round($charges, 2),
            'total_payments' => round($payments, 2),
            'closing_balance' => $rows ? $balance : $opening
        ];
    }

    /** Suppliers with anything owed or paid, for the pickers. */
    public function suppliers(): array
    {
        $stmt = Database::connection()->query(
            "SELECT s.id, s.name, s.code, s.payment_terms,
                    COALESCE((SELECT SUM(si.total - si.amount_paid) FROM supplier_invoices si
                              WHERE si.supplier_id = s.id AND si.status = 'approved' AND si.deleted_at IS NULL), 0) AS balance
             FROM suppliers s
             WHERE s.deleted_at IS NULL
               AND (EXISTS (SELECT 1 FROM supplier_invoices si WHERE si.supplier_id = s.id AND si.status = 'approved' AND si.deleted_at IS NULL)
                    OR EXISTS (SELECT 1 FROM supplier_payments p WHERE p.supplier_id = s.id))
             ORDER BY s.name"
        );

        return array_map(fn(array $r) => [
            'id' => (int) $r['id'],
            'name' => $r['name'],
            'code' => $r['code'],
            'payment_terms' => $r['payment_terms'],
            'balance' => round((float) $r['balance'], 2)
        ], $stmt->fetchAll(PDO::FETCH_ASSOC));
    }

    /* ---------------------------------------------------------------
     * Helpers
     * ------------------------------------------------------------- */

    private function formatBill(array $r, string $today): array
    {
        $balance = round((float) $r['total'] - (float) $r['amount_paid'], 2);
        $daysPast = $r['due_date'] ? (int) floor((strtotime($today) - strtotime($r['due_date'])) / 86400) : null;

        return [
            'id' => (int) $r['id'],
            'ap_number' => $r['ap_number'],
            'supplier_invoice_no' => $r['supplier_invoice_no'],
            'supplier_id' => (int) $r['supplier_id'],
            'supplier_name' => $r['supplier_name'],
            'supplier_code' => $r['supplier_code'],
            'supplier_tin' => $r['supplier_tin'],
            'payment_terms' => $r['payment_terms'],
            'purchase_order_id' => (int) $r['purchase_order_id'],
            'po_number' => $r['po_number'],
            'invoice_date' => $r['invoice_date'],
            'due_date' => $r['due_date'],
            'days_past_due' => $daysPast !== null ? max(0, $daysPast) : 0,
            'days_until_due' => $daysPast !== null && $daysPast < 0 ? -$daysPast : 0,
            'is_overdue' => $daysPast !== null && $daysPast > 0,
            'total' => (float) $r['total'],
            'vat_amount' => (float) $r['vat_amount'],
            'amount_paid' => (float) $r['amount_paid'],
            'balance' => $balance,
            'payment_status' => $r['payment_status'] ?: 'unpaid',
            'match_status' => $r['match_status']
        ];
    }

    private function formatPayment(array $r): array
    {
        return [
            'id' => (int) $r['id'],
            'pv_number' => $r['pv_number'],
            'supplier_id' => (int) $r['supplier_id'],
            'supplier_name' => $r['supplier_name'],
            'supplier_code' => $r['supplier_code'],
            'payment_date' => $r['payment_date'],
            'method' => $r['method'],
            'method_label' => $this->methodLabel($r['method']),
            'reference_no' => $r['reference_no'],
            'check_date' => $r['check_date'],
            'paid_from' => $r['paid_from'],
            'ewt_rate' => (float) $r['ewt_rate'],
            'total_applied' => (float) $r['total_applied'],
            'ewt_amount' => (float) $r['ewt_amount'],
            'amount_paid' => (float) $r['amount_paid'],
            'notes' => $r['notes'],
            'status' => $r['status'],
            'voided_at' => $r['voided_at'],
            'void_reason' => $r['void_reason'],
            'invoice_numbers' => $r['invoice_numbers'] ?? null,
            'created_by_name' => $r['created_by_name'] ?? null,
            'created_at' => $r['created_at']
        ];
    }

    private function methodLabel(string $method): string
    {
        return ['check' => 'Check', 'bank_transfer' => 'Bank transfer', 'cash' => 'Cash', 'other' => 'Other'][$method] ?? $method;
    }

    private function logInvoice(int $invoiceId, string $action, ?string $notes, int $userId, string $now): void
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
