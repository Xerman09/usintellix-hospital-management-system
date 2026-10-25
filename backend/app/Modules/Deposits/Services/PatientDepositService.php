<?php

namespace App\Modules\Deposits\Services;

use App\Core\Database;
use App\Modules\InpatientBilling\Services\InpatientFolioService;
use PDO;
use RuntimeException;

class PatientDepositService
{
    /**
     * Atomically generate unique deposit number DEP-YYYY-XXXXX
     */
    public static function generateDepositNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_number FROM billing_deposit_counters WHERE counter_type = 'DEPOSIT' AND year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO billing_deposit_counters (counter_type, year, last_number) VALUES ('DEPOSIT', ?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE billing_deposit_counters SET last_number = ? WHERE counter_type = 'DEPOSIT' AND year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("DEP-%04d-%05d", $year, $seq);
    }

    /**
     * Atomically generate unique drawdown number DRW-YYYY-XXXXX
     */
    public static function generateDrawdownNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_number FROM billing_deposit_counters WHERE counter_type = 'DRAWDOWN' AND year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO billing_deposit_counters (counter_type, year, last_number) VALUES ('DRAWDOWN', ?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE billing_deposit_counters SET last_number = ? WHERE counter_type = 'DRAWDOWN' AND year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("DRW-%04d-%05d", $year, $seq);
    }

    /**
     * Atomically generate unique refund voucher number REF-YYYY-XXXXX
     */
    public static function generateRefundNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_number FROM billing_deposit_counters WHERE counter_type = 'REFUND' AND year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO billing_deposit_counters (counter_type, year, last_number) VALUES ('REFUND', ?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE billing_deposit_counters SET last_number = ? WHERE counter_type = 'REFUND' AND year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("REF-%04d-%05d", $year, $seq);
    }

