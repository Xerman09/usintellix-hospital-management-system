<?php

namespace App\Modules\Payroll\Services;

use App\Core\Database;
use PDO;
use RuntimeException;

class DoctorCommissionPullService
{
    /**
     * Pull settled doctor professional fee (PF) shares from Billing (Subsystem 6)
     * Categorizes into:
     * 1. Consultations (Outpatient, ambulatory assessments)
     * 2. Inpatient Ward Rounds (Daily bed rounds, ICU attendings)
     * 3. Surgical Procedures (Lead surgeon, assistant surgeon, anesthesiology)
     * 4. Diagnostic Readings & Emergency Calls
     */
    public function pullDoctorSettledShares(
        int $doctorId,
        ?string $startDate = null,
        ?string $endDate = null,
        ?string $statusFilter = null
    ): array {
        $pdo = Database::connection();

        // 1. Fetch Doctor details from employees, providers, and salary structures
        $docStmt = $pdo->prepare("
            SELECT 
                e.id,
                CONCAT(e.first_name, ' ', e.last_name) AS full_name,
                e.email,
                e.phone,
                d.name AS department_name,
                p.specialty,
                s.id AS salary_structure_id,
                s.base_salary,
                s.hourly_rate,
                s.pay_frequency
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN providers p ON p.employee_id = e.id
            LEFT JOIN hr_salary_structures s ON s.employee_id = e.id AND s.is_active = 1
            WHERE e.id = ?
        ");
        $docStmt->execute([$doctorId]);
        $doctor = $docStmt->fetch(PDO::FETCH_ASSOC);

        if (!$doctor) {
            // Check by provider ID or fallback
            $pCheck = $pdo->prepare("
                SELECT e.id FROM providers p JOIN employees e ON p.employee_id = e.id WHERE p.id = ?
            ");
            $pCheck->execute([$doctorId]);
            $altEmpId = $pCheck->fetchColumn();
            if ($altEmpId) {
                return $this->pullDoctorSettledShares((int)$altEmpId, $startDate, $endDate, $statusFilter);
            }
            throw new RuntimeException("Doctor / Physician record not found for ID {$doctorId}.");
        }

        // 2. Build Where Clause for billing_doctor_commission_ledger
        // Doctor can be linked via doctor_id = employee_id OR doctor_name matching
        $where = ["(l.doctor_id = ? OR l.doctor_name LIKE ?)", "l.settlement_status != 'voided'"];
        $params = [$doctorId, '%' . trim($doctor['full_name']) . '%'];

        if (!empty($startDate)) {
            $where[] = "DATE(l.settlement_date) >= ?";
            $params[] = $startDate;
        }

        if (!empty($endDate)) {
            $where[] = "DATE(l.settlement_date) <= ?";
            $params[] = $endDate;
        }

        if (!empty($statusFilter)) {
            $statuses = array_map('trim', explode(',', $statusFilter));
            $placeholders = implode(',', array_fill(0, count($statuses), '?'));
            $where[] = "l.settlement_status IN ({$placeholders})";
            foreach ($statuses as $st) {
                $params[] = $st;
            }
        }

        $whereSql = implode(' AND ', $where);

        $sql = "
            SELECT 
                l.id,
                l.voucher_number,
                l.schedule_id,
                l.doctor_id,
                l.doctor_name,
                l.doctor_specialty,
                l.patient_id,
                l.patient_name,
                l.folio_id,
                l.cashier_transaction_id,
                l.source_type,
                l.source_reference,
                l.item_code,
                l.service_description,
                l.service_category,
                l.gross_pf_amount,
                l.split_doctor_percent,
                l.split_hospital_percent,
                l.hospital_share_amount,
                l.doctor_share_gross,
                l.withholding_tax_percent,
                l.withholding_tax_amount,
                l.net_commission_payable,
                l.settlement_status,
                l.payout_id,
                l.disbursement_reference,
                l.settlement_date,
                l.notes,
                l.created_at
            FROM billing_doctor_commission_ledger l
            WHERE {$whereSql}
            ORDER BY l.settlement_date DESC, l.id DESC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // 3. Categorize into Consultations, Ward Rounds, Surgical Procedures, and Others
        $consultations = [
            'category_key' => 'consultations',
            'category_name' => 'Outpatient Consultations & Assessments',
            'icon' => 'fa-stethoscope',
            'count' => 0,
            'gross_pf' => 0.0,
            'hospital_share' => 0.0,
            'doctor_share_gross' => 0.0,
            'tax_withheld' => 0.0,
            'net_commission' => 0.0,
            'items' => []
        ];

        $wardRounds = [
            'category_key' => 'ward_rounds',
            'category_name' => 'Inpatient Daily Ward Rounds',
            'icon' => 'fa-bed',
            'count' => 0,
            'gross_pf' => 0.0,
            'hospital_share' => 0.0,
            'doctor_share_gross' => 0.0,
            'tax_withheld' => 0.0,
            'net_commission' => 0.0,
            'items' => []
        ];

        $surgical = [
            'category_key' => 'surgical_procedures',
            'category_name' => 'Surgical Procedures & Anesthesiology',
            'icon' => 'fa-scalpel',
            'count' => 0,
            'gross_pf' => 0.0,
            'hospital_share' => 0.0,
            'doctor_share_gross' => 0.0,
            'tax_withheld' => 0.0,
            'net_commission' => 0.0,
            'items' => []
        ];

        $other = [
            'category_key' => 'other_services',
            'category_name' => 'Diagnostics & Emergency Calls',
            'icon' => 'fa-bolt',
            'count' => 0,
            'gross_pf' => 0.0,
            'hospital_share' => 0.0,
            'doctor_share_gross' => 0.0,
            'tax_withheld' => 0.0,
            'net_commission' => 0.0,
            'items' => []
        ];

        $grandTotal = [
            'total_cases' => count($records),
            'total_gross_pf' => 0.0,
            'total_hospital_share' => 0.0,
            'total_doctor_gross' => 0.0,
            'total_tax_withheld' => 0.0,
            'total_net_commission' => 0.0,
            'earned_count' => 0,
            'earned_net' => 0.0,
            'approved_count' => 0,
            'approved_net' => 0.0,
            'disbursed_count' => 0,
            'disbursed_net' => 0.0
        ];

        foreach ($records as $row) {
            $cat = strtolower(trim($row['service_category'] ?? ''));
            $src = strtolower(trim($row['source_type'] ?? ''));
            $gross = (float)$row['gross_pf_amount'];
            $hosp = (float)$row['hospital_share_amount'];
            $docGross = (float)$row['doctor_share_gross'];
            $tax = (float)$row['withholding_tax_amount'];
            $net = (float)$row['net_commission_payable'];
            $status = strtolower(trim($row['settlement_status'] ?? 'earned'));

            // Accumulate grand total
            $grandTotal['total_gross_pf'] += $gross;
            $grandTotal['total_hospital_share'] += $hosp;
            $grandTotal['total_doctor_gross'] += $docGross;
            $grandTotal['total_tax_withheld'] += $tax;
            $grandTotal['total_net_commission'] += $net;

            if ($status === 'earned') {
                $grandTotal['earned_count']++;
                $grandTotal['earned_net'] += $net;
            } elseif ($status === 'approved_for_payout') {
                $grandTotal['approved_count']++;
                $grandTotal['approved_net'] += $net;
            } elseif ($status === 'disbursed') {
                $grandTotal['disbursed_count']++;
                $grandTotal['disbursed_net'] += $net;
            }

            // Route to appropriate clinical category
            if ($cat === 'consultation' || $src === 'ambulatory_encounter') {
                $consultations['count']++;
                $consultations['gross_pf'] += $gross;
                $consultations['hospital_share'] += $hosp;
                $consultations['doctor_share_gross'] += $docGross;
                $consultations['tax_withheld'] += $tax;
                $consultations['net_commission'] += $net;
                $consultations['items'][] = $row;
            } elseif ($cat === 'daily_ward_round') {
                $wardRounds['count']++;
                $wardRounds['gross_pf'] += $gross;
                $wardRounds['hospital_share'] += $hosp;
                $wardRounds['doctor_share_gross'] += $docGross;
                $wardRounds['tax_withheld'] += $tax;
                $wardRounds['net_commission'] += $net;
                $wardRounds['items'][] = $row;
            } elseif (
                in_array($cat, ['surgical_lead', 'surgical_assistant', 'anesthesiology']) ||
                $src === 'or_surgery'
            ) {
                $surgical['count']++;
                $surgical['gross_pf'] += $gross;
                $surgical['hospital_share'] += $hosp;
                $surgical['doctor_share_gross'] += $docGross;
                $surgical['tax_withheld'] += $tax;
                $surgical['net_commission'] += $net;
                $surgical['items'][] = $row;
            } else {
                $other['count']++;
                $other['gross_pf'] += $gross;
                $other['hospital_share'] += $hosp;
                $other['doctor_share_gross'] += $docGross;
                $other['tax_withheld'] += $tax;
                $other['net_commission'] += $net;
                $other['items'][] = $row;
            }
        }

        // Round numeric fields for output
        $roundCategory = function (&$cat) {
            $cat['gross_pf'] = round($cat['gross_pf'], 2);
            $cat['hospital_share'] = round($cat['hospital_share'], 2);
            $cat['doctor_share_gross'] = round($cat['doctor_share_gross'], 2);
            $cat['tax_withheld'] = round($cat['tax_withheld'], 2);
            $cat['net_commission'] = round($cat['net_commission'], 2);
        };

        $roundCategory($consultations);
        $roundCategory($wardRounds);
        $roundCategory($surgical);
        $roundCategory($other);

        $grandTotal['total_gross_pf'] = round($grandTotal['total_gross_pf'], 2);
        $grandTotal['total_hospital_share'] = round($grandTotal['total_hospital_share'], 2);
        $grandTotal['total_doctor_gross'] = round($grandTotal['total_doctor_gross'], 2);
        $grandTotal['total_tax_withheld'] = round($grandTotal['total_tax_withheld'], 2);
        $grandTotal['total_net_commission'] = round($grandTotal['total_net_commission'], 2);
        $grandTotal['earned_net'] = round($grandTotal['earned_net'], 2);
        $grandTotal['approved_net'] = round($grandTotal['approved_net'], 2);
        $grandTotal['disbursed_net'] = round($grandTotal['disbursed_net'], 2);

        return [
            'doctor' => $doctor,
            'filters' => [
                'doctor_id' => $doctorId,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'status_filter' => $statusFilter
            ],
            'categories' => [
                'consultations' => $consultations,
                'ward_rounds' => $wardRounds,
                'surgical_procedures' => $surgical,
                'other_services' => $other
            ],
            'grand_total' => $grandTotal,
            'records' => $records
        ];
    }

    /**
     * Pull settled commission summary for all hospital physicians (Executive Overview)
     */
    public function pullAllPhysiciansCommissionSummary(
        ?string $startDate = null,
        ?string $endDate = null,
        ?string $statusFilter = null
    ): array {
        $pdo = Database::connection();

        $where = ["l.settlement_status != 'voided'"];
        $params = [];

        if (!empty($startDate)) {
            $where[] = "DATE(l.settlement_date) >= ?";
            $params[] = $startDate;
        }
        if (!empty($endDate)) {
            $where[] = "DATE(l.settlement_date) <= ?";
            $params[] = $endDate;
        }
        if (!empty($statusFilter)) {
            $statuses = array_map('trim', explode(',', $statusFilter));
            $placeholders = implode(',', array_fill(0, count($statuses), '?'));
            $where[] = "l.settlement_status IN ({$placeholders})";
            foreach ($statuses as $st) {
                $params[] = $st;
            }
        }
        $whereSql = implode(' AND ', $where);

        $sql = "
            SELECT 
                l.doctor_id,
                l.doctor_name,
                l.doctor_specialty,
                d.name AS department_name,
                COUNT(*) AS total_cases,
                SUM(l.gross_pf_amount) AS total_gross_pf,
                SUM(l.hospital_share_amount) AS total_hospital_share,
                SUM(l.doctor_share_gross) AS total_doctor_gross,
                SUM(l.withholding_tax_amount) AS total_tax_withheld,
                SUM(l.net_commission_payable) AS total_net_commission,
                
                -- Categorical Net Commissions
                SUM(CASE WHEN l.service_category = 'consultation' OR l.source_type = 'ambulatory_encounter' THEN l.net_commission_payable ELSE 0 END) AS consult_net,
                SUM(CASE WHEN l.service_category = 'consultation' OR l.source_type = 'ambulatory_encounter' THEN 1 ELSE 0 END) AS consult_count,

                SUM(CASE WHEN l.service_category = 'daily_ward_round' THEN l.net_commission_payable ELSE 0 END) AS ward_net,
                SUM(CASE WHEN l.service_category = 'daily_ward_round' THEN 1 ELSE 0 END) AS ward_count,

                SUM(CASE WHEN l.service_category IN ('surgical_lead', 'surgical_assistant', 'anesthesiology') OR l.source_type = 'or_surgery' THEN l.net_commission_payable ELSE 0 END) AS surgical_net,
                SUM(CASE WHEN l.service_category IN ('surgical_lead', 'surgical_assistant', 'anesthesiology') OR l.source_type = 'or_surgery' THEN 1 ELSE 0 END) AS surgical_count,

                SUM(CASE WHEN l.service_category NOT IN ('consultation', 'daily_ward_round', 'surgical_lead', 'surgical_assistant', 'anesthesiology') AND l.source_type NOT IN ('ambulatory_encounter', 'or_surgery') THEN l.net_commission_payable ELSE 0 END) AS other_net,

                -- Status breakdown
                SUM(CASE WHEN l.settlement_status IN ('earned', 'approved_for_payout') THEN l.net_commission_payable ELSE 0 END) AS payable_unpaid_net,
                SUM(CASE WHEN l.settlement_status = 'disbursed' THEN l.net_commission_payable ELSE 0 END) AS disbursed_net,
                MAX(l.settlement_date) AS last_case_date
            FROM billing_doctor_commission_ledger l
            LEFT JOIN employees e ON l.doctor_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE {$whereSql}
            GROUP BY l.doctor_id, l.doctor_name, l.doctor_specialty, d.name
            ORDER BY payable_unpaid_net DESC, total_net_commission DESC
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $physicians = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Overall KPIs
        $totalGross = 0.0;
        $totalHospital = 0.0;
        $totalDoctor = 0.0;
        $totalTax = 0.0;
        $totalNet = 0.0;
        $totalPayable = 0.0;
        $totalCases = 0;

        foreach ($physicians as &$doc) {
            $doc['total_gross_pf'] = round((float)$doc['total_gross_pf'], 2);
            $doc['total_hospital_share'] = round((float)$doc['total_hospital_share'], 2);
            $doc['total_doctor_gross'] = round((float)$doc['total_doctor_gross'], 2);
            $doc['total_tax_withheld'] = round((float)$doc['total_tax_withheld'], 2);
            $doc['total_net_commission'] = round((float)$doc['total_net_commission'], 2);
            $doc['consult_net'] = round((float)$doc['consult_net'], 2);
            $doc['ward_net'] = round((float)$doc['ward_net'], 2);
            $doc['surgical_net'] = round((float)$doc['surgical_net'], 2);
            $doc['other_net'] = round((float)$doc['other_net'], 2);
            $doc['payable_unpaid_net'] = round((float)$doc['payable_unpaid_net'], 2);
            $doc['disbursed_net'] = round((float)$doc['disbursed_net'], 2);

            $totalGross += $doc['total_gross_pf'];
            $totalHospital += $doc['total_hospital_share'];
            $totalDoctor += $doc['total_doctor_gross'];
            $totalTax += $doc['total_tax_withheld'];
            $totalNet += $doc['total_net_commission'];
            $totalPayable += $doc['payable_unpaid_net'];
            $totalCases += (int)$doc['total_cases'];
        }

        return [
            'metrics' => [
                'total_physicians' => count($physicians),
                'total_cases' => $totalCases,
                'total_gross_pf' => round($totalGross, 2),
                'total_hospital_retained' => round($totalHospital, 2),
                'total_doctor_gross' => round($totalDoctor, 2),
                'total_tax_withheld' => round($totalTax, 2),
                'total_net_commission' => round($totalNet, 2),
                'total_payable_unpaid' => round($totalPayable, 2)
            ],
            'physicians' => $physicians
        ];
    }

    /**
     * Approve or lock settled doctor shares for a Payroll Run Disbursement
     */
    public function approveSharesForPayroll(
        int $doctorId,
        array $voucherNumbers,
        string $payrollReference,
        ?int $userId = null
    ): array {
        $pdo = Database::connection();

        if (empty($voucherNumbers)) {
            throw new RuntimeException("No commission vouchers provided for payroll approval.");
        }

        $placeholders = implode(',', array_fill(0, count($voucherNumbers), '?'));
        $params = array_merge([$payrollReference], $voucherNumbers, [$doctorId]);

        $upd = $pdo->prepare("
            UPDATE billing_doctor_commission_ledger
            SET settlement_status = 'approved_for_payout',
                notes = CONCAT(COALESCE(notes, ''), ' | Locked for Payroll: ', ?),
                updated_at = NOW()
            WHERE voucher_number IN ({$placeholders})
              AND (doctor_id = ? OR settlement_status = 'earned')
        ");
        $upd->execute($params);

        $affected = $upd->rowCount();

        // Calculate approved amount
        $chkStmt = $pdo->prepare("
            SELECT SUM(net_commission_payable) FROM billing_doctor_commission_ledger
            WHERE voucher_number IN ({$placeholders})
        ");
        $chkStmt->execute($voucherNumbers);
        $approvedAmount = (float)$chkStmt->fetchColumn();

        return [
            'status' => 'success',
            'affected_count' => $affected,
            'approved_amount' => round($approvedAmount, 2),
            'payroll_reference' => $payrollReference
        ];
    }
}
