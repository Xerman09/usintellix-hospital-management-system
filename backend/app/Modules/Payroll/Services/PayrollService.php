<?php

namespace App\Modules\Payroll\Services;

use App\Core\Database;
use App\Modules\Payroll\Services\DoctorCommissionPullService;
use PDO;
use RuntimeException;
use Throwable;

class PayrollService
{
    /**
     * Atomically generate Payroll Run Number PAY-YYYYMM-XXXXX
     */
    public static function generateRunNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $month = date('m');
        $stmt = $pdo->prepare("
            INSERT INTO billing_tariff_counters (counter_type, year, last_number)
            VALUES ('PAYROLL_RUN', ?, 1)
            ON DUPLICATE KEY UPDATE last_number = last_number + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'PAYROLL_RUN' AND year = ?");
        $sel->execute([$year]);
        $seq = (int)$sel->fetchColumn();

        return sprintf("PAY-%d%s-%04d", $year, $month, $seq);
    }

    /**
     * Atomically generate Payslip Number PS-YYYYMM-XXXXX
     */
    public static function generatePayslipNumber(PDO $pdo): string
    {
        $year = (int)date('Y');
        $month = date('m');
        $stmt = $pdo->prepare("
            INSERT INTO billing_tariff_counters (counter_type, year, last_number)
            VALUES ('PAYSLIP_NO', ?, 1)
            ON DUPLICATE KEY UPDATE last_number = last_number + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'PAYSLIP_NO' AND year = ?");
        $sel->execute([$year]);
        $seq = (int)$sel->fetchColumn();

        return sprintf("PS-%d%s-%05d", $year, $month, $seq);
    }

    /**
     * Calculate and Generate a Full Payroll Run with Individual Confidential Payslips
     * Formula:
     *   "Gross Pay" = "Base Salary" + "Overtime" + "Night Diff" + "Allowances" + "Doctor Commissions"
     *   "Net Pay" = "Gross Pay" - ("Tax Withholdings" + "Social Security/Health Ins" + "Deductions")
     */
    public function calculatePayrollRun(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $periodStart = $data['period_start'] ?? date('Y-m-01');
            $periodEnd = $data['period_end'] ?? date('Y-m-15');
            $payoutDate = $data['payout_date'] ?? date('Y-m-20');
            $payFrequency = $data['pay_frequency'] ?? 'semi_monthly';
            $departmentId = !empty($data['department_id']) ? (int)$data['department_id'] : null;
            $title = !empty($data['title']) ? trim($data['title']) : sprintf("Payroll Run (%s to %s)", $periodStart, $periodEnd);
            $notes = $data['notes'] ?? null;

            $runNumber = self::generateRunNumber($pdo);

            // 1. Create Initial Master Payroll Run Record
            $insRun = $pdo->prepare("
                INSERT INTO hr_payroll_runs (
                    run_number, title, pay_frequency, period_start, period_end, payout_date,
                    department_id, total_employees, status, notes, created_by, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, ?, ?,
                    ?, 0, 'calculated', ?, ?, NOW(), NOW()
                )
            ");
            $insRun->execute([
                $runNumber, $title, $payFrequency, $periodStart, $periodEnd, $payoutDate,
                $departmentId, $notes, $userId
            ]);
            $runId = (int)$pdo->lastInsertId();

            // 2. Fetch Eligible Employees with Active Salary Structures
            $empSql = "
                SELECT 
                    s.id AS salary_structure_id,
                    s.employee_id,
                    CONCAT(e.first_name, ' ', e.last_name) AS staff_name,
                    e.email,
                    e.phone,
                    d.name AS department_name,
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
                    s.total_fixed_allowances,
                    s.on_call_stipend_rate,
                    s.overtime_multiplier,
                    s.night_diff_multiplier,
                    s.rest_day_multiplier,
                    s.holiday_multiplier,
                    s.tax_status,
                    s.tin_number,
                    s.bank_name,
                    s.bank_account_no,
                    s.payment_method
                FROM hr_salary_structures s
                INNER JOIN employees e ON s.employee_id = e.id
                LEFT JOIN departments d ON e.department_id = d.id
                LEFT JOIN providers p ON p.employee_id = e.id
                WHERE s.is_active = 1
            ";
            $empParams = [];
            if ($departmentId) {
                $empSql .= " AND e.department_id = ?";
                $empParams[] = $departmentId;
            }
            $empSql .= " ORDER BY e.last_name ASC, e.first_name ASC";

            $empStmt = $pdo->prepare($empSql);
            $empStmt->execute($empParams);
            $eligibleStaff = $empStmt->fetchAll(PDO::FETCH_ASSOC);

            if (empty($eligibleStaff)) {
                throw new RuntimeException("No active employees with configured salary structures found for this payroll run.");
            }

            $commissionPullSvc = new DoctorCommissionPullService();

            // Run Totals Accumulator
            $runTotals = [
                'total_employees' => 0,
                'total_base_pay' => 0.0,
                'total_overtime_pay' => 0.0,
                'total_night_diff_pay' => 0.0,
                'total_on_call_stipends' => 0.0,
                'total_allowances' => 0.0,
                'total_doctor_commissions' => 0.0,
                'total_gross_pay' => 0.0,
                'total_withholding_tax' => 0.0,
                'total_social_security' => 0.0,
                'total_health_insurance' => 0.0,
                'total_other_deductions' => 0.0,
                'total_deductions' => 0.0,
                'total_net_pay' => 0.0,
            ];

            $generatedPayslips = [];

            foreach ($eligibleStaff as $staff) {
                $empId = (int)$staff['employee_id'];
                $hourlyRate = (float)$staff['hourly_rate'];
                $monthlyBase = (float)$staff['base_salary'];
                $monthlyAllowances = (float)$staff['total_fixed_allowances'];

                // 2.1 Frequency Pro-Rating Factor
                $periodFactor = match ($payFrequency) {
                    'semi_monthly' => 0.5,
                    'bi_weekly' => 14 / 30.4,
                    'weekly' => 7 / 30.4,
                    default => 1.0 // monthly
                };

                $baseSalaryPeriod = round($monthlyBase * $periodFactor, 2);
                $housingAllow = round((float)$staff['housing_allowance'] * $periodFactor, 2);
                $transAllow = round((float)$staff['transportation_allowance'] * $periodFactor, 2);
                $medAllow = round((float)$staff['medical_allowance'] * $periodFactor, 2);
                $mealAllow = round((float)$staff['meal_allowance'] * $periodFactor, 2);
                $uniformAllow = round((float)$staff['uniform_allowance'] * $periodFactor, 2);
                $totalAllowancesPeriod = $housingAllow + $transAllow + $medAllow + $mealAllow + $uniformAllow;

                // 2.2 Attendance Time-Clock Logs
                $attStmt = $pdo->prepare("
                    SELECT 
                        COALESCE(SUM(total_hours_worked), 0) AS actual_hours,
                        COALESCE(SUM(regular_hours), 0) AS reg_hours,
                        COALESCE(SUM(overtime_hours), 0) AS ot_hours,
                        COALESCE(SUM(night_diff_hours), 0) AS nd_hours,
                        COALESCE(SUM(tardiness_minutes), 0) AS tardy_mins,
                        COALESCE(SUM(undertime_minutes), 0) AS undertime_mins
                    FROM hr_attendance_logs
                    WHERE employee_id = ? AND clock_date BETWEEN ? AND ?
                ");
                $attStmt->execute([$empId, $periodStart, $periodEnd]);
                $att = $attStmt->fetch(PDO::FETCH_ASSOC);

                $regHours = (float)($att['reg_hours'] ?? 0);
                $otHours = (float)($att['ot_hours'] ?? 0);
                $ndHours = (float)($att['nd_hours'] ?? 0);
                $tardyMins = (int)($att['tardy_mins'] ?? 0);

                // If no punches recorded (e.g. consultant doctor or exempt salaried), assume standard 80.0h
                if ($regHours <= 0) {
                    $regHours = $payFrequency === 'semi_monthly' ? 80.0 : 160.0;
                }

                $otMultiplier = (float)$staff['overtime_multiplier'] ?: 1.25;
                $ndMultiplier = (float)$staff['night_diff_multiplier'] ?: 1.30;

                $otAmount = round($otHours * $hourlyRate * $otMultiplier, 2);
                $ndAmount = round($ndHours * $hourlyRate * ($ndMultiplier - 1.0), 2); // 30% premium portion

                // 2.3 Doctor On-Call Shifts (from hr_duty_rosters)
                $rosterStmt = $pdo->prepare("
                    SELECT COUNT(*) FROM hr_duty_rosters
                    WHERE employee_id = ? AND shift_date BETWEEN ? AND ?
                ");
                $rosterStmt->execute([$empId, $periodStart, $periodEnd]);
                $onCallShifts = (int)$rosterStmt->fetchColumn();
                $stipendRate = (float)$staff['on_call_stipend_rate'];
                $onCallStipendAmount = round($onCallShifts * $stipendRate, 2);

                // 2.4 Doctor Professional Fee Commissions (Subsystem 6 Billing Integration)
                $doctorCommissionsAmount = 0.0;
                $commissionVouchers = [];
                if (in_array($staff['employment_type'], ['consultant_physician', 'resident_physician']) || !empty($staff['specialty'])) {
                    try {
                        $commData = $commissionPullSvc->pullDoctorSettledShares($empId, $periodStart, $periodEnd, 'earned,approved_for_payout');
                        $doctorCommissionsAmount = (float)$commData['grand_total']['total_net_commission'];
                        $commissionVouchers = $commData['records'] ?? [];
                    } catch (Throwable $t) {
                        $doctorCommissionsAmount = 0.0;
                    }
                }

                // 2.5 GROSS PAY FORMULA:
                // "Gross Pay" = "Base Salary" + "Overtime" + "Night Diff" + "Allowances" + "Doctor Commissions"
                $grossPay = $baseSalaryPeriod + $otAmount + $ndAmount + $onCallStipendAmount + $totalAllowancesPeriod + $doctorCommissionsAmount;

                // 2.6 DEDUCTIONS FORMULA:
                // ("Tax Withholdings" + "Social Security/Health Ins" + "Deductions")
                // Withholding Tax: 10% statutory rate (or EWT for doctors)
                $taxWithholding = round($grossPay * 0.10, 2);
                
                // Statutory Social Security & Health Insurance Contributions (pro-rated standard brackets)
                $socialSecurity = round(120.00 * $periodFactor, 2);
                $healthInsurance = round(80.00 * $periodFactor, 2);
                $retirementContribution = round(50.00 * $periodFactor, 2);

                // Tardiness / Undertime Deductions
                $tardinessDeduction = round(($tardyMins / 60) * $hourlyRate, 2);
                $otherDeductions = $tardinessDeduction;

                $totalDeductions = $taxWithholding + $socialSecurity + $healthInsurance + $retirementContribution + $otherDeductions;

                // 2.7 NET PAY FORMULA:
                // "Net Pay" = "Gross Pay" - "Total Deductions"
                $netPay = round($grossPay - $totalDeductions, 2);

                // 2.8 Verification Security Hash for Confidential PDF
                $payslipNumber = self::generatePayslipNumber($pdo);
                $verificationHash = hash('sha256', "{$empId}|{$payslipNumber}|{$grossPay}|{$netPay}|{$periodStart}|{$periodEnd}");

                // 2.9 Insert Payslip Header
                $insPs = $pdo->prepare("
                    INSERT INTO hr_payslips (
                        payroll_run_id, payslip_number, employee_id, salary_structure_id, staff_name,
                        department_name, job_title, employment_type, pay_frequency, period_start, period_end, payout_date,
                        hourly_rate, base_salary_amount, regular_hours_worked, overtime_hours, overtime_rate_multiplier,
                        overtime_amount, night_diff_hours, night_diff_rate_multiplier, night_diff_amount,
                        on_call_shifts, on_call_stipend_amount, fixed_allowances_amount, housing_allowance,
                        transportation_allowance, medical_allowance, meal_allowance, uniform_allowance,
                        doctor_commissions_amount, gross_pay, withholding_tax_amount, social_security_amount,
                        health_insurance_amount, retirement_contribution_amount, tardiness_deduction_amount,
                        other_deductions_amount, total_deductions, net_pay, bank_name, bank_account_no,
                        payment_method, tin_number, verification_hash, status, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, 'generated', NOW(), NOW()
                    )
                ");
                $insPs->execute([
                    $runId, $payslipNumber, $empId, $staff['salary_structure_id'], $staff['staff_name'],
                    $staff['department_name'], $staff['specialty'] ?? 'Hospital Staff', $staff['employment_type'], $payFrequency, $periodStart, $periodEnd, $payoutDate,
                    $hourlyRate, $baseSalaryPeriod, $regHours, $otHours, $otMultiplier,
                    $otAmount, $ndHours, $ndMultiplier, $ndAmount,
                    $onCallShifts, $onCallStipendAmount, $totalAllowancesPeriod, $housingAllow,
                    $transAllow, $medAllow, $mealAllow, $uniformAllow,
                    $doctorCommissionsAmount, $grossPay, $taxWithholding, $socialSecurity,
                    $healthInsurance, $retirementContribution, $tardinessDeduction,
                    $otherDeductions, $totalDeductions, $netPay, $staff['bank_name'], $staff['bank_account_no'],
                    $staff['payment_method'], $staff['tin_number'], $verificationHash
                ]);
                $payslipId = (int)$pdo->lastInsertId();

                // 2.10 Itemized Payslip Line Items (Auditable Earnings & Deductions)
                $insItem = $pdo->prepare("
                    INSERT INTO hr_payslip_items (
                        payslip_id, item_type, category, item_name, rate, quantity, amount, notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");

                // Earning Items
                $insItem->execute([$payslipId, 'earning', 'base_salary', 'Basic Salary (Period Allocation)', $hourlyRate, $regHours, $baseSalaryPeriod, "{$payFrequency} period base compensation"]);
                if ($otAmount > 0) {
                    $insItem->execute([$payslipId, 'earning', 'overtime', "Regular Overtime ({$otMultiplier}x)", round($hourlyRate * $otMultiplier, 2), $otHours, $otAmount, "Hours worked exceeding 8h/day"]);
                }
                if ($ndAmount > 0) {
                    $insItem->execute([$payslipId, 'earning', 'night_diff', "Night Shift Differential ({$ndMultiplier}x)", round($hourlyRate * ($ndMultiplier - 1.0), 2), $ndHours, $ndAmount, "Differential hours 22:00–06:00"]);
                }
                if ($onCallStipendAmount > 0) {
                    $insItem->execute([$payslipId, 'earning', 'on_call', 'Hospital Doctor On-Call Duty Stipends', $stipendRate, $onCallShifts, $onCallStipendAmount, "Completed on-call duty shifts"]);
                }
                if ($housingAllow > 0) $insItem->execute([$payslipId, 'earning', 'allowance', 'Housing Allowance', null, null, $housingAllow, 'Fixed monthly benefit']);
                if ($transAllow > 0) $insItem->execute([$payslipId, 'earning', 'allowance', 'Transportation Allowance', null, null, $transAllow, 'Fixed monthly benefit']);
                if ($medAllow > 0) $insItem->execute([$payslipId, 'earning', 'allowance', 'Medical & Dental Allowance', null, null, $medAllow, 'Fixed monthly benefit']);
                if ($mealAllow > 0) $insItem->execute([$payslipId, 'earning', 'allowance', 'Meal Subsidy', null, null, $mealAllow, 'Fixed monthly benefit']);
                if ($uniformAllow > 0) $insItem->execute([$payslipId, 'earning', 'allowance', 'Uniform Maintenance Allowance', null, null, $uniformAllow, 'Fixed monthly benefit']);

                if ($doctorCommissionsAmount > 0) {
                    $insItem->execute([
                        $payslipId, 'earning', 'doctor_commission',
                        'Doctor Professional Fee (PF) Shares & Case Commissions',
                        null, count($commissionVouchers), $doctorCommissionsAmount,
                        "Settled clinical revenue shares pulled from Billing (Subsystem 6)"
                    ]);
                }

                // Deduction Items
                $insItem->execute([$payslipId, 'deduction', 'tax_withholding', 'Expanded Withholding Tax (10% Statutory)', 10.0, null, $taxWithholding, 'Statutory withholding income tax']);
                $insItem->execute([$payslipId, 'deduction', 'social_security', 'Social Security Contribution (SSS)', null, null, $socialSecurity, 'Statutory employee insurance share']);
                $insItem->execute([$payslipId, 'deduction', 'health_insurance', 'National Health Insurance (PhilHealth/Medicare)', null, null, $healthInsurance, 'Hospital medical benefit scheme']);
                $insItem->execute([$payslipId, 'deduction', 'retirement', 'Retirement & Provident Fund Contribution', null, null, $retirementContribution, 'Statutory savings contribution']);
                if ($tardinessDeduction > 0) {
                    $insItem->execute([$payslipId, 'deduction', 'tardiness', 'Tardiness / Undertime Deduction', $hourlyRate, round($tardyMins / 60, 2), $tardinessDeduction, "{$tardyMins} accumulated minutes late"]);
                }

                // Accumulate Run Totals
                $runTotals['total_employees']++;
                $runTotals['total_base_pay'] += $baseSalaryPeriod;
                $runTotals['total_overtime_pay'] += $otAmount;
                $runTotals['total_night_diff_pay'] += $ndAmount;
                $runTotals['total_on_call_stipends'] += $onCallStipendAmount;
                $runTotals['total_allowances'] += $totalAllowancesPeriod;
                $runTotals['total_doctor_commissions'] += $doctorCommissionsAmount;
                $runTotals['total_gross_pay'] += $grossPay;
                $runTotals['total_withholding_tax'] += $taxWithholding;
                $runTotals['total_social_security'] += $socialSecurity;
                $runTotals['total_health_insurance'] += $healthInsurance;
                $runTotals['total_other_deductions'] += $otherDeductions;
                $runTotals['total_deductions'] += $totalDeductions;
                $runTotals['total_net_pay'] += $netPay;

                $generatedPayslips[] = [
                    'id' => $payslipId,
                    'payslip_number' => $payslipNumber,
                    'employee_id' => $empId,
                    'staff_name' => $staff['staff_name'],
                    'employment_type' => $staff['employment_type'],
                    'gross_pay' => $grossPay,
                    'total_deductions' => $totalDeductions,
                    'net_pay' => $netPay
                ];
            }

            // 3. Update Master Payroll Run with Aggregated Totals
            $updRun = $pdo->prepare("
                UPDATE hr_payroll_runs SET
                    total_employees = ?,
                    total_base_pay = ?,
                    total_overtime_pay = ?,
                    total_night_diff_pay = ?,
                    total_on_call_stipends = ?,
                    total_allowances = ?,
                    total_doctor_commissions = ?,
                    total_gross_pay = ?,
                    total_withholding_tax = ?,
                    total_social_security = ?,
                    total_health_insurance = ?,
                    total_other_deductions = ?,
                    total_deductions = ?,
                    total_net_pay = ?,
                    updated_at = NOW()
                WHERE id = ?
            ");
            $updRun->execute([
                $runTotals['total_employees'],
                $runTotals['total_base_pay'],
                $runTotals['total_overtime_pay'],
                $runTotals['total_night_diff_pay'],
                $runTotals['total_on_call_stipends'],
                $runTotals['total_allowances'],
                $runTotals['total_doctor_commissions'],
                $runTotals['total_gross_pay'],
                $runTotals['total_withholding_tax'],
                $runTotals['total_social_security'],
                $runTotals['total_health_insurance'],
                $runTotals['total_other_deductions'],
                $runTotals['total_deductions'],
                $runTotals['total_net_pay'],
                $runId
            ]);

            $pdo->commit();

            return [
                'run_id' => $runId,
                'run_number' => $runNumber,
                'status' => 'calculated',
                'totals' => $runTotals,
                'payslips_count' => count($generatedPayslips),
                'payslips' => $generatedPayslips
            ];
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * List Master Payroll Runs with Filters & Pagination
     */
    public function listPayrollRuns(array $filters = [], int $page = 1, int $perPage = 20): array
    {
        $pdo = Database::connection();

        $where = ["1=1"];
        $params = [];

        if (!empty($filters['status'])) {
            $where[] = "status = ?";
            $params[] = $filters['status'];
        }
        if (!empty($filters['pay_frequency'])) {
            $where[] = "pay_frequency = ?";
            $params[] = $filters['pay_frequency'];
        }
        if (!empty($filters['q'])) {
            $term = '%' . trim($filters['q']) . '%';
            $where[] = "(run_number LIKE ? OR title LIKE ?)";
            $params[] = $term;
            $params[] = $term;
        }

        $whereSql = implode(' AND ', $where);

        $cntStmt = $pdo->prepare("SELECT COUNT(*) FROM hr_payroll_runs WHERE {$whereSql}");
        $cntStmt->execute($params);
        $total = (int)$cntStmt->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $stmt = $pdo->prepare("
            SELECT r.*, d.name AS department_name
            FROM hr_payroll_runs r
            LEFT JOIN departments d ON r.department_id = d.id
            WHERE {$whereSql}
            ORDER BY r.period_start DESC, r.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ");
        $stmt->execute($params);
        $runs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Overall summary metrics
        $metStmt = $pdo->query("
            SELECT 
                COUNT(*) AS total_runs,
                COALESCE(SUM(total_gross_pay), 0) AS lifetime_gross_pay,
                COALESCE(SUM(total_net_pay), 0) AS lifetime_net_pay,
                COALESCE(SUM(total_doctor_commissions), 0) AS lifetime_doctor_commissions,
                SUM(CASE WHEN status = 'disbursed' THEN 1 ELSE 0 END) AS disbursed_runs,
                SUM(CASE WHEN status IN ('calculated', 'draft') THEN 1 ELSE 0 END) AS pending_runs
            FROM hr_payroll_runs
        ");
        $metrics = $metStmt->fetch(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'runs' => $runs,
            'metrics' => $metrics ?: []
        ];
    }

    /**
     * Get Complete Detail for a Specific Payroll Run including all its Generated Payslips
     */
    public function getPayrollRunDetail(int $runId): ?array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("
            SELECT r.*, d.name AS department_name
            FROM hr_payroll_runs r
            LEFT JOIN departments d ON r.department_id = d.id
            WHERE r.id = ?
        ");
        $stmt->execute([$runId]);
        $run = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$run) {
            return null;
        }

        // Fetch all payslips belonging to this run
        $psStmt = $pdo->prepare("
            SELECT 
                p.*,
                e.email,
                e.phone
            FROM hr_payslips p
            LEFT JOIN employees e ON p.employee_id = e.id
            WHERE p.payroll_run_id = ?
            ORDER BY p.staff_name ASC
        ");
        $psStmt->execute([$runId]);
        $payslips = $psStmt->fetchAll(PDO::FETCH_ASSOC);

        $run['payslips'] = $payslips;
        return $run;
    }

    /**
     * Get Confidential Individual Employee Payslip Detail with All Itemized Earnings & Deductions
     */
    public function getPayslipDetail(int $payslipId): ?array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("
            SELECT 
                p.*,
                r.run_number,
                r.title AS run_title,
                r.status AS run_status,
                e.employee_no,
                e.email,
                e.phone,
                d.name AS department_full_name,
                s.tin_number AS structure_tin,
                s.bank_name AS structure_bank
            FROM hr_payslips p
            INNER JOIN hr_payroll_runs r ON p.payroll_run_id = r.id
            LEFT JOIN employees e ON p.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN hr_salary_structures s ON p.salary_structure_id = s.id
            WHERE p.id = ?
        ");
        $stmt->execute([$payslipId]);
        $payslip = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$payslip) {
            return null;
        }

        // Fetch Itemized Line Items
        $itemStmt = $pdo->prepare("
            SELECT * FROM hr_payslip_items
            WHERE payslip_id = ?
            ORDER BY item_type ASC, id ASC
        ");
        $itemStmt->execute([$payslipId]);
        $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);

        $earnings = [];
        $deductions = [];

        foreach ($items as $it) {
            if ($it['item_type'] === 'earning') {
                $earnings[] = $it;
            } else {
                $deductions[] = $it;
            }
        }

        $payslip['items'] = $items;
        $payslip['earnings_breakdown'] = $earnings;
        $payslip['deductions_breakdown'] = $deductions;

        return $payslip;
    }

    /**
     * Approve Payroll Run
     */
    public function approvePayrollRun(int $runId, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $updRun = $pdo->prepare("
                UPDATE hr_payroll_runs
                SET status = 'approved', approved_at = NOW(), approved_by = ?, updated_at = NOW()
                WHERE id = ? AND status IN ('calculated', 'draft')
            ");
            $updRun->execute([$userId, $runId]);

            if ($updRun->rowCount() === 0) {
                throw new RuntimeException("Payroll run #{$runId} cannot be approved (already approved or cancelled).");
            }

            // Update all payslips
            $updPs = $pdo->prepare("
                UPDATE hr_payslips
                SET status = 'approved', updated_at = NOW()
                WHERE payroll_run_id = ?
            ");
            $updPs->execute([$runId]);

            $pdo->commit();
            return ['status' => 'success', 'message' => "Payroll run #{$runId} approved successfully."];
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Disburse / Mark as Paid Payroll Run
     * Automatically dispatches net pay, updates payslip status, and marks linked doctor commission vouchers as disbursed!
     */
    public function disbursePayrollRun(int $runId, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare("SELECT * FROM hr_payroll_runs WHERE id = ?");
            $stmt->execute([$runId]);
            $run = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$run) {
                throw new RuntimeException("Payroll run #{$runId} not found.");
            }

            $updRun = $pdo->prepare("
                UPDATE hr_payroll_runs
                SET status = 'disbursed', disbursed_at = NOW(), disbursed_by = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $updRun->execute([$userId, $runId]);

            // Update all payslips to paid
            $updPs = $pdo->prepare("
                UPDATE hr_payslips
                SET status = 'paid', paid_at = NOW(), updated_at = NOW()
                WHERE payroll_run_id = ?
            ");
            $updPs->execute([$runId]);

            // Mark linked Doctor Commission Vouchers from Subsystem 6 as 'disbursed'
            $psStmt = $pdo->prepare("
                SELECT employee_id, payslip_number FROM hr_payslips
                WHERE payroll_run_id = ? AND doctor_commissions_amount > 0
            ");
            $psStmt->execute([$runId]);
            $docPayslips = $psStmt->fetchAll(PDO::FETCH_ASSOC);

            foreach ($docPayslips as $dps) {
                $updCom = $pdo->prepare("
                    UPDATE billing_doctor_commission_ledger
                    SET settlement_status = 'disbursed',
                        disbursement_reference = ?,
                        disbursed_at = NOW(),
                        updated_at = NOW()
                    WHERE doctor_id = ?
                      AND settlement_status IN ('earned', 'approved_for_payout')
                      AND DATE(settlement_date) BETWEEN ? AND ?
                ");
                $updCom->execute([
                    $dps['payslip_number'],
                    $dps['employee_id'],
                    $run['period_start'],
                    $run['period_end']
                ]);
            }

            $pdo->commit();
            return ['status' => 'success', 'message' => "Payroll run #{$run['run_number']} disbursed and marked paid successfully."];
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Get Employee's Historical Payslips for Self-Service View
     */
    public function getEmployeePayslips(int $employeeId): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->prepare("
            SELECT 
                p.id,
                p.payslip_number,
                p.period_start,
                p.period_end,
                p.payout_date,
                p.pay_frequency,
                p.base_salary_amount,
                p.overtime_amount,
                p.night_diff_amount,
                p.fixed_allowances_amount,
                p.doctor_commissions_amount,
                p.gross_pay,
                p.total_deductions,
                p.net_pay,
                p.status,
                p.paid_at,
                r.run_number,
                r.title AS run_title
            FROM hr_payslips p
            INNER JOIN hr_payroll_runs r ON p.payroll_run_id = r.id
            WHERE p.employee_id = ?
            ORDER BY p.period_start DESC, p.id DESC
        ");
        $stmt->execute([$employeeId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
