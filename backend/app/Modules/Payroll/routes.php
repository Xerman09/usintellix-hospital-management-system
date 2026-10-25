<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\Payroll\Controllers\SalaryStructureController;

/** @var \App\Core\Router $router */

$payrollView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$payrollAdmin = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'accountant']]];

// Salary Structure & Payroll Routes
$router->get('/payroll/salary-structures', [SalaryStructureController::class, 'index'], $payrollView);
$router->get('/payroll/salary-structures/detail', [SalaryStructureController::class, 'detail'], $payrollView);
$router->get('/payroll/metadata', [SalaryStructureController::class, 'metadata'], $payrollView);
$router->post('/payroll/simulate-gross', [SalaryStructureController::class, 'simulateGross'], $payrollView);

$router->post('/payroll/salary-structures', [SalaryStructureController::class, 'store'], $payrollAdmin);
$router->post('/payroll/salary-structures/update', [SalaryStructureController::class, 'update'], $payrollAdmin);
$router->put('/payroll/salary-structures', [SalaryStructureController::class, 'update'], $payrollAdmin);
$router->delete('/payroll/salary-structures', [SalaryStructureController::class, 'destroy'], $payrollAdmin);
$router->post('/payroll/salary-structures/delete', [SalaryStructureController::class, 'destroy'], $payrollAdmin);
