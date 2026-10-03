<?php

use App\Modules\Payables\Controllers\PayableController;
use App\Modules\Payables\Services\PayableService;

/** @var \App\Core\Router $router */

$payableRoles = [AuthMiddleware::class, [RoleMiddleware::class, PayableService::ROLES]];

$router->get('/payables/summary', [PayableController::class, 'summary'], $payableRoles);
$router->get('/payables/bills', [PayableController::class, 'bills'], $payableRoles);
$router->get('/payables/suppliers', [PayableController::class, 'suppliers'], $payableRoles);
$router->get('/payables/payments', [PayableController::class, 'payments'], $payableRoles);
$router->get('/payables/payments/detail', [PayableController::class, 'payment'], $payableRoles);
$router->post('/payables/payments', [PayableController::class, 'store'], $payableRoles);
$router->post('/payables/payments/void', [PayableController::class, 'void'], $payableRoles);
$router->get('/payables/aging', [PayableController::class, 'aging'], $payableRoles);
$router->get('/payables/credits', [PayableController::class, 'credits'], $payableRoles);
$router->post('/payables/credits/apply', [PayableController::class, 'applyCredit'], $payableRoles);
$router->get('/payables/ledger', [PayableController::class, 'ledger'], $payableRoles);
