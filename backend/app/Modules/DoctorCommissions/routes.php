<?php

use App\Modules\DoctorCommissions\Controllers\DoctorCommissionController;

/** @var \App\Core\Router $router */

$billingView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$billingAction = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];

// Doctor Professional Fee (PF) Shares & Commissions
$router->get('/doctor-commissions/metrics', [DoctorCommissionController::class, 'metrics'], $billingView);
$router->get('/doctor-commissions/ledger', [DoctorCommissionController::class, 'index'], $billingView);
$router->get('/doctor-commissions/statements', [DoctorCommissionController::class, 'statements'], $billingView);
$router->get('/doctor-commissions/schedules', [DoctorCommissionController::class, 'schedules'], $billingView);

$router->post('/doctor-commissions/schedules', [DoctorCommissionController::class, 'saveSchedule'], $billingAction);
$router->post('/doctor-commissions/disburse', [DoctorCommissionController::class, 'disburse'], $billingAction);
$router->post('/doctor-commissions/manual-record', [DoctorCommissionController::class, 'manualRecord'], $billingAction);
$router->post('/doctor-commissions/calculate-simulation', [DoctorCommissionController::class, 'calculateSimulation'], $billingView);
$router->post('/doctor-commissions/seed-demo', [DoctorCommissionController::class, 'seedDemo'], $billingAction);
