<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\LeaveManagement\Controllers\LeaveController;

/** @var \App\Core\Router $router */

$leaveView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$leaveAction = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'accountant']]];
$leaveAdmin = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'charge_nurse', 'accountant']]];

// Leave Management Routes
$router->get('/leave/requests', [LeaveController::class, 'index'], $leaveView);
$router->get('/leave/balances', [LeaveController::class, 'balances'], $leaveView);
$router->get('/leave/metadata', [LeaveController::class, 'metadata'], $leaveView);

$router->post('/leave/requests', [LeaveController::class, 'store'], $leaveAction);
$router->post('/leave/requests/coverage-ack', [LeaveController::class, 'coverageAck'], $leaveAction);
$router->post('/leave/requests/cancel', [LeaveController::class, 'cancel'], $leaveAction);

$router->post('/leave/requests/approve', [LeaveController::class, 'approve'], $leaveAdmin);
$router->post('/leave/requests/reject', [LeaveController::class, 'reject'], $leaveAdmin);
