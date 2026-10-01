<?php

use App\Modules\PurchaseOrders\Controllers\PurchaseOrderController;
use App\Modules\PurchaseOrders\Services\PurchaseOrderService;

/** @var \App\Core\Router $router */

$purchaseOrderRoles = PurchaseOrderService::CREATOR_ROLES;
// Approvers who don't create orders (e.g. accountants) can still see them.
$purchaseOrderViewRoles = array_values(array_unique(array_merge(PurchaseOrderService::CREATOR_ROLES, PurchaseOrderService::APPROVER_ROLES)));

$router->get('/purchase-orders', [PurchaseOrderController::class, 'index'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderViewRoles]]);
$router->get('/purchase-orders/detail', [PurchaseOrderController::class, 'show'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderViewRoles]]);
$router->get('/purchase-orders/options', [PurchaseOrderController::class, 'options'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderRoles]]);
$router->post('/purchase-orders', [PurchaseOrderController::class, 'store'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderRoles]]);
$router->put('/purchase-orders', [PurchaseOrderController::class, 'update'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderRoles]]);
$router->post('/purchase-orders/approve', [PurchaseOrderController::class, 'approve'], [AuthMiddleware::class, [RoleMiddleware::class, PurchaseOrderService::APPROVER_ROLES]]);
$router->post('/purchase-orders/reject', [PurchaseOrderController::class, 'reject'], [AuthMiddleware::class, [RoleMiddleware::class, PurchaseOrderService::APPROVER_ROLES]]);
$router->post('/purchase-orders/cancel', [PurchaseOrderController::class, 'cancel'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderViewRoles]]);
$router->post('/purchase-orders/close', [PurchaseOrderController::class, 'close'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderRoles]]);
$router->delete('/purchase-orders', [PurchaseOrderController::class, 'destroy'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderRoles]]);
