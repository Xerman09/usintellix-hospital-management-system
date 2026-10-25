<?php

use App\Modules\RefundRequests\Controllers\RefundRequestController;

/** @var \App\Core\Router $router */

$billingView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$billingAction = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];

// Refund Authorization Pipeline
$router->get('/refund-requests', [RefundRequestController::class, 'index'], $billingView);
$router->get('/refund-requests/detail', [RefundRequestController::class, 'detail'], $billingView);
$router->get('/refund-requests/summary', [RefundRequestController::class, 'summary'], $billingView);
$router->get('/refund-requests/candidates', [RefundRequestController::class, 'candidates'], $billingView);

$router->post('/refund-requests', [RefundRequestController::class, 'create'], $billingAction);
$router->post('/refund-requests/review', [RefundRequestController::class, 'review'], $billingAction);
$router->post('/refund-requests/voucher', [RefundRequestController::class, 'voucher'], $billingAction);
$router->post('/refund-requests/disburse', [RefundRequestController::class, 'disburse'], $billingAction);
$router->post('/refund-requests/void', [RefundRequestController::class, 'void'], $billingAction);
