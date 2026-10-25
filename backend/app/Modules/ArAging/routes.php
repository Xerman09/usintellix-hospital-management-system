<?php

use App\Modules\ArAging\Controllers\ArAgingController;

/** @var \App\Core\Router $router */

$billingView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$billingAction = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];

// Accounts Receivable (AR) Aging Engine & Collection Dashboard
$router->get('/ar-aging/matrix', [ArAgingController::class, 'matrix'], $billingView);
$router->get('/ar-aging/accounts', [ArAgingController::class, 'index'], $billingView);
$router->get('/ar-aging/detail', [ArAgingController::class, 'detail'], $billingView);

$router->post('/ar-aging/action', [ArAgingController::class, 'logAction'], $billingAction);
$router->post('/ar-aging/status', [ArAgingController::class, 'updateStatus'], $billingAction);
$router->post('/ar-aging/sync', [ArAgingController::class, 'sync'], $billingAction);
$router->post('/ar-aging/seed-demo', [ArAgingController::class, 'seedDemo'], $billingAction);
