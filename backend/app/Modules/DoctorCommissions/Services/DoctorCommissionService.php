<?php

namespace App\Modules\DoctorCommissions\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

class DoctorCommissionService
{
    /**
     * Atomically generate unique commission voucher number PF-COM-YYYY-XXXXX
     */
    public static function generateVoucherNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO billing_tariff_counters (counter_type, year, last_number)
            VALUES ('DOC_COMMISSION', ?, 1)
            ON DUPLICATE KEY UPDATE last_number = last_number + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'DOC_COMMISSION' AND year = ?");
        $sel->execute([$year]);
        $seq = (int)$sel->fetchColumn();

        return sprintf("PF-COM-%d-%05d", $year, $seq);
    }

    /**
     * Atomically generate unique payout batch number PF-PAY-YYYY-XXXXX
     */
    public static function generatePayoutNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO billing_tariff_counters (counter_type, year, last_number)
            VALUES ('DOC_PAYOUT', ?, 1)
            ON DUPLICATE KEY UPDATE last_number = last_number + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'DOC_PAYOUT' AND year = ?");
        $sel->execute([$year]);
        $seq = (int)$sel->fetchColumn();

        return sprintf("PF-PAY-%d-%05d", $year, $seq);
    }

    /**
     * Atomically generate schedule code DFS-YYYY-XXXXX
     */
    public static function generateScheduleCode(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO billing_tariff_counters (counter_type, year, last_number)
            VALUES ('FEE_SCHEDULE', ?, 1)
            ON DUPLICATE KEY UPDATE last_number = last_number + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'FEE_SCHEDULE' AND year = ?");
        $sel->execute([$year]);
        $seq = (int)$sel->fetchColumn();

        return sprintf("DFS-%d-%04d", $year, $seq);
    }

    /**
     * Match the highest priority fee schedule for a given doctor, category, and item code.
     * Hierarchy:
     * 1. Specific Doctor + Specific Item Code
     * 2. Specific Doctor + Category
     * 3. Specific Doctor + 'all_services'
     * 4. Specific Department + Category
     * 5. Global Category Default
     * 6. Global 'all_services' Default
     */
    public function findMatchingSchedule(?int $doctorId, string $category, ?string $itemCode = null, ?int $deptId = null): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("
            SELECT * FROM billing_doctor_fee_schedules
            WHERE is_active = 1
            ORDER BY priority DESC, id ASC
        ");
        $stmt->execute();
        $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Normalize inputs
        $category = strtolower(trim($category));
        $itemCode = !empty($itemCode) ? strtoupper(trim($itemCode)) : null;

        foreach ($schedules as $sched) {
            $sDoc = !empty($sched['doctor_id']) ? (int)$sched['doctor_id'] : null;
            $sDept = !empty($sched['department_id']) ? (int)$sched['department_id'] : null;
            $sCat = strtolower(trim($sched['service_category'] ?? ''));
            $sItem = !empty($sched['item_code']) ? strtoupper(trim($sched['item_code'])) : null;

            // Match 1: Specific Doctor + Specific Item Code
            if ($doctorId && $sDoc === $doctorId && $itemCode && $sItem === $itemCode) {
                return $sched;
            }

            // Match 2: Specific Doctor + Category
            if ($doctorId && $sDoc === $doctorId && ($sCat === $category || $sCat === 'all_services')) {
                return $sched;
            }

            // Match 3: Department + Category
            if ($deptId && $sDept === $deptId && ($sCat === $category || $sCat === 'all_services')) {
                return $sched;
            }

            // Match 4: Global Category match (no specific doctor or dept)
            if ($sDoc === null && $sDept === null && $sCat === $category) {
                return $sched;
            }

            // Match 5: Global Fallback
            if ($sDoc === null && $sDept === null && $sCat === 'all_services') {
                return $sched;
            }
        }

        // System ultimate fallback (70% Doctor / 30% Hospital, 10% Withholding Tax)
        return [
            'id' => null,
            'schedule_code' => 'DFS-FALLBACK-7030',
            'schedule_name' => 'Default Fallback Split (70% Doctor / 30% Hospital)',
            'doctor_percentage' => 70.00,
            'hospital_percentage' => 30.00,
            'withholding_tax_percent' => 10.00,
            'split_type' => 'percentage'
        ];
    }

    /**
     * Compute financial breakdown for a gross Professional Fee
     */
    public function computeCommissionShares(float $grossPf, array $schedule): array
    {
        $grossPf = round(max(0.0, $grossPf), 2);
        $splitType = $schedule['split_type'] ?? 'percentage';

        if ($splitType === 'fixed_amount') {
            $docShareGross = round(min($grossPf, (float)($schedule['fixed_doctor_amount'] ?? 0.0)), 2);
            $hospShare = round(max(0.0, $grossPf - $docShareGross), 2);
            $docPct = $grossPf > 0 ? round(($docShareGross / $grossPf) * 100, 2) : 0.00;
            $hospPct = round(100.00 - $docPct, 2);
        } else {
            $docPct = (float)($schedule['doctor_percentage'] ?? 70.00);
            $hospPct = (float)($schedule['hospital_percentage'] ?? (100.00 - $docPct));
            $docShareGross = round($grossPf * ($docPct / 100.0), 2);
            $hospShare = round($grossPf - $docShareGross, 2);
        }

        $taxRate = (float)($schedule['withholding_tax_percent'] ?? 10.00);
        $taxAmount = round($docShareGross * ($taxRate / 100.0), 2);
        $netPayable = round($docShareGross - $taxAmount, 2);

        return [
            'gross_pf' => $grossPf,
            'doctor_percent' => $docPct,
            'hospital_percent' => $hospPct,
            'hospital_share' => $hospShare,
            'doctor_share_gross' => $docShareGross,
            'withholding_tax_rate' => $taxRate,
            'withholding_tax_amount' => $taxAmount,
            'net_payable' => $netPayable
        ];
    }

    /**
     * Automatically credit doctor commissions upon bill settlement (Cashiering / Folio Payment)
     */
    public function creditCommissionsForSettlement(
        int $cashierTransactionId,
        ?int $folioId,
        int $patientId,
        float $settledAmount,
        ?PDO $externalPdo = null
    ): array {
        $pdo = $externalPdo ?: Database::connection();

        // 1. Fetch Patient Info
        $pStmt = $pdo->prepare("SELECT CONCAT(first_name, ' ', last_name) AS full_name FROM patients WHERE id = ?");
        $pStmt->execute([$patientId]);
        $patientName = $pStmt->fetchColumn() ?: "Patient #{$patientId}";

        // 2. Fetch Cashier Transaction Details
        $tStmt = $pdo->prepare("SELECT transaction_number, receipt_number, source_type, encounter_id FROM billing_cashier_transactions WHERE id = ?");
        $tStmt->execute([$cashierTransactionId]);
        $txn = $tStmt->fetch(PDO::FETCH_ASSOC);
        $sourceRef = $txn ? $txn['transaction_number'] : "TXN-{$cashierTransactionId}";

        $creditedItems = [];

        // CASE A: Settlement linked to an Inpatient Folio
        if ($folioId) {
            // Check if already credited for this transaction/folio to prevent duplicate crediting
            $chk = $pdo->prepare("SELECT COUNT(*) FROM billing_doctor_commission_ledger WHERE folio_id = ? AND cashier_transaction_id = ?");
            $chk->execute([$folioId, $cashierTransactionId]);
            if ((int)$chk->fetchColumn() > 0) {
                return ['status' => 'already_credited', 'credited_count' => 0, 'items' => []];
            }

            // Fetch doctor fee line items from the folio
            $liStmt = $pdo->prepare("
                SELECT id, item_code, item_description, performer_name, gross_amount, net_amount, source_id, source_table
                FROM billing_folio_line_items
                WHERE folio_id = ? AND charge_category = 'doctor_fees' AND status != 'voided'
            ");
            $liStmt->execute([$folioId]);
            $doctorLines = $liStmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch Folio Header Info
            $fStmt = $pdo->prepare("SELECT folio_number, attending_physician, total_doctor_fees FROM billing_inpatient_folios WHERE id = ?");
            $fStmt->execute([$folioId]);
            $folio = $fStmt->fetch(PDO::FETCH_ASSOC);

            if (!empty($doctorLines)) {
                foreach ($doctorLines as $line) {
                    $doctorName = trim($line['performer_name'] ?? '');
                    if (empty($doctorName) && !empty($folio['attending_physician'])) {
                        $doctorName = trim($folio['attending_physician']);
                    }
                    if (empty($doctorName)) {
                        $doctorName = "Hospital Attending Physician";
                    }

                    // Resolve doctor employee record
                    $doctorInfo = $this->resolveDoctorByName($doctorName, $pdo);
                    $doctorId = $doctorInfo['id'] ?? 102; // Default to Dr. Elena Rostova or first active doctor
                    $doctorSpecialty = $doctorInfo['specialty'] ?? 'General Medicine';

                    // Determine category
                    $category = 'daily_ward_round';
                    $desc = strtolower($line['item_description']);
                    if (str_contains($desc, 'surg') || str_contains($desc, 'chole') || str_contains($desc, 'or ')) {
                        $category = 'surgical_lead';
                    } elseif (str_contains($desc, 'anesth')) {
                        $category = 'anesthesiology';
                    } elseif (str_contains($desc, 'consult')) {
                        $category = 'consultation';
                    }

                    $grossPf = (float)$line['net_amount'] > 0 ? (float)$line['net_amount'] : (float)$line['gross_amount'];
                    if ($grossPf <= 0.0) continue;

                    $schedule = $this->findMatchingSchedule($doctorId, $category, $line['item_code']);
                    $split = $this->computeCommissionShares($grossPf, $schedule);

                    $voucherNo = self::generateVoucherNumber($pdo);

                    $ins = $pdo->prepare("
                        INSERT INTO billing_doctor_commission_ledger (
                            voucher_number, schedule_id, doctor_id, doctor_name, doctor_specialty,
                            patient_id, patient_name, folio_id, cashier_transaction_id,
                            source_type, source_reference, item_code, service_description, service_category,
                            gross_pf_amount, split_doctor_percent, split_hospital_percent,
                            hospital_share_amount, doctor_share_gross, withholding_tax_percent,
                            withholding_tax_amount, net_commission_payable, settlement_status,
                            settlement_date, notes, created_at, updated_at
                        ) VALUES (
                            ?, ?, ?, ?, ?,
                            ?, ?, ?, ?,
                            'inpatient_folio', ?, ?, ?, ?,
                            ?, ?, ?,
                            ?, ?, ?,
                            ?, ?, 'earned',
                            NOW(), ?, NOW(), NOW()
                        )
                    ");
                    $ins->execute([
                        $voucherNo,
                        $schedule['id'] ?? null,
                        $doctorId,
                        $doctorName,
                        $doctorSpecialty,
                        $patientId,
                        $patientName,
                        $folioId,
                        $cashierTransactionId,
                        $folio['folio_number'] ?? $sourceRef,
                        $line['item_code'],
                        $line['item_description'],
                        $category,
                        $split['gross_pf'],
                        $split['doctor_percent'],
                        $split['hospital_percent'],
                        $split['hospital_share'],
                        $split['doctor_share_gross'],
                        $split['withholding_tax_rate'],
                        $split['withholding_tax_amount'],
                        $split['net_payable'],
                        "Automated crediting on bill settlement OR# " . ($txn['receipt_number'] ?? 'N/A')
                    ]);

                    $creditedItems[] = [
                        'voucher_number' => $voucherNo,
                        'doctor_name' => $doctorName,
                        'gross_pf' => $split['gross_pf'],
                        'net_payable' => $split['net_payable']
                    ];
                }
            } elseif (!empty($folio['total_doctor_fees']) && (float)$folio['total_doctor_fees'] > 0) {
                // If folio has total_doctor_fees but no itemized lines, credit the full amount to the attending physician
                $doctorName = !empty($folio['attending_physician']) ? trim($folio['attending_physician']) : "Hospital Attending Physician";
                $doctorInfo = $this->resolveDoctorByName($doctorName, $pdo);
                $doctorId = $doctorInfo['id'] ?? 102;
                $doctorSpecialty = $doctorInfo['specialty'] ?? 'General Medicine';

                $grossPf = (float)$folio['total_doctor_fees'];
                $schedule = $this->findMatchingSchedule($doctorId, 'daily_ward_round');
                $split = $this->computeCommissionShares($grossPf, $schedule);
                $voucherNo = self::generateVoucherNumber($pdo);

                $ins = $pdo->prepare("
                    INSERT INTO billing_doctor_commission_ledger (
                        voucher_number, schedule_id, doctor_id, doctor_name, doctor_specialty,
                        patient_id, patient_name, folio_id, cashier_transaction_id,
                        source_type, source_reference, item_code, service_description, service_category,
                        gross_pf_amount, split_doctor_percent, split_hospital_percent,
                        hospital_share_amount, doctor_share_gross, withholding_tax_percent,
                        withholding_tax_amount, net_commission_payable, settlement_status,
                        settlement_date, notes, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        'inpatient_folio', ?, 'DOC-ROUNDS-CONS', 'Attending Physician Inpatient Ward Care & Daily Rounds', 'daily_ward_round',
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, 'earned',
                        NOW(), ?, NOW(), NOW()
                    )
                ");
                $ins->execute([
                    $voucherNo,
                    $schedule['id'] ?? null,
                    $doctorId,
                    $doctorName,
                    $doctorSpecialty,
                    $patientId,
                    $patientName,
                    $folioId,
                    $cashierTransactionId,
                    $folio['folio_number'] ?? $sourceRef,
                    $split['gross_pf'],
                    $split['doctor_percent'],
                    $split['hospital_percent'],
                    $split['hospital_share'],
                    $split['doctor_share_gross'],
                    $split['withholding_tax_rate'],
                    $split['withholding_tax_amount'],
                    $split['net_payable'],
                    "Automated Inpatient Doctor PF settlement credit (Folio: {$folio['folio_number']})"
                ]);

                $creditedItems[] = [
                    'voucher_number' => $voucherNo,
                    'doctor_name' => $doctorName,
                    'gross_pf' => $split['gross_pf'],
                    'net_payable' => $split['net_payable']
                ];
            }
        }

        // CASE B: Ambulatory Encounter Checkout or Standalone Cashiering
        if (!$folioId && $txn && !empty($txn['encounter_id'])) {
            $encStmt = $pdo->prepare("
                SELECT e.id, COALESCE(e.encounter_provider_id, e.referring_provider_id) AS provider_id,
                       CONCAT(emp.first_name, ' ', emp.last_name) AS provider_name,
                       p.specialty
                FROM encounters e
                LEFT JOIN providers prov ON COALESCE(e.encounter_provider_id, e.referring_provider_id) = prov.id
                LEFT JOIN employees emp ON prov.employee_id = emp.id
                LEFT JOIN providers p ON p.employee_id = emp.id
                WHERE e.id = ?
            ");
            $encStmt->execute([(int)$txn['encounter_id']]);
            $enc = $encStmt->fetch(PDO::FETCH_ASSOC);

            if ($enc && !empty($enc['provider_name'])) {
                $doctorName = "Dr. " . ltrim($enc['provider_name'], 'Dr. ');
                $doctorInfo = $this->resolveDoctorByName($doctorName, $pdo);
                $doctorId = $doctorInfo['id'] ?? 103;
                $doctorSpecialty = $doctorInfo['specialty'] ?? ($enc['specialty'] ?? 'Cardiology / Internal Medicine');

                $grossPf = $settledAmount > 0 ? $settledAmount : 150.00;
                $schedule = $this->findMatchingSchedule($doctorId, 'consultation');
                $split = $this->computeCommissionShares($grossPf, $schedule);
                $voucherNo = self::generateVoucherNumber($pdo);

                $ins = $pdo->prepare("
                    INSERT INTO billing_doctor_commission_ledger (
                        voucher_number, schedule_id, doctor_id, doctor_name, doctor_specialty,
                        patient_id, patient_name, folio_id, cashier_transaction_id,
                        source_type, source_reference, item_code, service_description, service_category,
                        gross_pf_amount, split_doctor_percent, split_hospital_percent,
                        hospital_share_amount, doctor_share_gross, withholding_tax_percent,
                        withholding_tax_amount, net_commission_payable, settlement_status,
                        settlement_date, notes, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, ?, ?,
                        ?, ?, NULL, ?,
                        'ambulatory_encounter', ?, 'DOC-CONS-OPD', 'Outpatient Specialist Consultation & Assessment', 'consultation',
                        ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, 'earned',
                        NOW(), ?, NOW(), NOW()
                    )
                ");
                $ins->execute([
                    $voucherNo,
                    $schedule['id'] ?? null,
                    $doctorId,
                    $doctorName,
                    $doctorSpecialty,
                    $patientId,
                    $patientName,
                    $cashierTransactionId,
                    $sourceRef,
                    $split['gross_pf'],
                    $split['doctor_percent'],
                    $split['hospital_percent'],
                    $split['hospital_share'],
                    $split['doctor_share_gross'],
                    $split['withholding_tax_rate'],
                    $split['withholding_tax_amount'],
                    $split['net_payable'],
                    "Automated ambulatory consultation PF credit from cashier transaction {$sourceRef}"
                ]);

                $creditedItems[] = [
                    'voucher_number' => $voucherNo,
                    'doctor_name' => $doctorName,
                    'gross_pf' => $split['gross_pf'],
                    'net_payable' => $split['net_payable']
                ];
            }
        }

        return [
            'status' => 'success',
            'credited_count' => count($creditedItems),
            'items' => $creditedItems
        ];
    }

    /**
     * Helper to match doctor string against employees table
     */
    public function resolveDoctorByName(string $name, ?PDO $pdo = null): array
    {
        $pdo = $pdo ?: Database::connection();
        $cleanName = trim(preg_replace('/^Dr\.?\s*/i', '', $name));
        $parts = preg_split('/\s+/', $cleanName);
        $lastName = end($parts);

        $stmt = $pdo->prepare("
            SELECT e.id, CONCAT('Dr. ', e.first_name, ' ', e.last_name) AS full_name,
                   COALESCE(p.specialty, 'Attending Physician') AS specialty
            FROM employees e
            LEFT JOIN providers p ON p.employee_id = e.id
            JOIN users u ON e.user_id = u.id
            WHERE (e.last_name LIKE ? OR e.first_name LIKE ?) AND u.role_id = 3
            LIMIT 1
        ");
        $stmt->execute(['%' . $lastName . '%', '%' . $cleanName . '%']);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row) {
            return $row;
        }

        // Fallback default
        return [
            'id' => 102,
            'full_name' => $name,
            'specialty' => 'Medical Specialist'
        ];
    }

    /**
     * Retrieve Commission Metrics for Dashboard Cards
     */
    public function getCommissionMetrics(): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->query("
            SELECT 
                COUNT(*) AS total_transactions_count,
                COALESCE(SUM(gross_pf_amount), 0) AS total_gross_pf,
                COALESCE(SUM(hospital_share_amount), 0) AS total_hospital_share,
                COALESCE(SUM(doctor_share_gross), 0) AS total_doctor_share_gross,
                COALESCE(SUM(withholding_tax_amount), 0) AS total_withholding_tax,
                COALESCE(SUM(net_commission_payable), 0) AS total_net_payable,
                COALESCE(SUM(CASE WHEN settlement_status = 'disbursed' THEN net_commission_payable ELSE 0 END), 0) AS total_disbursed,
                COALESCE(SUM(CASE WHEN settlement_status IN ('earned', 'approved_for_payout') THEN net_commission_payable ELSE 0 END), 0) AS total_pending_payout,
                COUNT(DISTINCT doctor_id) AS active_doctors_count
            FROM billing_doctor_commission_ledger
            WHERE settlement_status != 'voided'
        ");
        $m = $stmt->fetch(PDO::FETCH_ASSOC);

        $schedStmt = $pdo->query("SELECT COUNT(*) FROM billing_doctor_fee_schedules WHERE is_active = 1");
        $m['active_schedules_count'] = (int)$schedStmt->fetchColumn();

        $payoutStmt = $pdo->query("SELECT COUNT(*) FROM billing_doctor_payouts WHERE status = 'disbursed'");
        $m['disbursed_batches_count'] = (int)$payoutStmt->fetchColumn();

        return $m;
    }

    /**
     * List Doctor Commission Ledger entries with rich filtering & pagination
     */
    public function listLedgerEntries(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();
        $offset = max(0, ($page - 1) * $perPage);

        $where = ["l.settlement_status != 'voided'"];
        $params = [];

        if (!empty($filters['doctor_id'])) {
            $where[] = "l.doctor_id = ?";
            $params[] = (int)$filters['doctor_id'];
        }

        if (!empty($filters['status'])) {
            $where[] = "l.settlement_status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['category'])) {
            $where[] = "l.service_category = ?";
            $params[] = $filters['category'];
        }

        if (!empty($filters['start_date'])) {
            $where[] = "DATE(l.settlement_date) >= ?";
            $params[] = $filters['start_date'];
        }

        if (!empty($filters['end_date'])) {
            $where[] = "DATE(l.settlement_date) <= ?";
            $params[] = $filters['end_date'];
        }

        if (!empty($filters['q'])) {
            $kw = '%' . trim($filters['q']) . '%';
            $where[] = "(l.voucher_number LIKE ? OR l.doctor_name LIKE ? OR l.patient_name LIKE ? OR l.service_description LIKE ? OR l.source_reference LIKE ?)";
            $params[] = $kw;
            $params[] = $kw;
            $params[] = $kw;
            $params[] = $kw;
            $params[] = $kw;
        }

        $whereSql = implode(" AND ", $where);

        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM billing_doctor_commission_ledger l WHERE {$whereSql}");
        $countStmt->execute($params);
        $total = (int)$countStmt->fetchColumn();

        $sql = "
            SELECT 
                l.*,
                s.schedule_name,
                p.payout_number,
                p.payment_reference,
                p.payout_method
            FROM billing_doctor_commission_ledger l
            LEFT JOIN billing_doctor_fee_schedules s ON l.schedule_id = s.id
            LEFT JOIN billing_doctor_payouts p ON l.payout_id = p.id
            WHERE {$whereSql}
            ORDER BY l.settlement_date DESC, l.id DESC
            LIMIT ? OFFSET ?
        ";
        $stmt = $pdo->prepare($sql);
        $execParams = array_merge($params, [$perPage, $offset]);
        $stmt->execute($execParams);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => (int)ceil($total / $perPage),
            'records' => $records
        ];
    }

    /**
     * Get Consolidated Doctor Statements (Earnings per Doctor)
     */
    public function getDoctorStatements(array $filters = []): array
    {
        $pdo = Database::connection();

        $where = ["l.settlement_status != 'voided'"];
        $params = [];

        if (!empty($filters['start_date'])) {
            $where[] = "DATE(l.settlement_date) >= ?";
            $params[] = $filters['start_date'];
        }
        if (!empty($filters['end_date'])) {
            $where[] = "DATE(l.settlement_date) <= ?";
            $params[] = $filters['end_date'];
        }
        $whereSql = implode(" AND ", $where);

        $sql = "
            SELECT 
                l.doctor_id,
                l.doctor_name,
                l.doctor_specialty,
                COUNT(*) AS total_encounters,
                SUM(l.gross_pf_amount) AS total_gross_pf,
                SUM(l.hospital_share_amount) AS total_hospital_share,
                SUM(l.doctor_share_gross) AS total_doctor_gross,
                SUM(l.withholding_tax_amount) AS total_tax_withheld,
                SUM(l.net_commission_payable) AS total_net_earned,
                SUM(CASE WHEN l.settlement_status = 'disbursed' THEN l.net_commission_payable ELSE 0 END) AS total_disbursed,
                SUM(CASE WHEN l.settlement_status IN ('earned', 'approved_for_payout') THEN l.net_commission_payable ELSE 0 END) AS pending_payable,
                MAX(l.settlement_date) AS last_settled_at
            FROM billing_doctor_commission_ledger l
            WHERE {$whereSql}
            GROUP BY l.doctor_id, l.doctor_name, l.doctor_specialty
            ORDER BY pending_payable DESC, total_net_earned DESC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Issue Payout Disbursement to a Doctor
     */
    public function disbursePayout(int $doctorId, array $entryIds = [], array $payoutData = [], ?string $userName = null): array
    {
        $pdo = Database::connection();

        if (empty($entryIds)) {
            // Disburse all pending earned items for this doctor
            $eStmt = $pdo->prepare("
                SELECT id FROM billing_doctor_commission_ledger
                WHERE doctor_id = ? AND settlement_status IN ('earned', 'approved_for_payout')
            ");
            $eStmt->execute([$doctorId]);
            $entryIds = $eStmt->fetchAll(PDO::FETCH_COLUMN);
        }

        if (empty($entryIds)) {
            throw new RuntimeException("No pending commissions found to disburse for this doctor.");
        }

        $inClause = implode(',', array_map('intval', $entryIds));
        $sumStmt = $pdo->query("
            SELECT 
                COUNT(*) as items_count,
                COALESCE(SUM(gross_pf_amount), 0) AS total_gross_pf,
                COALESCE(SUM(hospital_share_amount), 0) AS total_hospital_share,
                COALESCE(SUM(doctor_share_gross), 0) AS total_doctor_gross,
                COALESCE(SUM(withholding_tax_amount), 0) AS total_tax_withheld,
                COALESCE(SUM(net_commission_payable), 0) AS total_net_payout,
                MIN(DATE(settlement_date)) AS period_start,
                MAX(DATE(settlement_date)) AS period_end,
                doctor_name,
                doctor_specialty
            FROM billing_doctor_commission_ledger
            WHERE id IN ({$inClause}) AND doctor_id = {$doctorId}
        ");
        $summary = $sumStmt->fetch(PDO::FETCH_ASSOC);

        if (!$summary || (int)$summary['items_count'] === 0) {
            throw new RuntimeException("Invalid commission items selected for payout.");
        }

        $pdo->beginTransaction();
        try {
            $payoutNo = self::generatePayoutNumber($pdo);
            $method = $payoutData['payout_method'] ?? 'bank_transfer';
            $ref = $payoutData['payment_reference'] ?? ('REF-' . strtoupper(substr(md5(uniqid()), 0, 8)));
            $notes = $payoutData['notes'] ?? "Doctor PF Share commission disbursement voucher";
            $disbursedBy = $userName ?: "Hospital Finance Desk";

            $ins = $pdo->prepare("
                INSERT INTO billing_doctor_payouts (
                    payout_number, doctor_id, doctor_name, doctor_specialty,
                    period_start, period_end, items_count,
                    total_gross_pf, total_hospital_share, total_doctor_gross,
                    total_tax_withheld, total_net_payout, payout_method,
                    payment_reference, disbursed_by_user, status, notes,
                    created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, 'disbursed', ?,
                    NOW(), NOW()
                )
            ");
            $ins->execute([
                $payoutNo,
                $doctorId,
                $summary['doctor_name'],
                $summary['doctor_specialty'],
                $summary['period_start'] ?: date('Y-m-01'),
                $summary['period_end'] ?: date('Y-m-d'),
                $summary['items_count'],
                $summary['total_gross_pf'],
                $summary['total_hospital_share'],
                $summary['total_doctor_gross'],
                $summary['total_tax_withheld'],
                $summary['total_net_payout'],
                $method,
                $ref,
                $disbursedBy,
                $notes
            ]);
            $payoutId = (int)$pdo->lastInsertId();

            // Mark ledger items as disbursed
            $upd = $pdo->prepare("
                UPDATE billing_doctor_commission_ledger
                SET settlement_status = 'disbursed',
                    payout_id = ?,
                    disbursement_reference = ?,
                    disbursed_at = NOW(),
                    updated_at = NOW()
                WHERE id IN ({$inClause}) AND doctor_id = ?
            ");
            $upd->execute([$payoutId, $payoutNo, $doctorId]);

            $pdo->commit();

            return [
                'status' => 'success',
                'payout_id' => $payoutId,
                'payout_number' => $payoutNo,
                'items_count' => (int)$summary['items_count'],
                'doctor_name' => $summary['doctor_name'],
                'total_net_payout' => (float)$summary['total_net_payout'],
                'disbursed_at' => date('Y-m-d H:i:s')
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * List all active and archived fee schedules
     */
    public function listFeeSchedules(): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->query("
            SELECT s.*, 
                   COUNT(l.id) AS total_commission_hits,
                   COALESCE(SUM(l.gross_pf_amount), 0) AS total_volume_generated
            FROM billing_doctor_fee_schedules s
            LEFT JOIN billing_doctor_commission_ledger l ON l.schedule_id = s.id
            GROUP BY s.id
            ORDER BY s.is_active DESC, s.priority DESC, s.schedule_code ASC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Save / Upsert a Doctor Fee Schedule
     */
    public function saveFeeSchedule(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $id = !empty($data['id']) ? (int)$data['id'] : null;
        $name = trim($data['schedule_name'] ?? '');
        if (empty($name)) {
            throw new RuntimeException("Schedule name is required.");
        }

        $docId = !empty($data['doctor_id']) ? (int)$data['doctor_id'] : null;
        $docName = null;
        if ($docId) {
            $dStmt = $pdo->prepare("SELECT CONCAT('Dr. ', first_name, ' ', last_name) FROM employees WHERE id = ?");
            $dStmt->execute([$docId]);
            $docName = $dStmt->fetchColumn() ?: null;
        }

        $category = trim($data['service_category'] ?? 'all_services');
        $itemCode = !empty($data['item_code']) ? strtoupper(trim($data['item_code'])) : null;
        $splitType = trim($data['split_type'] ?? 'percentage');
        $docPct = round(max(0.0, min(100.0, (float)($data['doctor_percentage'] ?? 70.00))), 2);
        $hospPct = round(100.00 - $docPct, 2);
        $fixedDoc = round(max(0.0, (float)($data['fixed_doctor_amount'] ?? 0.0)), 2);
        $fixedHosp = round(max(0.0, (float)($data['fixed_hospital_amount'] ?? 0.0)), 2);
        $taxPct = round(max(0.0, min(100.0, (float)($data['withholding_tax_percent'] ?? 10.00))), 2);
        $priority = (int)($data['priority'] ?? ($docId ? 75 : 20));
        $notes = !empty($data['notes']) ? trim($data['notes']) : null;
        $isActive = isset($data['is_active']) ? (int)$data['is_active'] : 1;

        if ($id) {
            $stmt = $pdo->prepare("
                UPDATE billing_doctor_fee_schedules SET
                    schedule_name = ?,
                    doctor_id = ?,
                    doctor_name = ?,
                    service_category = ?,
                    item_code = ?,
                    split_type = ?,
                    doctor_percentage = ?,
                    hospital_percentage = ?,
                    fixed_doctor_amount = ?,
                    fixed_hospital_amount = ?,
                    withholding_tax_percent = ?,
                    priority = ?,
                    is_active = ?,
                    notes = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $stmt->execute([
                $name, $docId, $docName, $category, $itemCode, $splitType,
                $docPct, $hospPct, $fixedDoc, $fixedHosp, $taxPct,
                $priority, $isActive, $notes, $id
            ]);
            return ['status' => 'updated', 'id' => $id];
        } else {
            $code = !empty($data['schedule_code']) ? trim($data['schedule_code']) : self::generateScheduleCode($pdo);
            $stmt = $pdo->prepare("
                INSERT INTO billing_doctor_fee_schedules (
                    schedule_code, schedule_name, doctor_id, doctor_name,
                    service_category, item_code, split_type,
                    doctor_percentage, hospital_percentage,
                    fixed_doctor_amount, fixed_hospital_amount,
                    withholding_tax_percent, priority, is_active, notes,
                    created_by, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?,
                    ?, ?,
                    ?, ?, ?, ?,
                    ?, NOW(), NOW()
                )
            ");
            $stmt->execute([
                $code, $name, $docId, $docName,
                $category, $itemCode, $splitType,
                $docPct, $hospPct,
                $fixedDoc, $fixedHosp,
                $taxPct, $priority, $isActive, $notes,
                $userId
            ]);
            return ['status' => 'created', 'id' => (int)$pdo->lastInsertId(), 'schedule_code' => $code];
        }
    }

    /**
     * Manually record an ad-hoc doctor commission item (for procedures, on-call visits, or adjustments)
     */
    public function recordManualCommission(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $doctorId = (int)($data['doctor_id'] ?? 0);
        if ($doctorId <= 0) {
            throw new RuntimeException("Doctor ID is required.");
        }

        $dStmt = $pdo->prepare("
            SELECT CONCAT('Dr. ', e.first_name, ' ', e.last_name) AS full_name,
                   COALESCE(p.specialty, 'Attending Physician') AS specialty
            FROM employees e
            LEFT JOIN providers p ON p.employee_id = e.id
            WHERE e.id = ?
        ");
        $dStmt->execute([$doctorId]);
        $doc = $dStmt->fetch(PDO::FETCH_ASSOC);
        $doctorName = $doc ? $doc['full_name'] : "Dr. Physician #{$doctorId}";
        $specialty = $doc ? $doc['specialty'] : "General Practice";

        $patientId = (int)($data['patient_id'] ?? 0);
        $pStmt = $pdo->prepare("SELECT CONCAT(first_name, ' ', last_name) FROM patients WHERE id = ?");
        $pStmt->execute([$patientId]);
        $patientName = $pStmt->fetchColumn() ?: "Ad-hoc Patient";

        $grossPf = round(max(0.0, (float)($data['gross_pf_amount'] ?? 0.0)), 2);
        if ($grossPf <= 0.0) {
            throw new RuntimeException("Gross Professional Fee must be greater than zero.");
        }

        $category = trim($data['service_category'] ?? 'consultation');
        $itemCode = !empty($data['item_code']) ? strtoupper(trim($data['item_code'])) : 'MAN-PF-001';
        $desc = !empty($data['service_description']) ? trim($data['service_description']) : 'Manual Doctor Professional Fee Assessment';

        $schedule = $this->findMatchingSchedule($doctorId, $category, $itemCode);
        $split = $this->computeCommissionShares($grossPf, $schedule);
        $voucherNo = self::generateVoucherNumber($pdo);

        $stmt = $pdo->prepare("
            INSERT INTO billing_doctor_commission_ledger (
                voucher_number, schedule_id, doctor_id, doctor_name, doctor_specialty,
                patient_id, patient_name, source_type, source_reference,
                item_code, service_description, service_category,
                gross_pf_amount, split_doctor_percent, split_hospital_percent,
                hospital_share_amount, doctor_share_gross, withholding_tax_percent,
                withholding_tax_amount, net_commission_payable, settlement_status,
                settlement_date, notes, created_at, updated_at
            ) VALUES (
                ?, ?, ?, ?, ?,
                ?, ?, 'manual_adjustment', ?,
                ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?,
                ?, ?, 'earned',
                NOW(), ?, NOW(), NOW()
            )
        ");
        $sourceRef = "MAN-" . date('Ymd') . "-" . rand(100, 999);
        $stmt->execute([
            $voucherNo,
            $schedule['id'] ?? null,
            $doctorId,
            $doctorName,
            $specialty,
            $patientId,
            $patientName,
            $sourceRef,
            $itemCode,
            $desc,
            $category,
            $split['gross_pf'],
            $split['doctor_percent'],
            $split['hospital_percent'],
            $split['hospital_share'],
            $split['doctor_share_gross'],
            $split['withholding_tax_rate'],
            $split['withholding_tax_amount'],
            $split['net_payable'],
            $data['notes'] ?? "Manual entry by Biller/Finance"
        ]);

        return [
            'status' => 'success',
            'id' => (int)$pdo->lastInsertId(),
            'voucher_number' => $voucherNo,
            'net_payable' => $split['net_payable']
        ];
    }

    /**
     * Seed realistic sample doctor commission data across top physicians
     * to immediately populate the interactive commission dashboard
     */
    public function seedDemoCommissions(): array
    {
        $pdo = Database::connection();

        // Check if ledger already has data
        $cnt = (int)$pdo->query("SELECT COUNT(*) FROM billing_doctor_commission_ledger")->fetchColumn();
        if ($cnt >= 6) {
            return ['status' => 'already_seeded', 'count' => $cnt];
        }

        // Realistic seed cases
        $seedCases = [
            [
                'doctor_id' => 102,
                'doctor_name' => 'Dr. Elena Rostova',
                'doctor_specialty' => 'Chief of Surgery / Laparoscopy',
                'patient_id' => 1,
                'patient_name' => 'Eleanor Vance',
                'source_type' => 'inpatient_folio',
                'source_ref' => 'FOL-2026-00001',
                'item_code' => 'SRV-SURG-LAP-01',
                'desc' => 'Lead Surgeon: Laparoscopic Cholecystectomy (3-Port)',
                'cat' => 'surgical_lead',
                'gross' => 1500.00
            ],
            [
                'doctor_id' => 102,
                'doctor_name' => 'Dr. Elena Rostova',
                'doctor_specialty' => 'Chief of Surgery / Laparoscopy',
                'patient_id' => 2,
                'patient_name' => 'Marcus Vance',
                'source_type' => 'inpatient_folio',
                'source_ref' => 'FOL-2026-00002',
                'item_code' => 'SRV-ROUNDS-01',
                'desc' => 'Inpatient Post-Op Ward Rounds (Day 1-3)',
                'cat' => 'daily_ward_round',
                'gross' => 450.00
            ],
            [
                'doctor_id' => 103,
                'doctor_name' => 'Dr. Jonathan Hayes',
                'doctor_specialty' => 'Interventional Cardiology',
                'patient_id' => 1,
                'patient_name' => 'Eleanor Vance',
                'source_type' => 'ambulatory_encounter',
                'source_ref' => 'TXN-2026-00002',
                'item_code' => 'SRV-CONS-CARDIO',
                'desc' => 'Comprehensive Cardiology Diagnostic Consultation & ECG',
                'cat' => 'consultation',
                'gross' => 250.00
            ],
            [
                'doctor_id' => 104,
                'doctor_name' => 'Dr. Arthur Sterling',
                'doctor_specialty' => 'Senior Anesthesiologist',
                'patient_id' => 1,
                'patient_name' => 'Eleanor Vance',
                'source_type' => 'inpatient_folio',
                'source_ref' => 'FOL-2026-00001',
                'item_code' => 'SRV-ANES-GEN-01',
                'desc' => 'General Endotracheal Anesthesia (Laparoscopic Case 120 mins)',
                'cat' => 'anesthesiology',
                'gross' => 650.00
            ],
            [
                'doctor_id' => 105,
                'doctor_name' => 'Dr. Sarah Lin',
                'doctor_specialty' => 'Diagnostic Radiology',
                'patient_id' => 2,
                'patient_name' => 'Marcus Vance',
                'source_type' => 'cashier_transaction',
                'source_ref' => 'TXN-2026-00003',
                'item_code' => 'RAD-CT-ABD-READ',
                'desc' => 'Professional Interpretation: Abdominal CT with Contrast',
                'cat' => 'diagnostic_reading',
                'gross' => 180.00
            ],
            [
                'doctor_id' => 109,
                'doctor_name' => 'Dr. Sofia Morales',
                'doctor_specialty' => 'Emergency Medicine',
                'patient_id' => 1,
                'patient_name' => 'Eleanor Vance',
                'source_type' => 'cashier_transaction',
                'source_ref' => 'TXN-2026-00001',
                'item_code' => 'ER-STAT-CALL',
                'desc' => 'Emergency STAT On-Call Specialist Resuscitation Coverage',
                'cat' => 'emergency_call',
                'gross' => 400.00
            ]
        ];

        $inserted = 0;
        foreach ($seedCases as $sc) {
            $schedule = $this->findMatchingSchedule($sc['doctor_id'], $sc['cat'], $sc['item_code']);
            $split = $this->computeCommissionShares($sc['gross'], $schedule);
            $voucherNo = self::generateVoucherNumber($pdo);

            $ins = $pdo->prepare("
                INSERT INTO billing_doctor_commission_ledger (
                    voucher_number, schedule_id, doctor_id, doctor_name, doctor_specialty,
                    patient_id, patient_name, source_type, source_reference,
                    item_code, service_description, service_category,
                    gross_pf_amount, split_doctor_percent, split_hospital_percent,
                    hospital_share_amount, doctor_share_gross, withholding_tax_percent,
                    withholding_tax_amount, net_commission_payable, settlement_status,
                    settlement_date, notes, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, 'earned',
                    NOW(), 'Demo clinical case settlement', NOW(), NOW()
                )
            ");
            $ins->execute([
                $voucherNo,
                $schedule['id'] ?? null,
                $sc['doctor_id'],
                $sc['doctor_name'],
                $sc['doctor_specialty'],
                $sc['patient_id'],
                $sc['patient_name'],
                $sc['source_type'],
                $sc['source_ref'],
                $sc['item_code'],
                $sc['desc'],
                $sc['cat'],
                $split['gross_pf'],
                $split['doctor_percent'],
                $split['hospital_percent'],
                $split['hospital_share'],
                $split['doctor_share_gross'],
                $split['withholding_tax_rate'],
                $split['withholding_tax_amount'],
                $split['net_payable']
            ]);
            $inserted++;
        }

        return ['status' => 'seeded', 'count' => $inserted];
    }
}