    /**
     * Record an Upfront Advance Deposit (Admission / Elective Surgery / Maternity)
     */
    public function recordAdvanceDeposit(array $data, ?int $userId = null, ?string $cashierName = null): array
    {
        $pdo = Database::connection();

        $patientId = (int)($data['patient_id'] ?? 0);
        $amount = round(max(0.0, (float)($data['amount'] ?? $data['initial_deposit_amount'] ?? 0.0)), 2);
        $depositType = trim($data['deposit_type'] ?? 'inpatient_admission');
        $method = trim($data['payment_method'] ?? 'cash');
        $refNo = !empty($data['reference_no']) ? trim($data['reference_no']) : null;
        $admissionId = !empty($data['admission_id']) ? (int)$data['admission_id'] : null;
        $folioId = !empty($data['folio_id']) ? (int)$data['folio_id'] : null;
        $notes = !empty($data['notes']) ? trim($data['notes']) : null;
        $cashier = $cashierName ?: 'Main Cashier Desk';

        if ($patientId <= 0) {
            throw new RuntimeException("Patient ID is required for advance deposit.");
        }
        if ($amount <= 0.0) {
            throw new RuntimeException("Deposit amount must be greater than zero.");
        }

        // If admission_id is provided, auto-link to active folio if not already set
        if ($admissionId && !$folioId) {
            $fStmt = $pdo->prepare("SELECT id FROM billing_inpatient_folios WHERE admission_id = ? ORDER BY id DESC LIMIT 1");
            $fStmt->execute([$admissionId]);
            $folioId = $fStmt->fetchColumn() ? (int)$fStmt->fetchColumn() : null;
        }

        $pdo->beginTransaction();
        try {
            $depositNo = self::generateDepositNumber($pdo);
            $receiptNo = InpatientFolioService::generateReceiptNumber($pdo);

            $ins = $pdo->prepare("
                INSERT INTO billing_patient_deposits (
                    deposit_number, receipt_number, patient_id, admission_id, folio_id,
                    deposit_type, payment_method, reference_no, initial_deposit_amount,
                    total_drawn_down, total_refunded, remaining_balance, deposit_date,
                    status, cashier_id, cashier_name, notes, created_by,
                    created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    0.00, 0.00, ?, NOW(),
                    'active', ?, ?, ?, ?,
                    NOW(), NOW()
                )
            ");
            $ins->execute([
                $depositNo, $receiptNo, $patientId, $admissionId, $folioId,
                $depositType, $method, $refNo, $amount,
                $amount,
                $userId, $cashier, $notes, $userId
            ]);
            $depositId = (int)$pdo->lastInsertId();

            // Record in unified patient ledger
            $insLedger = $pdo->prepare("
                INSERT INTO patient_ledger_payments (
                    patient_id, encounter_id, payer_type, payment_type, source,
                    reference_no, status, settled_at, payment_date,
                    payment_amount, notes, created_at, created_by
                ) VALUES (
                    ?, NULL, 'patient', 'ADVANCE_DEPOSIT', 'counter',
                    ?, 'settled', NOW(), CURDATE(),
                    ?, ?, NOW(), ?
                )
            ");
            $ledgerNote = "Advance Patient Deposit [{$depositNo}] via {$method} (Receipt: {$receiptNo})";
            if ($notes) $ledgerNote .= " - " . $notes;

            $insLedger->execute([
                $patientId, $receiptNo, $amount, $ledgerNote, $userId
            ]);

            $pdo->commit();
            return $this->getDepositDetail($depositId);
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Apply Drawdown Deduction from Active Deposit against an Inpatient Master Folio
     * Deducts from deposit balance, applies payment to folio, and updates real-time balances.
     */
    public function applyDrawdown(int $depositId, array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $depStmt = $pdo->prepare("SELECT * FROM billing_patient_deposits WHERE id = ? FOR UPDATE");
        $depStmt->execute([$depositId]);
        $deposit = $depStmt->fetch(PDO::FETCH_ASSOC);

        if (!$deposit) {
            throw new RuntimeException("Patient deposit #{$depositId} not found.");
        }

        $depositBal = (float)$deposit['remaining_balance'];
        if ($depositBal <= 0.05) {
            throw new RuntimeException("Deposit #{$deposit['deposit_number']} has no remaining balance to draw down.");
        }

        $folioId = !empty($data['folio_id']) ? (int)$data['folio_id'] : (int)$deposit['folio_id'];
        if ($folioId <= 0) {
            throw new RuntimeException("Target Inpatient Folio ID is required for drawdown deduction.");
        }

        // Fetch folio balance
        $folStmt = $pdo->prepare("SELECT balance_due, folio_number, admission_id FROM billing_inpatient_folios WHERE id = ? FOR UPDATE");
        $folStmt->execute([$folioId]);
        $folio = $folStmt->fetch(PDO::FETCH_ASSOC);

        if (!$folio) {
            throw new RuntimeException("Inpatient Folio #{$folioId} not found.");
        }

        $folioDue = (float)$folio['balance_due'];
        if ($folioDue <= 0.05) {
            throw new RuntimeException("Folio #{$folio['folio_number']} has a zero balance due. No drawdown needed.");
        }

        // Determine drawdown amount: max possible is min(depositBal, folioDue)
        $requestedAmount = !empty($data['amount_drawn']) ? round((float)$data['amount_drawn'], 2) : 0.0;
        if ($requestedAmount <= 0.0) {
            $amountDrawn = min($depositBal, $folioDue);
        } else {
            $amountDrawn = min($requestedAmount, $depositBal, $folioDue);
        }

        $newDepositBal = round($depositBal - $amountDrawn, 2);
        $drawdownType = !empty($data['drawdown_type']) ? trim($data['drawdown_type']) : 'interim_billing_deduction';
        $drawdownNotes = !empty($data['notes']) ? trim($data['notes']) : "Applied to Folio #{$folio['folio_number']}";

        $pdo->beginTransaction();
        try {
            $drawdownNo = self::generateDrawdownNumber($pdo);
            $receiptNo = InpatientFolioService::generateReceiptNumber($pdo);

            // 1. Insert drawdown record
            $insDrw = $pdo->prepare("
                INSERT INTO billing_deposit_drawdowns (
                    drawdown_number, deposit_id, folio_id, amount_drawn,
                    previous_deposit_balance, new_deposit_balance, drawdown_date,
                    drawdown_type, notes, created_by, created_at
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, NOW(),
                    ?, ?, ?, NOW()
                )
            ");
            $insDrw->execute([
                $drawdownNo, $depositId, $folioId, $amountDrawn,
                $depositBal, $newDepositBal,
                $drawdownType, $drawdownNotes, $userId
            ]);

            // 2. Update deposit balance & status
            $newStatus = $newDepositBal <= 0.05 ? 'exhausted' : 'partially_utilized';
            $updDep = $pdo->prepare("
                UPDATE billing_patient_deposits
                SET total_drawn_down = total_drawn_down + ?,
                    remaining_balance = ?,
                    status = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $updDep->execute([$amountDrawn, $newDepositBal, $newStatus, $depositId]);

            // 3. Record payment against inpatient folio
            $insFolPay = $pdo->prepare("
                INSERT INTO billing_folio_payments (
                    folio_id, receipt_number, payer_type, payment_method,
                    amount, payment_date, reference_no, cashier_name,
                    cashier_id, notes, status, created_at
                ) VALUES (
                    ?, ?, 'patient', 'cash',
                    ?, NOW(), ?, ?,
                    ?, ?, 'valid', NOW()
                )
            ");
            $payNote = "Deposit Drawdown [{$drawdownNo}] from Deposit [{$deposit['deposit_number']}]";
            $insFolPay->execute([
                $folioId, $receiptNo, $amountDrawn, $drawdownNo,
                $deposit['cashier_name'] ?: 'Cashier Office',
                $userId, $payNote
            ]);

            // 4. Recalculate folio financials
            $folioService = new InpatientFolioService();
            $folioService->recalculateFolioFinancials($pdo, $folioId);

            // 5. Record drawdown credit in patient ledger
            $insLedger = $pdo->prepare("
                INSERT INTO patient_ledger_payments (
                    patient_id, encounter_id, payer_type, payment_type, source,
                    reference_no, status, settled_at, payment_date,
                    payment_amount, notes, created_at, created_by
                ) VALUES (
                    ?, NULL, 'patient', 'DEPOSIT_DRAWDOWN', 'counter',
                    ?, 'settled', NOW(), CURDATE(),
                    ?, ?, NOW(), ?
                )
            ");
            $insLedger->execute([
                $deposit['patient_id'], $drawdownNo, $amountDrawn,
                "Drawdown [{$drawdownNo}] credited to Folio {$folio['folio_number']}",
                $userId
            ]);

            $pdo->commit();
            return $this->getDepositDetail($depositId);
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Disburse Unused Deposit Balance Refund upon Discharge or Cancellation
     */
    public function disburseRefund(int $depositId, array $data, ?int $userId = null, ?string $disbursedByName = null): array
    {
        $pdo = Database::connection();

        $depStmt = $pdo->prepare("SELECT * FROM billing_patient_deposits WHERE id = ? FOR UPDATE");
        $depStmt->execute([$depositId]);
        $deposit = $depStmt->fetch(PDO::FETCH_ASSOC);

        if (!$deposit) {
            throw new RuntimeException("Patient deposit #{$depositId} not found.");
        }

        $depositBal = (float)$deposit['remaining_balance'];
        if ($depositBal <= 0.05) {
            throw new RuntimeException("Deposit #{$deposit['deposit_number']} has no remaining balance to refund.");
        }

        $refundAmount = !empty($data['refund_amount']) ? round((float)$data['refund_amount'], 2) : $depositBal;
        if ($refundAmount <= 0.0 || $refundAmount > $depositBal) {
            $refundAmount = $depositBal;
        }

        $method = trim($data['refund_method'] ?? 'cash');
        $reason = trim($data['refund_reason'] ?? 'unused_discharge_balance');
        $recipient = !empty($data['recipient_name']) ? trim($data['recipient_name']) : 'Patient / Authorized Representative';
        $refNo = !empty($data['reference_no']) ? trim($data['reference_no']) : null;
        $notes = !empty($data['notes']) ? trim($data['notes']) : null;
        $disbursedBy = $disbursedByName ?: 'Discharge Billing Officer';

        $newDepositBal = round($depositBal - $refundAmount, 2);

        $pdo->beginTransaction();
        try {
            $refundNo = self::generateRefundNumber($pdo);

            $insRef = $pdo->prepare("
                INSERT INTO billing_deposit_refunds (
                    refund_number, deposit_id, patient_id, folio_id,
                    refund_amount, refund_method, refund_reason,
                    disbursed_by, disbursed_by_name, recipient_name,
                    recipient_signature_acknowledged, reference_no, notes,
                    refund_date, created_at
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    1, ?, ?,
                    NOW(), NOW()
                )
            ");
            $insRef->execute([
                $refundNo, $depositId, $deposit['patient_id'], $deposit['folio_id'],
                $refundAmount, $method, $reason,
                $userId, $disbursedBy, $recipient,
                $refNo, $notes
            ]);

            // Update deposit
            $status = $newDepositBal <= 0.05 ? 'refunded' : 'partially_utilized';
            $updDep = $pdo->prepare("
                UPDATE billing_patient_deposits
                SET total_refunded = total_refunded + ?,
                    remaining_balance = ?,
                    status = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $updDep->execute([$refundAmount, $newDepositBal, $status, $depositId]);

            // Record in patient ledger
            $insLedger = $pdo->prepare("
                INSERT INTO patient_ledger_payments (
                    patient_id, encounter_id, payer_type, payment_type, source,
                    reference_no, status, settled_at, payment_date,
                    payment_amount, notes, created_at, created_by
                ) VALUES (
                    ?, NULL, 'patient', 'DEPOSIT_REFUND', 'counter',
                    ?, 'settled', NOW(), CURDATE(),
                    ?, ?, NOW(), ?
                )
            ");
            $ledgerNote = "Deposit Refund Disbursed [{$refundNo}] - {$method} to {$recipient} ({$reason})";
            if ($notes) $ledgerNote .= " - " . $notes;

            $insLedger->execute([
                $deposit['patient_id'], $refundNo, -$refundAmount, $ledgerNote, $userId
            ]);

            $pdo->commit();
            return $this->getDepositDetail($depositId);
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Get Detailed Deposit Record with Drawdowns and Refunds Ledger
     */
    public function getDepositDetail(int $depositId): ?array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("
            SELECT d.*,
                   p.patient_no,
                   p.first_name,
                   p.last_name,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.birthdate,
                   p.sex,
                   ia.admission_number,
                   ia.admission_date,
                   ia.discharge_date,
                   hb.bed_number,
                   hw.ward_name,
                   f.folio_number,
                   f.balance_due AS folio_current_balance
            FROM billing_patient_deposits d
            JOIN patients p ON d.patient_id = p.id
            LEFT JOIN inpatient_admissions ia ON d.admission_id = ia.id
            LEFT JOIN hospital_beds hb ON ia.bed_id = hb.id
            LEFT JOIN hospital_wards hw ON ia.ward_id = hw.id
            LEFT JOIN billing_inpatient_folios f ON d.folio_id = f.id
            WHERE d.id = ?
        ");
        $stmt->execute([$depositId]);
        $deposit = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$deposit) {
            return null;
        }

        // Fetch drawdowns
        $drwStmt = $pdo->prepare("
            SELECT dd.*, f.folio_number
            FROM billing_deposit_drawdowns dd
            LEFT JOIN billing_inpatient_folios f ON dd.folio_id = f.id
            WHERE dd.deposit_id = ?
            ORDER BY dd.id ASC
        ");
        $drwStmt->execute([$depositId]);
        $deposit['drawdowns'] = $drwStmt->fetchAll(PDO::FETCH_ASSOC);

        // Fetch refunds
        $refStmt = $pdo->prepare("
            SELECT *
            FROM billing_deposit_refunds
            WHERE deposit_id = ?
            ORDER BY id ASC
        ");
        $refStmt->execute([$depositId]);
        $deposit['refunds'] = $refStmt->fetchAll(PDO::FETCH_ASSOC);

        return $deposit;
    }

    /**
     * List Patient Deposits with Search, Filters and Pagination
     */
    public function listDeposits(array $filters = []): array
    {
        $pdo = Database::connection();

        $page = max(1, (int)($filters['page'] ?? 1));
        $perPage = min(100, max(5, (int)($filters['per_page'] ?? 15)));
        $offset = ($page - 1) * $perPage;

        $conditions = ["1=1"];
        $params = [];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $conditions[] = "d.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['deposit_type']) && $filters['deposit_type'] !== 'all') {
            $conditions[] = "d.deposit_type = ?";
            $params[] = $filters['deposit_type'];
        }

        if (!empty($filters['patient_id'])) {
            $conditions[] = "d.patient_id = ?";
            $params[] = (int)$filters['patient_id'];
        }

        if (!empty($filters['q'])) {
            $term = "%" . trim($filters['q']) . "%";
            $conditions[] = "(
                d.deposit_number LIKE ? OR
                d.receipt_number LIKE ? OR
                p.first_name LIKE ? OR
                p.last_name LIKE ? OR
                p.patient_no LIKE ? OR
                ia.admission_number LIKE ? OR
                f.folio_number LIKE ?
            )";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereSql = implode(" AND ", $conditions);

        // Count total
        $countStmt = $pdo->prepare("
            SELECT COUNT(*)
            FROM billing_patient_deposits d
            JOIN patients p ON d.patient_id = p.id
            LEFT JOIN inpatient_admissions ia ON d.admission_id = ia.id
            LEFT JOIN billing_inpatient_folios f ON d.folio_id = f.id
            WHERE {$whereSql}
        ");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        // Fetch page items
        $sql = "
            SELECT d.*,
                   p.patient_no,
                   p.first_name,
                   p.last_name,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   ia.admission_number,
                   f.folio_number,
                   f.balance_due AS folio_current_balance,
                   (SELECT COUNT(*) FROM billing_deposit_drawdowns dd WHERE dd.deposit_id = d.id) AS drawdown_count,
                   (SELECT COUNT(*) FROM billing_deposit_refunds rf WHERE rf.deposit_id = d.id) AS refund_count
            FROM billing_patient_deposits d
            JOIN patients p ON d.patient_id = p.id
            LEFT JOIN inpatient_admissions ia ON d.admission_id = ia.id
            LEFT JOIN billing_inpatient_folios f ON d.folio_id = f.id
            WHERE {$whereSql}
            ORDER BY 
                CASE WHEN d.status IN ('active', 'partially_utilized') THEN 0 ELSE 1 END ASC,
                d.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => (int)ceil($total / max(1, $perPage))
        ];
    }

    /**
     * Get Executive Deposit Ledger Summary Metrics
     */
    public function getDepositSummaryMetrics(): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->query("
            SELECT 
                COUNT(*) AS total_deposits_count,
                COALESCE(SUM(initial_deposit_amount), 0) AS total_initial_deposits,
                COALESCE(SUM(total_drawn_down), 0) AS total_drawn_down,
                COALESCE(SUM(total_refunded), 0) AS total_refunded,
                COALESCE(SUM(remaining_balance), 0) AS total_remaining_balance,
                SUM(CASE WHEN status IN ('active', 'partially_utilized') THEN 1 ELSE 0 END) AS active_deposits_count,
                SUM(CASE WHEN status = 'exhausted' THEN 1 ELSE 0 END) AS exhausted_count,
                SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) AS refunded_count
            FROM billing_patient_deposits
            WHERE status != 'voided'
        ");
        $m = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'total_deposits_count' => (int)$m['total_deposits_count'],
            'total_initial_deposits' => (float)$m['total_initial_deposits'],
            'total_drawn_down' => (float)$m['total_drawn_down'],
            'total_refunded' => (float)$m['total_refunded'],
            'total_remaining_balance' => (float)$m['total_remaining_balance'],
            'active_deposits_count' => (int)$m['active_deposits_count'],
            'exhausted_count' => (int)$m['exhausted_count'],
            'refunded_count' => (int)$m['refunded_count']
        ];
    }

    /**
     * Look up open admissions and folios available for deposit registration or drawdown
     */
    public function getAdmissionsForDeposit(): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->query("
            SELECT ia.id AS admission_id,
                   ia.admission_number,
                   ia.admission_date,
                   ia.status AS admission_status,
                   ia.attending_physician,
                   ia.admitting_diagnosis,
                   p.id AS patient_id,
                   p.patient_no,
                   p.first_name,
                   p.last_name,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   hb.bed_number,
                   hw.ward_name,
                   f.id AS folio_id,
                   f.folio_number,
                   COALESCE(f.balance_due, 0.00) AS balance_due,
                   COALESCE((SELECT SUM(remaining_balance) FROM billing_patient_deposits d WHERE d.admission_id = ia.id AND d.status IN ('active', 'partially_utilized')), 0.00) AS active_deposit_balance
            FROM inpatient_admissions ia
            JOIN patients p ON ia.patient_id = p.id
            LEFT JOIN hospital_beds hb ON ia.bed_id = hb.id
            LEFT JOIN hospital_wards hw ON ia.ward_id = hw.id
            LEFT JOIN billing_inpatient_folios f ON f.admission_id = ia.id
            WHERE ia.status IN ('Admitted', 'In Transit', 'Pending Discharge')
            ORDER BY ia.id DESC
            LIMIT 30
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
