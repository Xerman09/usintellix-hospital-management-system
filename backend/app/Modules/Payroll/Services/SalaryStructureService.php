<?php

namespace App\Modules\Payroll\Services;

use App\Core\Database;
use PDO;
use RuntimeException;
use InvalidArgumentException;

class SalaryStructureService
{
    /**
     * Atomically generate salary structure code SAL-YYYYMM-XXXXX
     */
    public static function generateStructureCode(PDO $pdo): string
    {
        $year = (int)date('Y');
        $yearMonth = date('Ym');
        $stmt = $pdo->prepare("
            INSERT INTO billing_tariff_counters (counter_type, year, last_number)
            VALUES ('SALARY_STRUCTURE', ?, 1)
            ON DUPLICATE KEY UPDATE last_number = last_number + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'SALARY_STRUCTURE' AND year = ?");
        $sel->execute([$year]);
        $seq = (int)$sel->fetchColumn();

        return sprintf("SAL-%s-%05d", $yearMonth, $seq);
    }

    /**
     * List salary structures with filters, pagination, and KPI metrics
     */
    public function listSalaryStructures(array $filters, int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();

        $where = ["1=1"];
        $params = [];

        if (!empty($filters['employee_id'])) {
            $where[] = "s.employee_id = ?";
            $params[] = (int)$filters['employee_id'];
        }

        if (!empty($filters['department_id'])) {
            $where[] = "e.department_id = ?";
            $params[] = (int)$filters['department_id'];
        }

        if (!empty($filters['employment_type'])) {
            $where[] = "s.employment_type = ?";
            $params[] = $filters['employment_type'];
        }

        if (!empty($filters['pay_frequency'])) {
            $where[] = "s.pay_frequency = ?";
            $params[] = $filters['pay_frequency'];
        }

        if (isset($filters['is_active']) && $filters['is_active'] !== '') {
            $where[] = "s.is_active = ?";
            $params[] = (int)$filters['is_active'];
        }

        if (!empty($filters['q'])) {
            $term = '%' . trim($filters['q']) . '%';
            $where[] = "(e.first_name LIKE ? OR e.last_name LIKE ? OR s.structure_code LIKE ? OR s.bank_name LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = implode(' AND ', $where);

        // Count total
        $cntStmt = $pdo->prepare("
            SELECT COUNT(*) FROM hr_salary_structures s
            INNER JOIN employees e ON s.employee_id = e.id
            WHERE {$whereClause}
        ");
        $cntStmt->execute($params);
        $total = (int)$cntStmt->fetchColumn();

        // Paginated records
        $offset = ($page - 1) * $perPage;
        $sql = "
            SELECT 
                s.id,
                s.structure_code,
                s.employee_id,
                CONCAT(e.first_name, ' ', e.last_name) AS staff_name,
                e.email AS staff_email,
                e.phone AS staff_phone,
                e.department_id,
                d.name AS department_name,
                d.code AS department_code,
                p.specialty,
                s.employment_type,
                s.pay_frequency,
                s.base_salary,
                s.hourly_rate,
                s.daily_rate,
                s.housing_allowance,
                s.transportation_allowance,
                s.medical_allowance,
                s.meal_allowance,
                s.uniform_allowance,
                s.on_call_stipend_rate,
                s.total_fixed_allowances,
                s.overtime_multiplier,
                s.night_diff_multiplier,
                s.rest_day_multiplier,
                s.holiday_multiplier,
                s.emergency_recall_multiplier,
                s.tax_status,
                s.tin_number,
                s.bank_name,
                s.bank_account_no,
                s.payment_method,
                s.effective_date,
                s.is_active,
                s.notes,
                s.created_at
            FROM hr_salary_structures s
            INNER JOIN employees e ON s.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN providers p ON p.employee_id = e.id
            WHERE {$whereClause}
            ORDER BY s.base_salary DESC, e.last_name ASC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // KPI Summary
        $metStmt = $pdo->query("
            SELECT 
                COUNT(*) AS total_structures,
                SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_structures,
                COALESCE(SUM(base_salary), 0) AS total_monthly_base_payroll,
                COALESCE(SUM(total_fixed_allowances), 0) AS total_monthly_allowances,
                COALESCE(AVG(hourly_rate), 0) AS avg_hourly_rate,
                SUM(CASE WHEN employment_type = 'consultant_physician' THEN 1 ELSE 0 END) AS count_physicians,
                SUM(CASE WHEN employment_type = 'regular_fulltime' THEN 1 ELSE 0 END) AS count_fulltime_staff
            FROM hr_salary_structures
        ");
        $metrics = $metStmt->fetch(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'records' => $records,
            'metrics' => $metrics ?: []
        ];
    }

    /**
     * Get single salary structure by ID or Employee ID
     */
    public function getSalaryStructure(int $id): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT s.*, CONCAT(e.first_name, ' ', e.last_name) AS staff_name, d.name AS department_name, p.specialty
            FROM hr_salary_structures s
            INNER JOIN employees e ON s.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN providers p ON p.employee_id = e.id
            WHERE s.id = ?
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        $compStmt = $pdo->prepare("
            SELECT * FROM hr_salary_components
            WHERE salary_structure_id = ?
            ORDER BY component_type ASC, component_name ASC
        ");
        $compStmt->execute([$id]);
        $row['components'] = $compStmt->fetchAll(PDO::FETCH_ASSOC);

        return $row;
    }

    /**
     * Get by Employee ID
     */
    public function getEmployeeSalaryStructure(int $employeeId): ?array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT s.*, CONCAT(e.first_name, ' ', e.last_name) AS staff_name, d.name AS department_name, p.specialty
            FROM hr_salary_structures s
            INNER JOIN employees e ON s.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN providers p ON p.employee_id = e.id
            WHERE s.employee_id = ? AND s.is_active = 1
            LIMIT 1
        ");
        $stmt->execute([$employeeId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        $compStmt = $pdo->prepare("
            SELECT * FROM hr_salary_components
            WHERE salary_structure_id = ?
            ORDER BY component_type ASC, component_name ASC
        ");
        $compStmt->execute([(int)$row['id']]);
        $row['components'] = $compStmt->fetchAll(PDO::FETCH_ASSOC);

        return $row;
    }

    /**
     * Save or Update Salary Structure
     */
    public function saveSalaryStructure(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $id = !empty($data['id']) ? (int)$data['id'] : null;
        $employeeId = (int)($data['employee_id'] ?? 0);
        $empType = trim($data['employment_type'] ?? 'regular_fulltime');
        $payFreq = trim($data['pay_frequency'] ?? 'semi_monthly');
        $baseSalary = (float)($data['base_salary'] ?? 0.0);

        if ($employeeId <= 0) {
            throw new InvalidArgumentException("Employee selection is required.");
        }
        if ($baseSalary < 0) {
            throw new InvalidArgumentException("Base salary cannot be negative.");
        }

        // Automatic derived rates (hospital standard: 22 working days / 176 hours per month)
        $hourlyRate = !empty($data['hourly_rate']) ? (float)$data['hourly_rate'] : round($baseSalary / (22 * 8), 2);
        $dailyRate  = !empty($data['daily_rate']) ? (float)$data['daily_rate'] : round($baseSalary / 22, 2);

        // Fixed allowances
        $housing = (float)($data['housing_allowance'] ?? 0.0);
        $transpo = (float)($data['transportation_allowance'] ?? 0.0);
        $medical = (float)($data['medical_allowance'] ?? 0.0);
        $meal    = (float)($data['meal_allowance'] ?? 0.0);
        $uniform = (float)($data['uniform_allowance'] ?? 0.0);
        $onCallStipend = (float)($data['on_call_stipend_rate'] ?? 0.0);
        $totalAllowances = $housing + $transpo + $medical + $meal + $uniform;

        // Overtime multipliers
        $otMul   = !empty($data['overtime_multiplier']) ? (float)$data['overtime_multiplier'] : 1.25;
        $ndMul   = !empty($data['night_diff_multiplier']) ? (float)$data['night_diff_multiplier'] : 1.30;
        $restMul = !empty($data['rest_day_multiplier']) ? (float)$data['rest_day_multiplier'] : 1.50;
        $holMul  = !empty($data['holiday_multiplier']) ? (float)$data['holiday_multiplier'] : 2.00;
        $emgMul  = !empty($data['emergency_recall_multiplier']) ? (float)$data['emergency_recall_multiplier'] : 1.50;

        // Banking & Tax
        $taxStatus = trim($data['tax_status'] ?? 'standard_withholding');
        $tin = !empty($data['tin_number']) ? trim($data['tin_number']) : null;
        $bankName = !empty($data['bank_name']) ? trim($data['bank_name']) : null;
        $bankAcct = !empty($data['bank_account_no']) ? trim($data['bank_account_no']) : null;
        $payMethod = trim($data['payment_method'] ?? 'direct_deposit');
        $effectiveDate = !empty($data['effective_date']) ? trim($data['effective_date']) : date('Y-m-d');
        $isActive = isset($data['is_active']) ? (int)$data['is_active'] : 1;
        $notes = !empty($data['notes']) ? trim($data['notes']) : null;

        if ($id && $id > 0) {
            $stmt = $pdo->prepare("
                UPDATE hr_salary_structures SET
                    employee_id = ?,
                    employment_type = ?,
                    pay_frequency = ?,
                    base_salary = ?,
                    hourly_rate = ?,
                    daily_rate = ?,
                    housing_allowance = ?,
                    transportation_allowance = ?,
                    medical_allowance = ?,
                    meal_allowance = ?,
                    uniform_allowance = ?,
                    on_call_stipend_rate = ?,
                    total_fixed_allowances = ?,
                    overtime_multiplier = ?,
                    night_diff_multiplier = ?,
                    rest_day_multiplier = ?,
                    holiday_multiplier = ?,
                    emergency_recall_multiplier = ?,
                    tax_status = ?,
                    tin_number = ?,
                    bank_name = ?,
                    bank_account_no = ?,
                    payment_method = ?,
                    effective_date = ?,
                    is_active = ?,
                    notes = ?,
                    updated_by = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $employeeId, $empType, $payFreq, $baseSalary, $hourlyRate, $dailyRate,
                $housing, $transpo, $medical, $meal, $uniform, $onCallStipend, $totalAllowances,
                $otMul, $ndMul, $restMul, $holMul, $emgMul,
                $taxStatus, $tin, $bankName, $bankAcct, $payMethod,
                $effectiveDate, $isActive, $notes, $userId, $id
            ]);

            return ['id' => $id, 'message' => "Salary structure updated successfully."];
        } else {
            // Check for existing
            $chk = $pdo->prepare("SELECT id, structure_code FROM hr_salary_structures WHERE employee_id = ?");
            $chk->execute([$employeeId]);
            $existing = $chk->fetch(PDO::FETCH_ASSOC);
            if ($existing) {
                throw new InvalidArgumentException("Salary structure already exists for this staff member (#{$existing['structure_code']}). Edit existing instead.");
            }

            $code = self::generateStructureCode($pdo);

            $stmt = $pdo->prepare("
                INSERT INTO hr_salary_structures (
                    structure_code, employee_id, employment_type, pay_frequency, base_salary,
                    hourly_rate, daily_rate, housing_allowance, transportation_allowance,
                    medical_allowance, meal_allowance, uniform_allowance, on_call_stipend_rate,
                    total_fixed_allowances, overtime_multiplier, night_diff_multiplier,
                    rest_day_multiplier, holiday_multiplier, emergency_recall_multiplier,
                    tax_status, tin_number, bank_name, bank_account_no, payment_method,
                    effective_date, is_active, notes, created_by
                ) VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?,
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?
                )
            ");
            $stmt->execute([
                $code, $employeeId, $empType, $payFreq, $baseSalary,
                $hourlyRate, $dailyRate, $housing, $transpo,
                $medical, $meal, $uniform, $onCallStipend,
                $totalAllowances, $otMul, $ndMul,
                $restMul, $holMul, $emgMul,
                $taxStatus, $tin, $bankName, $bankAcct, $payMethod,
                $effectiveDate, $isActive, $notes, $userId
            ]);

            $newId = (int)$pdo->lastInsertId();
            return ['id' => $newId, 'structure_code' => $code, 'message' => "Salary structure #{$code} created successfully."];
        }
    }

    /**
     * Delete Salary Structure
     */
    public function deleteSalaryStructure(int $id): bool
    {
        $pdo = Database::connection();
        $del = $pdo->prepare("DELETE FROM hr_salary_structures WHERE id = ?");
        return $del->execute([$id]);
    }

    /**
     * Real-time Gross Compensation Calculation Simulator
     * Seamlessly demonstrates base pay + OT (1.25x) + Night Diff (1.30x) + On-Call Stipends + Doctor PF Shares
     * Optionally pulls settled doctor shares from Billing (Subsystem 6) across consultations, ward rounds & surgery.
     */
    public function calculateGrossCompensationSimulation(
        int $employeeId,
        float $regularHours = 80.0,
        float $otHours = 0.0,
        float $ndHours = 0.0,
        int $onCallShifts = 0,
        float $caseCommissions = 0.0,
        bool $pullFromBilling = false,
        ?string $startDate = null,
        ?string $endDate = null
    ): array {
        $structure = $this->getEmployeeSalaryStructure($employeeId);
        if (!$structure) {
            throw new RuntimeException("No active salary structure found for Employee ID {$employeeId}.");
        }

        $pulledData = null;
        if ($pullFromBilling) {
            $pullSvc = new DoctorCommissionPullService();
            $pulledData = $pullSvc->pullDoctorSettledShares($employeeId, $startDate, $endDate, 'earned,approved_for_payout');
            $caseCommissions = (float)$pulledData['grand_total']['total_net_commission'];
        }

        $hourly = (float)$structure['hourly_rate'];
        $baseSemiMonthly = (float)$structure['base_salary'] / 2; // Semi-monthly pay period
        $allowancesSemi = (float)$structure['total_fixed_allowances'] / 2;

        // Multipliers
        $otPay = round($otHours * $hourly * (float)$structure['overtime_multiplier'], 2);
        $ndPay = round($ndHours * $hourly * ((float)$structure['night_diff_multiplier'] - 1.0), 2); // 30% premium portion
        $stipendPay = round($onCallShifts * (float)$structure['on_call_stipend_rate'], 2);

        $grossTotal = $baseSemiMonthly + $allowancesSemi + $otPay + $ndPay + $stipendPay + $caseCommissions;

        // Estimated 10% Withholding / Professional Tax
        $taxEstimate = round($grossTotal * 0.10, 2);
        $netPayEstimate = round($grossTotal - $taxEstimate, 2);

        $result = [
            'employee_id' => $employeeId,
            'staff_name' => $structure['staff_name'],
            'employment_type' => $structure['employment_type'],
            'hourly_rate' => $hourly,
            'base_salary_period' => $baseSemiMonthly,
            'fixed_allowances_period' => $allowancesSemi,
            'overtime' => [
                'hours' => $otHours,
                'multiplier' => (float)$structure['overtime_multiplier'],
                'amount' => $otPay
            ],
            'night_diff' => [
                'hours' => $ndHours,
                'multiplier' => (float)$structure['night_diff_multiplier'],
                'amount' => $ndPay
            ],
            'on_call_stipends' => [
                'shifts' => $onCallShifts,
                'rate_per_shift' => (float)$structure['on_call_stipend_rate'],
                'amount' => $stipendPay
            ],
            'doctor_procedure_commissions' => $caseCommissions,
            'gross_total' => $grossTotal,
            'estimated_withholding_tax' => $taxEstimate,
            'net_pay_estimate' => $netPayEstimate
        ];

        if ($pulledData !== null) {
            $result['pulled_billing_commissions'] = [
                'total_settled_net' => $pulledData['grand_total']['total_net_commission'],
                'total_cases' => $pulledData['grand_total']['total_cases'],
                'consultations_net' => $pulledData['categories']['consultations']['net_commission'],
                'consultations_count' => $pulledData['categories']['consultations']['count'],
                'ward_rounds_net' => $pulledData['categories']['ward_rounds']['net_commission'],
                'ward_rounds_count' => $pulledData['categories']['ward_rounds']['count'],
                'surgical_net' => $pulledData['categories']['surgical_procedures']['net_commission'],
                'surgical_count' => $pulledData['categories']['surgical_procedures']['count'],
                'other_net' => $pulledData['categories']['other_services']['net_commission'],
                'other_count' => $pulledData['categories']['other_services']['count']
            ];
        }

        return $result;
    }

    /**
     * Metadata list for dropdowns
     */
    public function getMetadata(): array
    {
        $pdo = Database::connection();
        $departments = $pdo->query("SELECT id, name, code FROM departments WHERE status = 'active' ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);
        $staff = $pdo->query("
            SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) AS full_name, e.department_id, d.name AS department_name, p.specialty
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN providers p ON p.employee_id = e.id
            ORDER BY e.first_name ASC
        ")->fetchAll(PDO::FETCH_ASSOC);

        return [
            'departments' => $departments,
            'staff' => $staff
        ];
    }
}
