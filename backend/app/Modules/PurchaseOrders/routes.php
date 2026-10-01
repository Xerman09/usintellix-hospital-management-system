<?php

use App\Modules\PurchaseOrders\Controllers\PurchaseOrderController;

/** @var \App\Core\Router $router */

$purchaseOrderRoles = ['admin', 'receptionist', 'doctor'];

$router->get('/purchase-orders', [PurchaseOrderController::class, 'index'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderRoles]]);
$router->get('/purchase-orders/detail', [PurchaseOrderController::class, 'show'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderRoles]]);
$router->get('/purchase-orders/options', [PurchaseOrderController::class, 'options'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderRoles]]);
$router->post('/purchase-orders', [PurchaseOrderController::class, 'store'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderRoles]]);
$router->put('/purchase-orders', [PurchaseOrderController::class, 'update'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderRoles]]);
$router->post('/purchase-orders/cancel', [PurchaseOrderController::class, 'cancel'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderRoles]]);
$router->delete('/purchase-orders', [PurchaseOrderController::class, 'destroy'], [AuthMiddleware::class, [RoleMiddleware::class, $purchaseOrderRoles]]);
