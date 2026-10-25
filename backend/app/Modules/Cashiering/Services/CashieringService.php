<?php

namespace App\Modules\Cashiering\Services;

use App\Core\Database;
use App\Modules\InpatientBilling\Services\InpatientFolioService;
use PDO;
use RuntimeException;

class CashieringService
{
    /**
     * Atomically generate unique transaction number TXN-YYYY-XXXXX
     */
    public static function generateTransactionNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $pdo->prepare("
            INSERT INTO billing_transaction_counters (year, last_number)
            VALUES (?, 1)
            ON DUPLICATE KEY UPDATE last_number = last_number + 1
        ")->execute([$year]);

        $stmt = $pdo->prepare("SELECT last_number FROM billing_transaction_counters WHERE year = ?");
        $stmt->execute([$year]);
        $seq = (int)$stmt->fetchColumn();

        return sprintf("TXN-%d-%05d", $year, $seq);
    }

    /**
     * Atomically generate unique official receipt number OR-YYYY-XXXXX
     * Synchronized with billing_receipt_counters
     */
    public static function generateReceiptNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("SELECT last_seq FROM billing_receipt_counters WHERE prefix_year = ? FOR UPDATE");
        $stmt->execute([$year]);
        $seq = $stmt->fetchColumn();

        if ($seq === false) {
            $seq = 1;
            $ins = $pdo->prepare("INSERT INTO billing_receipt_counters (prefix_year, last_seq) VALUES (?, ?)");
            $ins->execute([$year, $seq]);
        } else {
            $seq = (int)$seq + 1;
            $upd = $pdo->prepare("UPDATE billing_receipt_counters SET last_seq = ? WHERE prefix_year = ?");
            $upd->execute([$seq, $year]);
        }

