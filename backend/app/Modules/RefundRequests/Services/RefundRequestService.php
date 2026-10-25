<?php

namespace App\Modules\RefundRequests\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

class RefundRequestService
{
    /**
     * Atomically generate unique refund request number RR-YYYY-XXXXX
     */
    public static function generateRequestNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_number FROM billing_refund_counters WHERE counter_type = 'REFUND_REQUEST' AND year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO billing_refund_counters (counter_type, year, last_number) VALUES ('REFUND_REQUEST', ?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE billing_refund_counters SET last_number = ? WHERE counter_type = 'REFUND_REQUEST' AND year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("RR-%04d-%05d", $year, $seq);
    }

    /**
     * Atomically generate unique payment voucher number PV-YYYY-XXXXX
     */
    public static function generateVoucherNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_number FROM billing_refund_counters WHERE counter_type = 'PAYMENT_VOUCHER' AND year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO billing_refund_counters (counter_type, year, last_number) VALUES ('PAYMENT_VOUCHER', ?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE billing_refund_counters SET last_number = ? WHERE counter_type = 'PAYMENT_VOUCHER' AND year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("PV-%04d-%05d", $year, $seq);
    }

    /**
     * Log an action in the refund audit trail
     */
    private function logAudit(
        PDO $pdo,
        int $refundRequestId,
        string $action,
        ?string $prevStatus,
        string $newStatus,
        ?int $userId,
        string $userName,
        ?string $comments = null
    ): void {
        $stmt = $pdo->prepare("
            INSERT INTO billing_refund_audit_trail (
                refund_request_id, action, previous_status, new_status,
                performed_by, performed_by_name, comments, performed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
        ");
        $stmt->execute([
            $refundRequestId,
            $action,
            $prevStatus,
            $newStatus,
            $userId,
            $userName,
            $comments
        ]);
    }

    /**
     * Stage 1: Biller / Cashier submits a Refund Authorization Request
     */
    public function createRefundRequest(array $data, ?int $userId = null, ?string $userName = null): array
    {
        $pdo = Database::connection();

        $patientId = (int)($data['patient_id'] ?? 0);
        $requestedAmount = round(max(0.0, (float)($data['requested_amount'] ?? 0.0)), 2);
        $totalCreditBalance = round(max(0.0, (float)($data['total_credit_balance'] ?? $requestedAmount)), 2);
        $category = trim($data['refund_reason_category'] ?? 'overpayment');
        $description = trim($data['refund_reason_description'] ?? '');
        $proposedMethod = trim($data['proposed_payment_method'] ?? 'check');
        $payeeName = trim($data['payee_name'] ?? '');
        $payeeRelationship = trim($data['payee_relationship'] ?? 'self');
        $justification = !empty($data['justification']) ? trim($data['justification']) : null;
        $admissionId = !empty($data['admission_id']) ? (int)$data['admission_id'] : null;
        $folioId = !empty($data['folio_id']) ? (int)$data['folio_id'] : null;
        $depositId = !empty($data['deposit_id']) ? (int)$data['deposit_id'] : null;
        $origReceiptNo = !empty($data['original_receipt_number']) ? trim($data['original_receipt_number']) : null;
        $supportingDocs = !empty($data['supporting_documents']) ? trim($data['supporting_documents']) : null;

        $billerName = $userName ?: 'Billing Clerk';

        if ($patientId <= 0) {
            throw new RuntimeException("A valid Patient ID is required for a refund request.");
        }
        if ($requestedAmount <= 0.0) {
            throw new RuntimeException("Requested refund amount must be greater than zero.");
        }
        if (empty($description)) {
            throw new RuntimeException("Refund reason description is required.");
        }

        // If payee name is empty, auto-fill from patient full name
        if (empty($payeeName)) {
            $pStmt = $pdo->prepare("SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM patients WHERE id = ?");
            $pStmt->execute([$patientId]);
            $payeeName = $pStmt->fetchColumn() ?: 'Patient';
        }

        // Valid categories
        $validCategories = [
            'overpayment',
            'retroactive_insurance_adjustment',
            'deposit_credit_balance',
            'duplicate_payment',
            'cancelled_procedure_service',
            'billing_charge_adjustment',
            'pharmacy_return',
            'other'
        ];
        if (!in_array($category, $validCategories, true)) {
            $category = 'overpayment';
        }

        $validMethods = ['check', 'cash', 'bank_transfer', 'credit_card_reversal', 'online_wallet'];
        if (!in_array($proposedMethod, $validMethods, true)) {
            $proposedMethod = 'check';
        }

        $pdo->beginTransaction();
        try {
            $requestNo = self::generateRequestNumber($pdo);

            $ins = $pdo->prepare("
                INSERT INTO billing_refund_requests (
                    request_number, patient_id, admission_id, folio_id, deposit_id,
                    original_receipt_number, refund_reason_category, refund_reason_description,
                    total_credit_balance, requested_amount, proposed_payment_method,
                    status, requested_by, requested_by_name, requested_at,
                    justification, supporting_documents, payee_name, payee_relationship
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    'pending_approval', ?, ?, NOW(),
                    ?, ?, ?, ?
                )
            ");

            $ins->execute([
                $requestNo,
                $patientId,
                $admissionId,
                $folioId,
                $depositId,
                $origReceiptNo,
                $category,
                $description,
                $totalCreditBalance,
                $requestedAmount,
                $proposedMethod,
                $userId,
                $billerName,
                $justification,
                $supportingDocs,
                $payeeName,
                $payeeRelationship
            ]);

            $newId = (int)$pdo->lastInsertId();

            $this->logAudit(
                $pdo,
                $newId,
                'SUBMITTED',
                null,
                'pending_approval',
                $userId,
                $billerName,
                "Biller {$billerName} submitted refund request of $" . number_format($requestedAmount, 2) . " ({$category})."
            );

            $pdo->commit();

            return $this->getRefundRequestDetail($newId);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw new RuntimeException("Failed to create refund request: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Stage 2: Finance Manager Review & Approval / Rejection
     */
    public function reviewRefundRequest(
        int $id,
        string $decision,
        ?float $approvedAmount = null,
        ?string $notes = null,
        ?string $rejectionReason = null,
        ?int $userId = null,
        ?string $userName = null
    ): array {
        $pdo = Database::connection();
        $managerName = $userName ?: 'Finance Manager';

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM billing_refund_requests WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $req = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$req) {
                throw new RuntimeException("Refund request #{$id} not found.");
            }

            if (!in_array($req['status'], ['pending_approval', 'draft'], true)) {
                throw new RuntimeException("Refund request is in '{$req['status']}' state and cannot be reviewed.");
            }

            $prevStatus = $req['status'];

            if ($decision === 'approve') {
                $finalApprovedAmount = $approvedAmount !== null
                    ? round(max(0.01, $approvedAmount), 2)
                    : (float)$req['requested_amount'];

                $upd = $pdo->prepare("
                    UPDATE billing_refund_requests SET
                        status = 'approved',
                        approval_status = 'approved',
                        approved_amount = ?,
                        approval_notes = ?,
                        reviewed_by = ?,
                        reviewed_by_name = ?,
                        reviewed_at = NOW()
                    WHERE id = ?
                ");
                $upd->execute([
                    $finalApprovedAmount,
                    $notes,
                    $userId,
                    $managerName,
                    $id
                ]);

                $this->logAudit(
                    $pdo,
                    $id,
                    'APPROVED',
                    $prevStatus,
                    'approved',
                    $userId,
                    $managerName,
                    "Finance Manager approved refund for $" . number_format($finalApprovedAmount, 2) . ". Notes: " . ($notes ?: 'N/A')
                );
            } elseif ($decision === 'reject') {
                if (empty($rejectionReason)) {
                    throw new RuntimeException("A formal rejection reason is required.");
                }

                $upd = $pdo->prepare("
                    UPDATE billing_refund_requests SET
                        status = 'rejected',
                        approval_status = 'rejected',
                        rejection_reason = ?,
                        approval_notes = ?,
                        reviewed_by = ?,
                        reviewed_by_name = ?,
                        reviewed_at = NOW()
                    WHERE id = ?
                ");
                $upd->execute([
                    $rejectionReason,
                    $notes,
                    $userId,
                    $managerName,
                    $id
                ]);

                $this->logAudit(
                    $pdo,
                    $id,
                    'REJECTED',
                    $prevStatus,
                    'rejected',
                    $userId,
                    $managerName,
                    "Refund request rejected. Reason: {$rejectionReason}"
                );
            } else {
                throw new RuntimeException("Invalid review decision '{$decision}'. Must be 'approve' or 'reject'.");
            }

            $pdo->commit();
            return $this->getRefundRequestDetail($id);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw new RuntimeException("Failed to review refund request: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Stage 3: Accounting / Finance issues formal Payment Voucher (PV-YYYY-XXXXX)
     */
    public function issuePaymentVoucher(
        int $id,
        array $voucherData,
        ?int $userId = null,
        ?string $userName = null
    ): array {
        $pdo = Database::connection();
        $accountantName = $userName ?: 'Finance / Accounting';

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM billing_refund_requests WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $req = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$req) {
                throw new RuntimeException("Refund request #{$id} not found.");
            }

            if ($req['status'] !== 'approved') {
                throw new RuntimeException("Only approved refund requests can be issued a payment voucher. Current status: {$req['status']}.");
            }

            $prevStatus = $req['status'];
            $method = trim($voucherData['disbursement_method'] ?? $req['proposed_payment_method'] ?? 'check');
            $checkNo = !empty($voucherData['check_number']) ? trim($voucherData['check_number']) : null;
            $bankName = !empty($voucherData['bank_name']) ? trim($voucherData['bank_name']) : null;
            $bankAcct = !empty($voucherData['bank_account_number']) ? trim($voucherData['bank_account_number']) : null;
            $transRef = !empty($voucherData['transaction_reference']) ? trim($voucherData['transaction_reference']) : null;

            if ($method === 'check' && empty($checkNo)) {
                // If check number is omitted, default to pending check draft
                $checkNo = "CHK-" . strtoupper(bin2hex(random_bytes(3)));
            }

            $voucherNo = self::generateVoucherNumber($pdo);

            $upd = $pdo->prepare("
                UPDATE billing_refund_requests SET
                    voucher_number = ?,
                    voucher_issued_by = ?,
                    voucher_issued_by_name = ?,
                    voucher_issued_at = NOW(),
                    disbursement_method = ?,
                    check_number = ?,
                    bank_name = ?,
                    bank_account_number = ?,
                    transaction_reference = ?,
                    status = 'voucher_issued'
                WHERE id = ?
            ");

            $upd->execute([
                $voucherNo,
                $userId,
                $accountantName,
                $method,
                $checkNo,
                $bankName,
                $bankAcct,
                $transRef,
                $id
            ]);

            $this->logAudit(
                $pdo,
                $id,
                'VOUCHER_ISSUED',
                $prevStatus,
                'voucher_issued',
                $userId,
                $accountantName,
                "Payment Voucher {$voucherNo} generated via {$method}" . ($checkNo ? " (Check #{$checkNo})" : "")
            );

            $pdo->commit();
            return $this->getRefundRequestDetail($id);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw new RuntimeException("Failed to issue payment voucher: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Stage 4: Treasury / Cashier releases funds & obtains Payee Receipt Sign-off
     */
    public function disburseRefund(
        int $id,
        array $disburseData,
        ?int $userId = null,
        ?string $userName = null
    ): array {
        $pdo = Database::connection();
        $cashierName = $userName ?: 'Treasury / Cashier';

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM billing_refund_requests WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $req = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$req) {
                throw new RuntimeException("Refund request #{$id} not found.");
            }

            if (!in_array($req['status'], ['voucher_issued', 'approved'], true)) {
                throw new RuntimeException("Request must be in 'voucher_issued' or 'approved' status to disburse. Current: {$req['status']}.");
            }

            $prevStatus = $req['status'];
            $disbursedAmount = (float)($disburseData['disbursed_amount'] ?? $req['approved_amount'] ?? $req['requested_amount']);
            $idType = !empty($disburseData['payee_id_type']) ? trim($disburseData['payee_id_type']) : null;
            $idNumber = !empty($disburseData['payee_id_number']) ? trim($disburseData['payee_id_number']) : null;
            $notes = !empty($disburseData['disbursement_notes']) ? trim($disburseData['disbursement_notes']) : null;

            // If no voucher exists yet, auto-generate one
            $voucherNo = $req['voucher_number'];
            if (empty($voucherNo)) {
                $voucherNo = self::generateVoucherNumber($pdo);
                $method = trim($disburseData['disbursement_method'] ?? $req['proposed_payment_method'] ?? 'cash');
                $vUpd = $pdo->prepare("
                    UPDATE billing_refund_requests SET
                        voucher_number = ?,
                        voucher_issued_by = ?,
                        voucher_issued_by_name = ?,
                        voucher_issued_at = NOW(),
                        disbursement_method = ?
                    WHERE id = ?
                ");
                $vUpd->execute([$voucherNo, $userId, $cashierName, $method, $id]);
            }

            // Update request to disbursed
            $upd = $pdo->prepare("
                UPDATE billing_refund_requests SET
                    status = 'disbursed',
                    disbursed_amount = ?,
                    payee_id_type = ?,
                    payee_id_number = ?,
                    disbursed_by = ?,
                    disbursed_by_name = ?,
                    disbursed_at = NOW(),
                    disbursement_notes = ?
                WHERE id = ?
            ");
            $upd->execute([
                $disbursedAmount,
                $idType,
                $idNumber,
                $userId,
                $cashierName,
                $notes,
                $id
            ]);

            // Post negative payment/refund to patient ledger to balance books
            $ledgerIns = $pdo->prepare("
                INSERT INTO patient_ledger_payments (
                    patient_id, payer_type, payment_type, source,
                    reference_no, status, settled_at, payment_date,
                    payment_amount, notes, created_by, created_at
                ) VALUES (
                    ?, 'patient', 'REFUND_DISBURSEMENT', 'counter',
                    ?, 'settled', NOW(), CURRENT_DATE(),
                    ?, ?, ?, NOW()
                )
            ");
            $negAmount = -1 * abs($disbursedAmount);
            $ledgerNotes = "Refund Voucher {$voucherNo} disbursed to {$req['payee_name']} ({$req['payee_relationship']}). Category: {$req['refund_reason_category']}.";
            $ledgerIns->execute([
                (int)$req['patient_id'],
                $voucherNo,
                $negAmount,
                $ledgerNotes,
                $userId
            ]);

            // If linked to deposit, deduct from remaining balance
            if (!empty($req['deposit_id'])) {
                $depId = (int)$req['deposit_id'];
                $dUpd = $pdo->prepare("
                    UPDATE billing_patient_deposits SET
                        total_refunded = total_refunded + ?,
                        remaining_balance = GREATEST(0.00, remaining_balance - ?),
                        status = CASE WHEN remaining_balance - ? <= 0.05 THEN 'refunded' ELSE status END
                    WHERE id = ?
                ");
                $dUpd->execute([$disbursedAmount, $disbursedAmount, $disbursedAmount, $depId]);
            }

            $this->logAudit(
                $pdo,
                $id,
                'DISBURSED',
                $prevStatus,
                'disbursed',
                $userId,
                $cashierName,
                "Funds of $" . number_format($disbursedAmount, 2) . " released to {$req['payee_name']}. Voucher: {$voucherNo}."
            );

            $pdo->commit();
            return $this->getRefundRequestDetail($id);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw new RuntimeException("Failed to disburse refund: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Void a refund request
     */
    public function voidRefundRequest(
        int $id,
        string $reason,
        ?int $userId = null,
        ?string $userName = null
    ): array {
        $pdo = Database::connection();
        $officerName = $userName ?: 'Finance Supervisor';

        $pdo->beginTransaction();
        try {
            $stmt = $pdo->prepare("SELECT * FROM billing_refund_requests WHERE id = ? FOR UPDATE");
            $stmt->execute([$id]);
            $req = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$req) {
                throw new RuntimeException("Refund request #{$id} not found.");
            }

            if ($req['status'] === 'disbursed') {
                throw new RuntimeException("Cannot void a refund request that has already been disbursed.");
            }

            $prevStatus = $req['status'];

            $upd = $pdo->prepare("
                UPDATE billing_refund_requests SET
                    status = 'voided',
                    rejection_reason = CONCAT(COALESCE(rejection_reason, ''), ' [VOIDED: ', ?, ']')
                WHERE id = ?
            ");
            $upd->execute([$reason, $id]);

            $this->logAudit(
                $pdo,
                $id,
                'VOIDED',
                $prevStatus,
                'voided',
                $userId,
                $officerName,
                "Refund request voided: {$reason}"
            );

            $pdo->commit();
            return $this->getRefundRequestDetail($id);
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw new RuntimeException("Failed to void refund request: " . $e->getMessage(), 0, $e);
        }
    }

    /**
     * Get detailed record with Patient info, Admission/Folio info, and full Audit Trail
     */
    public function getRefundRequestDetail(int $id): ?array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT
                r.*,
                CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                p.patient_no,
                p.birthdate,
                p.sex,
                f.folio_number,
                f.balance_due AS folio_balance,
                d.deposit_number,
                d.remaining_balance AS deposit_balance
            FROM billing_refund_requests r
            JOIN patients p ON p.id = r.patient_id
            LEFT JOIN billing_inpatient_folios f ON f.id = r.folio_id
            LEFT JOIN billing_patient_deposits d ON d.id = r.deposit_id
            WHERE r.id = ?
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return null;
        }

        // Fetch audit trail
        $aStmt = $pdo->prepare("
            SELECT * FROM billing_refund_audit_trail
            WHERE refund_request_id = ?
            ORDER BY id ASC
        ");
        $aStmt->execute([$id]);
        $row['audit_trail'] = $aStmt->fetchAll(PDO::FETCH_ASSOC);

        return $row;
    }

    /**
     * List refund requests with search, filter, and pagination
     */
    public function listRefundRequests(array $filters): array
    {
        $pdo = Database::connection();

        $page = max(1, (int)($filters['page'] ?? 1));
        $perPage = max(1, min(100, (int)($filters['per_page'] ?? 15)));
        $offset = ($page - 1) * $perPage;

        $where = ["1=1"];
        $params = [];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $where[] = "r.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['category']) && $filters['category'] !== 'all') {
            $where[] = "r.refund_reason_category = ?";
            $params[] = $filters['category'];
        }

        if (!empty($filters['patient_id'])) {
            $where[] = "r.patient_id = ?";
            $params[] = (int)$filters['patient_id'];
        }

        if (!empty($filters['q'])) {
            $q = '%' . trim($filters['q']) . '%';
            $where[] = "(
                r.request_number LIKE ? OR
                r.voucher_number LIKE ? OR
                r.payee_name LIKE ? OR
                p.patient_no LIKE ? OR
                p.first_name LIKE ? OR
                p.last_name LIKE ? OR
                CONCAT(p.first_name, ' ', p.last_name) LIKE ?
            )";
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
            $params[] = $q;
        }

        $whereSql = implode(" AND ", $where);

        $countSql = "
            SELECT COUNT(*)
            FROM billing_refund_requests r
            JOIN patients p ON p.id = r.patient_id
            WHERE {$whereSql}
        ";
        $cStmt = $pdo->prepare($countSql);
        $cStmt->execute($params);
        $total = (int)$cStmt->fetchColumn();

        $dataSql = "
            SELECT
                r.*,
                CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                p.patient_no,
                f.folio_number,
                d.deposit_number
            FROM billing_refund_requests r
            JOIN patients p ON p.id = r.patient_id
            LEFT JOIN billing_inpatient_folios f ON f.id = r.folio_id
            LEFT JOIN billing_patient_deposits d ON d.id = r.deposit_id
            WHERE {$whereSql}
            ORDER BY r.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $dStmt = $pdo->prepare($dataSql);
        $dStmt->execute($params);
        $rows = $dStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'data' => $rows,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => (int)ceil($total / $perPage)
        ];
    }

    /**
     * Get summary metrics for the refund authorization pipeline
     */
    public function getRefundSummaryMetrics(): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->query("
            SELECT
                COUNT(*) AS total_requests,
                SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) AS count_pending_approval,
                SUM(CASE WHEN status = 'pending_approval' THEN requested_amount ELSE 0 END) AS amount_pending_approval,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS count_approved,
                SUM(CASE WHEN status = 'approved' THEN approved_amount ELSE 0 END) AS amount_approved,
                SUM(CASE WHEN status = 'voucher_issued' THEN 1 ELSE 0 END) AS count_voucher_issued,
                SUM(CASE WHEN status = 'voucher_issued' THEN approved_amount ELSE 0 END) AS amount_voucher_issued,
                SUM(CASE WHEN status = 'disbursed' THEN 1 ELSE 0 END) AS count_disbursed,
                SUM(CASE WHEN status = 'disbursed' THEN disbursed_amount ELSE 0 END) AS amount_disbursed,
                SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) AS count_rejected
            FROM billing_refund_requests
        ");
        $res = $stmt->fetch(PDO::FETCH_ASSOC);

        return [
            'total_requests' => (int)($res['total_requests'] ?? 0),
            'count_pending_approval' => (int)($res['count_pending_approval'] ?? 0),
            'amount_pending_approval' => (float)($res['amount_pending_approval'] ?? 0.0),
            'count_approved' => (int)($res['count_approved'] ?? 0),
            'amount_approved' => (float)($res['amount_approved'] ?? 0.0),
            'count_voucher_issued' => (int)($res['count_voucher_issued'] ?? 0),
            'amount_voucher_issued' => (float)($res['amount_voucher_issued'] ?? 0.0),
            'count_disbursed' => (int)($res['count_disbursed'] ?? 0),
            'amount_disbursed' => (float)($res['amount_disbursed'] ?? 0.0),
            'count_rejected' => (int)($res['count_rejected'] ?? 0)
        ];
    }

    /**
     * Find candidates for refund (patients with unused deposits or folios with credit/zero balances)
     */
    public function getCreditBalanceCandidates(array $filters = []): array
    {
        $pdo = Database::connection();

        // 1. Deposits with positive remaining balance
        $depSql = "
            SELECT
                d.id AS deposit_id,
                d.deposit_number,
                d.remaining_balance AS credit_amount,
                'deposit_credit_balance' AS candidate_type,
                d.deposit_type,
                d.receipt_number,
                d.patient_id,
                CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                p.patient_no,
                d.folio_id,
                d.admission_id
            FROM billing_patient_deposits d
            JOIN patients p ON p.id = d.patient_id
            WHERE d.remaining_balance > 0 AND d.status IN ('active', 'partially_utilized')
            ORDER BY d.id DESC
            LIMIT 20
        ";
        $depStmt = $pdo->query($depSql);
        $depositCandidates = $depStmt->fetchAll(PDO::FETCH_ASSOC);

        // 2. Recent admitted or discharged patients
        $patSql = "
            SELECT
                p.id AS patient_id,
                CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                p.patient_no,
                p.birthdate,
                p.sex
            FROM patients p
            ORDER BY p.id DESC
            LIMIT 30
        ";
        $patStmt = $pdo->query($patSql);
        $patientList = $patStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'deposit_candidates' => $depositCandidates,
            'patients' => $patientList
        ];
    }
}
