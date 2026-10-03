<?php

use App\Modules\PurchaseOrders\Services\PurchaseOrderService;
use App\Modules\Receiving\Controllers\ReceivingController;

/** @var \App\Core\Router $router */

// The people who order receive the deliveries; approvers (e.g.
// accountants) can see what's ready for receiving and the receipts,
// but not receive stock themselves.
$receivingRoles = PurchaseOrderService::CREATOR_ROLES;
$receivingViewRoles = array_values(array_unique(array_merge(PurchaseOrderService::CREATOR_ROLES, PurchaseOrderService::APPROVER_ROLES)));

$router->get('/receiving/pending', [ReceivingController::class, 'pending'], [AuthMiddleware::class, [RoleMiddleware::class, $receivingViewRoles]]);
$router->get('/receiving/order', [ReceivingController::class, 'order'], [AuthMiddleware::class, [RoleMiddleware::class, $receivingViewRoles]]);
$router->get('/receiving', [ReceivingController::class, 'index'], [AuthMiddleware::class, [RoleMiddleware::class, $receivingViewRoles]]);
$router->get('/receiving/detail', [ReceivingController::class, 'show'], [AuthMiddleware::class, [RoleMiddleware::class, $receivingViewRoles]]);
$router->post('/receiving', [ReceivingController::class, 'store'], [AuthMiddleware::class, [RoleMiddleware::class, $receivingRoles]]);
$router->post('/receiving/void', [ReceivingController::class, 'void'], [AuthMiddleware::class, [RoleMiddleware::class, $receivingRoles]]);
