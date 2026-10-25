<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\Payroll\Controllers\SalaryStructureController;
use App\Modules\Payroll\Controllers\PayrollController;

/** @var \App\Core\Router $router */

$payrollView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$payrollAdmin = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'accountant']]];

// Salary Structure & Payroll Routes
$router->get('/payroll/salary-structures', [SalaryStructureController::class, 'index'], $payrollView);
$router->get('/payroll/salary-structures/detail', [SalaryStructureController::class, 'detail'], $payrollView);
$router->get('/payroll/metadata', [SalaryStructureController::class, 'metadata'], $payrollView);
$router->post('/payroll/simulate-gross', [SalaryStructureController::class, 'simulateGross'], $payrollView);
$router->get('/payroll/doctor-commissions/pull', [SalaryStructureController::class, 'pullDoctorCommissions'], $payrollView);
$router->post('/payroll/doctor-commissions/approve', [SalaryStructureController::class, 'approveDoctorCommissions'], $payrollAdmin);

$router->post('/payroll/salary-structures', [SalaryStructureController::class, 'store'], $payrollAdmin);
$router->post('/payroll/salary-structures/update', [SalaryStructureController::class, 'update'], $payrollAdmin);
$router->put('/payroll/salary-structures', [SalaryStructureController::class, 'update'], $payrollAdmin);
$router->delete('/payroll/salary-structures', [SalaryStructureController::class, 'destroy'], $payrollAdmin);
$router->post('/payroll/salary-structures/delete', [SalaryStructureController::class, 'destroy'], $payrollAdmin);

// Master Payroll Runs & Payslip Computation Routes
$router->get('/payroll/runs', [PayrollController::class, 'index'], $payrollView);
$router->get('/payroll/runs/detail', [PayrollController::class, 'detail'], $payrollView);
$router->post('/payroll/runs/calculate', [PayrollController::class, 'calculateRun'], $payrollAdmin);
$router->post('/payroll/runs/approve', [PayrollController::class, 'approveRun'], $payrollAdmin);
$router->post('/payroll/runs/disburse', [PayrollController::class, 'disburseRun'], $payrollAdmin);

// Individual Payslip & Employee History
$router->get('/payroll/payslips/detail', [PayrollController::class, 'payslipDetail'], $payrollView);
$router->get('/payroll/payslips/my-history', [PayrollController::class, 'myPayslips'], $payrollView);
