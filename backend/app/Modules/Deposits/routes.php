<?php

use App\Modules\Deposits\Controllers\PatientDepositController;

/** @var \App\Core\Router $router */

$billingView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$billingAction = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];

// Patient Advance Deposits & Automated Drawdowns
$router->get('/patient-deposits', [PatientDepositController::class, 'index'], $billingView);
$router->get('/patient-deposits/detail', [PatientDepositController::class, 'detail'], $billingView);
$router->get('/patient-deposits/metrics', [PatientDepositController::class, 'metrics'], $billingView);
$router->get('/patient-deposits/admissions', [PatientDepositController::class, 'admissions'], $billingView);

$router->post('/patient-deposits', [PatientDepositController::class, 'store'], $billingAction);
$router->post('/patient-deposits/drawdown', [PatientDepositController::class, 'drawdown'], $billingAction);
$router->post('/patient-deposits/refund', [PatientDepositController::class, 'refund'], $billingAction);
