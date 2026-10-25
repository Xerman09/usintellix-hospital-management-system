<?php

use App\Modules\Cashiering\Controllers\CashieringController;

/** @var \App\Core\Router $router */

$cashierView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$cashierAction = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];

// Split-Tender Cashiering & Compliant Tax Receipts
$router->get('/cashier/transactions', [CashieringController::class, 'index'], $cashierView);
$router->get('/cashier/transactions/detail', [CashieringController::class, 'detail'], $cashierView);
$router->get('/cashier/shift-summary', [CashieringController::class, 'shiftSummary'], $cashierView);
$router->get('/cashier/billable-entities', [CashieringController::class, 'billableEntities'], $cashierView);

$router->post('/cashier/transactions/checkout', [CashieringController::class, 'checkout'], $cashierAction);
$router->post('/cashier/transactions/void', [CashieringController::class, 'void'], $cashierAction);