        return sprintf("OR-%04d-%05d", $year, $seq);
    }

    /**
     * Process a Multi-Tender Split Cashier Transaction
     * Handles Cash, Card, Check, Digital Wallets, and Insurance Guarantee Letters (HMO / LOA)
     * with automatic change calculation and compliant tax receipt generation.
     */
    public function processSplitTenderTransaction(array $data, ?int $userId = null, ?string $cashierName = null): array
    {
        $pdo = Database::connection();

        $patientId = (int)($data['patient_id'] ?? 0);
        $folioId = !empty($data['folio_id']) ? (int)$data['folio_id'] : null;
        $encounterId = !empty($data['encounter_id']) ? (int)$data['encounter_id'] : null;
        $sourceType = trim($data['source_type'] ?? ($folioId ? 'inpatient_folio' : 'general_deposit'));

        $gross = max(0.0, (float)($data['gross_amount'] ?? 0.0));
        $discount = max(0.0, (float)($data['discount_amount'] ?? 0.0));
        $discountType = !empty($data['discount_type']) ? trim($data['discount_type']) : null;
        $net = max(0.0, (float)($data['net_amount'] ?? round($gross - $discount, 2)));

        $tenders = $data['tenders'] ?? [];
        if (!is_array($tenders) || empty($tenders)) {
            throw new RuntimeException("At least one payment tender must be provided.");
        }

        if ($patientId <= 0 && $folioId) {
            $fStmt = $pdo->prepare("SELECT patient_id FROM billing_inpatient_folios WHERE id = ?");
            $fStmt->execute([$folioId]);
            $patientId = (int)$fStmt->fetchColumn();
        }

        if ($patientId <= 0) {
            throw new RuntimeException("Patient ID is required for cashiering transactions.");
        }

        // Validate tenders and compute applied totals and change
        $totalApplied = 0.00;
        $totalTendered = 0.00;
        $totalCashChange = 0.00;

        $sanitizedTenders = [];
        $tenderIndex = 1;

        foreach ($tenders as $t) {
            $method = trim($t['payment_method'] ?? 'cash');
            $applied = round(max(0.0, (float)($t['amount_applied'] ?? 0.0)), 2);
            $tendered = round(max(0.0, (float)($t['amount_tendered'] ?? $applied)), 2);

            if ($applied <= 0.0 && $tendered <= 0.0) {
                continue; // Skip zero tenders
            }

            // For non-cash methods (Card, Check, HMO), tendered is strictly equal to applied
            if ($method !== 'cash') {
                $tendered = $applied;
                $change = 0.00;
            } else {
                // For cash, cash handed over must be at least the applied cash portion
                if ($tendered < $applied) {
                    $tendered = $applied;
                }
                $change = max(0.00, round($tendered - $applied, 2));
            }

            $totalApplied += $applied;
            $totalTendered += $tendered;
            $totalCashChange += $change;

            $sanitizedTenders[] = [
                'tender_index' => $tenderIndex++,
                'payment_method' => $method,
                'amount_applied' => $applied,
                'amount_tendered' => $tendered,
                'change_returned' => $change,
                'card_brand' => !empty($t['card_brand']) ? trim($t['card_brand']) : null,
                'card_last_four' => !empty($t['card_last_four']) ? substr(trim($t['card_last_four']), -4) : null,
                'terminal_reference' => !empty($t['terminal_reference']) ? trim($t['terminal_reference']) : null,
                'terminal_device' => !empty($t['terminal_device']) ? trim($t['terminal_device']) : null,
                'check_number' => !empty($t['check_number']) ? trim($t['check_number']) : null,
                'check_bank' => !empty($t['check_bank']) ? trim($t['check_bank']) : null,
                'check_date' => !empty($t['check_date']) ? trim($t['check_date']) : null,
                'guarantor_name' => !empty($t['guarantor_name']) ? trim($t['guarantor_name']) : null,
                'loa_reference' => !empty($t['loa_reference']) ? trim($t['loa_reference']) : null,
                'online_transfer_ref' => !empty($t['online_transfer_ref']) ? trim($t['online_transfer_ref']) : null,
                'notes' => !empty($t['notes']) ? trim($t['notes']) : null
            ];
        }

        if (empty($sanitizedTenders) || $totalApplied <= 0.0) {
            throw new RuntimeException("Total applied payment across tenders must be greater than zero.");
        }

        if (round($totalApplied, 2) < round($net - 0.05, 2)) {
            $shortage = round($net - $totalApplied, 2);
            throw new RuntimeException("Insufficient payment: Total tenders ($" . number_format($totalApplied, 2) . ") do not cover net bill ($" . number_format($net, 2) . "). Short by $" . number_format($shortage, 2) . ".");
        }

        // Tax calculation: Standard 12% VAT or VAT-exempt for health services / Senior Citizens
        $taxType = trim($data['tax_type'] ?? 'vat_exempt');
        $vatableSales = 0.00;
        $vatExemptSales = 0.00;
        $zeroRatedSales = 0.00;
        $vatAmount = 0.00;

        if ($taxType === 'vatable') {
            $vatableSales = round($net / 1.12, 2);
            $vatAmount = round($net - $vatableSales, 2);
        } elseif ($taxType === 'zero_rated') {
            $zeroRatedSales = $net;
        } else {
            // Default medical exemption under tax laws (BIR Section 109 / Senior Citizen Act)
            $vatExemptSales = $net;
        }

        $cashier = $cashierName ?: 'Main Cashier Desk';
        $terminalId = !empty($data['terminal_id']) ? trim($data['terminal_id']) : 'POS-TERM-01';
        $tin = !empty($data['tax_id_number']) ? trim($data['tax_id_number']) : null;
        $businessName = !empty($data['business_name']) ? trim($data['business_name']) : null;
        $businessAddress = !empty($data['business_address']) ? trim($data['business_address']) : null;
        $notes = !empty($data['notes']) ? trim($data['notes']) : null;

        $pdo->beginTransaction();
        try {
            $txnNo = self::generateTransactionNumber($pdo);
            $receiptNo = self::generateReceiptNumber($pdo);

            $insTxn = $pdo->prepare("
                INSERT INTO billing_cashier_transactions (
                    transaction_number, receipt_number, patient_id, folio_id, encounter_id,
                    source_type, gross_amount, discount_amount, discount_type,
                    net_amount, total_tendered, total_applied, change_due,
                    tax_type, vatable_sales, vat_exempt_sales, zero_rated_sales, vat_amount,
                    tax_id_number, business_name, business_address,
                    cashier_id, cashier_name, terminal_id, notes,
                    status, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    'completed', NOW(), NOW()
                )
            ");
            $insTxn->execute([
                $txnNo, $receiptNo, $patientId, $folioId, $encounterId,
                $sourceType, $gross, $discount, $discountType,
                $net, $totalTendered, $totalApplied, $totalCashChange,
                $taxType, $vatableSales, $vatExemptSales, $zeroRatedSales, $vatAmount,
                $tin, $businessName, $businessAddress,
                $userId, $cashier, $terminalId, $notes
            ]);
            $transactionId = (int)$pdo->lastInsertId();

            // Insert split tenders
            $insTender = $pdo->prepare("
                INSERT INTO billing_cashier_tenders (
                    transaction_id, tender_index, payment_method, amount_applied, amount_tendered, change_returned,
                    card_brand, card_last_four, terminal_reference, terminal_device,
                    check_number, check_bank, check_date,
                    guarantor_name, loa_reference, online_transfer_ref, notes,
                    status, created_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?,
                    'applied', NOW()
                )
            ");

            $tenderSummaries = [];
            foreach ($sanitizedTenders as $st) {
                $insTender->execute([
                    $transactionId, $st['tender_index'], $st['payment_method'], $st['amount_applied'], $st['amount_tendered'], $st['change_returned'],
                    $st['card_brand'], $st['card_last_four'], $st['terminal_reference'], $st['terminal_device'],
                    $st['check_number'], $st['check_bank'], $st['check_date'],
                    $st['guarantor_name'], $st['loa_reference'], $st['online_transfer_ref'], $st['notes']
                ]);

                $sum = ucfirst(str_replace('_', ' ', $st['payment_method'])) . ": $" . number_format($st['amount_applied'], 2);
                if ($st['terminal_reference']) $sum .= " (Ref# " . $st['terminal_reference'] . ")";
                if ($st['loa_reference']) $sum .= " (LOA# " . $st['loa_reference'] . ")";
                if ($st['check_number']) $sum .= " (Chk# " . $st['check_number'] . ")";
                $tenderSummaries[] = $sum;
            }

            $splitSummaryText = implode(" + ", $tenderSummaries);

            // -------------------------------------------------------------
            // INTEGRATION: Link to Inpatient Folio (if applicable)
            // -------------------------------------------------------------
            if ($folioId) {
                $insFolioPay = $pdo->prepare("
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
                $folioNotes = "Split-Tender [{$txnNo}]: " . $splitSummaryText;
                if ($totalCashChange > 0) $folioNotes .= " (Change: $" . number_format($totalCashChange, 2) . ")";

                $insFolioPay->execute([
                    $folioId, $receiptNo, $totalApplied, $txnNo, $cashier,
                    $userId, $folioNotes
                ]);

                // Recalculate inpatient folio financials
                $folioService = new InpatientFolioService();
                $folioService->recalculateFolioFinancials($pdo, $folioId);
            }

            // -------------------------------------------------------------
            // INTEGRATION: Link to Unified Patient Ledger (patient_ledger_payments)
            // -------------------------------------------------------------
            $insLedger = $pdo->prepare("
                INSERT INTO patient_ledger_payments (
                    patient_id, encounter_id, payer_type, payment_type, source,
                    reference_no, status, settled_at, payment_date,
                    payment_amount, notes, created_at, created_by
                ) VALUES (
                    ?, ?, 'patient', 'SPLIT_TENDER', 'counter',
                    ?, 'settled', NOW(), CURDATE(),
                    ?, ?, NOW(), ?
                )
            ");
            $ledgerNote = "Official Receipt [{$receiptNo}] - " . $splitSummaryText;
            if ($totalCashChange > 0) $ledgerNote .= " | Tendered: $" . number_format($totalTendered, 2) . ", Change: $" . number_format($totalCashChange, 2);
            if ($notes) $ledgerNote .= " (" . $notes . ")";

            $insLedger->execute([
                $patientId, $encounterId, $receiptNo,
                $totalApplied, $ledgerNote, $userId
            ]);

            // -------------------------------------------------------------
            // INTEGRATION: Doctor Professional Fee (PF) Commission Crediting
            // Automatically credits doctor commission accounts upon bill settlement
            // -------------------------------------------------------------
            try {
                $commissionService = new \App\Modules\DoctorCommissions\Services\DoctorCommissionService();
                $commissionService->creditCommissionsForSettlement(
                    $transactionId,
                    $folioId,
                    $patientId,
                    $totalApplied,
                    $pdo
                );
            } catch (\Throwable $pfErr) {
                error_log("PF Commission auto-credit notice: " . $pfErr->getMessage());
            }

            $pdo->commit();

            return $this->getTransactionDetail($transactionId);
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Get Complete Cashier Transaction Statement with All Split Tenders & Tax Breakdown
     */
    public function getTransactionDetail(int $transactionId): ?array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("
            SELECT t.*,
                   p.patient_no,
                   p.first_name,
                   p.last_name,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   p.birthdate,
                   p.sex,
                   p.blood_type,
                   p.civil_status,
                   f.folio_number,
                   f.balance_due AS folio_current_balance,
                   ia.admission_number,
                   hb.bed_number,
                   hw.ward_name
            FROM billing_cashier_transactions t
            JOIN patients p ON t.patient_id = p.id
            LEFT JOIN billing_inpatient_folios f ON t.folio_id = f.id
            LEFT JOIN inpatient_admissions ia ON f.admission_id = ia.id
            LEFT JOIN hospital_beds hb ON ia.bed_id = hb.id
            LEFT JOIN hospital_wards hw ON ia.ward_id = hw.id
            WHERE t.id = ?
        ");
        $stmt->execute([$transactionId]);
        $txn = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$txn) {
            return null;
        }

        // Fetch split tenders
        $tenderStmt = $pdo->prepare("
            SELECT *
            FROM billing_cashier_tenders
            WHERE transaction_id = ?
            ORDER BY tender_index ASC, id ASC
        ");
        $tenderStmt->execute([$transactionId]);
        $txn['tenders'] = $tenderStmt->fetchAll(PDO::FETCH_ASSOC);

        return $txn;
    }

    /**
     * List Cashier Transactions with Search, Filters and Pagination
     */
    public function listTransactions(array $filters = []): array
    {
        $pdo = Database::connection();

        $page = max(1, (int)($filters['page'] ?? 1));
        $perPage = min(100, max(5, (int)($filters['per_page'] ?? 15)));
        $offset = ($page - 1) * $perPage;

        $conditions = ["1=1"];
        $params = [];

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $conditions[] = "t.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['payment_method']) && $filters['payment_method'] !== 'all') {
            $conditions[] = "EXISTS (SELECT 1 FROM billing_cashier_tenders ct WHERE ct.transaction_id = t.id AND ct.payment_method = ?)";
            $params[] = $filters['payment_method'];
        }

        if (!empty($filters['date_from'])) {
            $conditions[] = "DATE(t.created_at) >= ?";
            $params[] = $filters['date_from'];
        }

        if (!empty($filters['date_to'])) {
            $conditions[] = "DATE(t.created_at) <= ?";
            $params[] = $filters['date_to'];
        }

        if (!empty($filters['terminal_id'])) {
            $conditions[] = "t.terminal_id = ?";
            $params[] = $filters['terminal_id'];
        }

        if (!empty($filters['q'])) {
            $term = "%" . trim($filters['q']) . "%";
            $conditions[] = "(
                t.transaction_number LIKE ? OR
                t.receipt_number LIKE ? OR
                p.first_name LIKE ? OR
                p.last_name LIKE ? OR
                p.patient_no LIKE ? OR
                t.business_name LIKE ? OR
                EXISTS (SELECT 1 FROM billing_cashier_tenders ct WHERE ct.transaction_id = t.id AND (ct.terminal_reference LIKE ? OR ct.loa_reference LIKE ? OR ct.check_number LIKE ?))
            )";
            $params[] = $term;
            $params[] = $term;
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
            SELECT COUNT(DISTINCT t.id)
            FROM billing_cashier_transactions t
            JOIN patients p ON t.patient_id = p.id
            WHERE {$whereSql}
        ");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        // Fetch page
        $sql = "
            SELECT t.*,
                   p.patient_no,
                   p.first_name,
                   p.last_name,
                   CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
                   f.folio_number,
                   (SELECT COUNT(*) FROM billing_cashier_tenders ct WHERE ct.transaction_id = t.id) AS tender_count,
                   (SELECT GROUP_CONCAT(DISTINCT ct.payment_method SEPARATOR ', ') FROM billing_cashier_tenders ct WHERE ct.transaction_id = t.id) AS methods_used
            FROM billing_cashier_transactions t
            JOIN patients p ON t.patient_id = p.id
            LEFT JOIN billing_inpatient_folios f ON t.folio_id = f.id
            WHERE {$whereSql}
            ORDER BY t.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Format items
        foreach ($items as &$it) {
            $tenderStmt = $pdo->prepare("SELECT payment_method, amount_applied, amount_tendered, change_returned, terminal_reference, loa_reference, check_number, card_brand FROM billing_cashier_tenders WHERE transaction_id = ? ORDER BY tender_index ASC");
            $tenderStmt->execute([$it['id']]);
            $it['tenders'] = $tenderStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        return [
            'items' => $items,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => (int)ceil($total / max(1, $perPage))
        ];
    }

    /**
     * Void a Cashier Transaction with reason and audit log
     */
    public function voidTransaction(int $transactionId, string $reason, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("SELECT * FROM billing_cashier_transactions WHERE id = ?");
        $stmt->execute([$transactionId]);
        $txn = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$txn) {
            throw new RuntimeException("Transaction #{$transactionId} not found.");
        }

        if ($txn['status'] === 'voided') {
            throw new RuntimeException("Transaction #{$transactionId} is already voided.");
        }

        $pdo->beginTransaction();
        try {
            $updTxn = $pdo->prepare("
                UPDATE billing_cashier_transactions
                SET status = 'voided',
                    voided_at = NOW(),
                    voided_by = ?,
                    void_reason = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $updTxn->execute([$userId, $reason, $transactionId]);

            $pdo->prepare("UPDATE billing_cashier_tenders SET status = 'voided' WHERE transaction_id = ?")
                ->execute([$transactionId]);

            // If linked to inpatient folio, void folio payment and recalculate
            if (!empty($txn['folio_id'])) {
                $updFolioPay = $pdo->prepare("
                    UPDATE billing_folio_payments
                    SET status = 'voided',
                        voided_at = NOW(),
                        voided_by = ?,
                        void_reason = ?
                    WHERE receipt_number = ?
                ");
                $updFolioPay->execute([$userId, $reason, $txn['receipt_number']]);

                $folioService = new InpatientFolioService();
                $folioService->recalculateFolioFinancials($pdo, (int)$txn['folio_id']);
            }

            // Void patient ledger record
            $pdo->prepare("
                UPDATE patient_ledger_payments
                SET status = 'voided',
                    notes = CONCAT(COALESCE(notes,''), ' [VOIDED: ', ?, ']')
                WHERE reference_no = ?
            ")->execute([$reason, $txn['receipt_number']]);

            $pdo->commit();
            return $this->getTransactionDetail($transactionId);
        } catch (\Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Cashier End-of-Day Shift Balancing & Tender Summary Report
     */
    public function getShiftSummary(?string $date = null, ?string $terminalId = null): array
    {
        $pdo = Database::connection();
        $targetDate = $date ?: date('Y-m-d');

        $conditions = ["DATE(t.created_at) = ?", "t.status = 'completed'"];
        $params = [$targetDate];

        if ($terminalId) {
            $conditions[] = "t.terminal_id = ?";
            $params[] = $terminalId;
        }

        $whereSql = implode(" AND ", $conditions);

        // Financial aggregates
        $totalsStmt = $pdo->prepare("
            SELECT COUNT(*) AS total_transactions,
                   COALESCE(SUM(gross_amount), 0) AS total_gross,
                   COALESCE(SUM(discount_amount), 0) AS total_discounts,
                   COALESCE(SUM(net_amount), 0) AS total_net,
                   COALESCE(SUM(total_tendered), 0) AS total_tendered,
                   COALESCE(SUM(total_applied), 0) AS total_applied,
                   COALESCE(SUM(change_due), 0) AS total_change_dispensed,
                   COALESCE(SUM(vatable_sales), 0) AS total_vatable,
                   COALESCE(SUM(vat_exempt_sales), 0) AS total_vat_exempt,
                   COALESCE(SUM(vat_amount), 0) AS total_vat_collected
            FROM billing_cashier_transactions t
            WHERE {$whereSql}
        ");
        $totalsStmt->execute($params);
        $summary = $totalsStmt->fetch(PDO::FETCH_ASSOC);

        // Aggregates broken down by payment method
        $tParams = [$targetDate];
        $tConds = ["DATE(t.created_at) = ?", "t.status = 'completed'", "ct.status = 'applied'"];
        if ($terminalId) {
            $tConds[] = "t.terminal_id = ?";
            $tParams[] = $terminalId;
        }
        $tWhere = implode(" AND ", $tConds);

        $tenderTotalsStmt = $pdo->prepare("
            SELECT ct.payment_method,
                   COUNT(ct.id) AS tender_count,
                   COALESCE(SUM(ct.amount_applied), 0) AS total_applied,
                   COALESCE(SUM(ct.amount_tendered), 0) AS total_tendered,
                   COALESCE(SUM(ct.change_returned), 0) AS total_change
            FROM billing_cashier_tenders ct
            JOIN billing_cashier_transactions t ON ct.transaction_id = t.id
            WHERE {$tWhere}
            GROUP BY ct.payment_method
            ORDER BY total_applied DESC
        ");
        $tenderTotalsStmt->execute($tParams);
        $summary['by_method'] = $tenderTotalsStmt->fetchAll(PDO::FETCH_ASSOC);

        $summary['shift_date'] = $targetDate;
        $summary['terminal_id'] = $terminalId ?: 'ALL-TERMINALS';

        return $summary;
    }

    /**
     * Look up billable inpatient folios or ambulatory encounters for checkout selection
     */
    public function getBillableEntities(?int $patientId = null): array
    {
        $pdo = Database::connection();

        $folios = [];
        if ($patientId) {
            $fStmt = $pdo->prepare("
                SELECT f.*,
                       p.first_name, p.last_name, p.patient_no,
                       ia.admission_number, ia.admission_date,
                       hb.bed_number, hw.ward_name
                FROM billing_inpatient_folios f
                JOIN patients p ON f.patient_id = p.id
                JOIN inpatient_admissions ia ON f.admission_id = ia.id
                LEFT JOIN hospital_beds hb ON ia.bed_id = hb.id
                LEFT JOIN hospital_wards hw ON ia.ward_id = hw.id
                WHERE f.patient_id = ? AND f.balance_due > 0
                ORDER BY f.id DESC
            ");
            $fStmt->execute([$patientId]);
            $folios = $fStmt->fetchAll(PDO::FETCH_ASSOC);
        } else {
            $fStmt = $pdo->query("
                SELECT f.*,
                       p.first_name, p.last_name, p.patient_no,
                       ia.admission_number, ia.admission_date,
                       hb.bed_number, hw.ward_name
                FROM billing_inpatient_folios f
                JOIN patients p ON f.patient_id = p.id
                JOIN inpatient_admissions ia ON f.admission_id = ia.id
                LEFT JOIN hospital_beds hb ON ia.bed_id = hb.id
                LEFT JOIN hospital_wards hw ON ia.ward_id = hw.id
                WHERE f.balance_due > 0
                ORDER BY f.id DESC
                LIMIT 25
            ");
            $folios = $fStmt->fetchAll(PDO::FETCH_ASSOC);
        }

        return [
            'folios' => $folios
        ];
    }
}
