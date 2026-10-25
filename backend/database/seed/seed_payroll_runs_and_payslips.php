<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';

use App\Core\Database;
use App\Modules\Payroll\Services\PayrollService;

echo "Seeding Master Payroll Runs and Employee Payslips...\n";

$pdo = Database::connection();
$service = new PayrollService();

// Check if runs already exist
$count = (int)$pdo->query("SELECT COUNT(*) FROM hr_payroll_runs")->fetchColumn();
if ($count > 0) {
    echo "Payroll runs already exist ({$count} runs found).\n";
    exit(0);
}

// 1. Run 1: October 1 to October 15, 2026 (1st Half, Disbursed)
echo "Generating October 2026 1st Half Payroll Run...\n";
$run1 = $service->calculatePayrollRun([
    'title' => 'October 2026 Semi-Monthly Payroll (1st Half: Oct 01 - Oct 15)',
    'period_start' => '2026-10-01',
    'period_end' => '2026-10-15',
    'payout_date' => '2026-10-20',
    'pay_frequency' => 'semi_monthly',
    'notes' => 'Regular mid-month hospital payroll run covering 10 clinical and administrative staff.'
], 1);

echo "Run 1 Created: #{$run1['run_number']} with {$run1['payslips_count']} payslips. Total Net: $" . number_format($run1['totals']['total_net_pay'], 2) . "\n";

// Approve & Disburse Run 1
$service->approvePayrollRun($run1['run_id'], 1);
$service->disbursePayrollRun($run1['run_id'], 1);
echo "Run 1 Approved and Disbursed successfully.\n";

// 2. Run 2: October 16 to October 31, 2026 (2nd Half, Calculated / Ready for Review)
echo "Generating October 2026 2nd Half Payroll Run...\n";
$run2 = $service->calculatePayrollRun([
    'title' => 'October 2026 Semi-Monthly Payroll (2nd Half: Oct 16 - Oct 31)',
    'period_start' => '2026-10-16',
    'period_end' => '2026-10-31',
    'payout_date' => '2026-11-05',
    'pay_frequency' => 'semi_monthly',
    'notes' => 'End-of-month payroll run pending final executive approval.'
], 1);

echo "Run 2 Created: #{$run2['run_number']} with {$run2['payslips_count']} payslips. Total Net: $" . number_format($run2['totals']['total_net_pay'], 2) . "\n";

echo "Successfully seeded Payroll Runs and Employee Payslips!\n";
