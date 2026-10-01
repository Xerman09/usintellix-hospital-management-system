<?php

use App\Modules\Suppliers\Controllers\SupplierController;
use App\Modules\Suppliers\Controllers\SupplierProductController;

/** @var \App\Core\Router $router */

$supplierRoles = ['admin', 'receptionist', 'doctor'];

$router->get('/suppliers', [SupplierController::class, 'index'], [AuthMiddleware::class, [RoleMiddleware::class, $supplierRoles]]);
$router->get('/suppliers/detail', [SupplierController::class, 'show'], [AuthMiddleware::class, [RoleMiddleware::class, $supplierRoles]]);
$router->get('/suppliers/options', [SupplierController::class, 'options'], [AuthMiddleware::class, [RoleMiddleware::class, $supplierRoles]]);
$router->post('/suppliers', [SupplierController::class, 'store'], [AuthMiddleware::class, [RoleMiddleware::class, $supplierRoles]]);
$router->post('/suppliers/import', [SupplierController::class, 'import'], [AuthMiddleware::class, [RoleMiddleware::class, $supplierRoles]]);
$router->put('/suppliers', [SupplierController::class, 'update'], [AuthMiddleware::class, [RoleMiddleware::class, $supplierRoles]]);
$router->delete('/suppliers', [SupplierController::class, 'destroy'], [AuthMiddleware::class, [RoleMiddleware::class, $supplierRoles]]);

$router->get('/supplier-products', [SupplierProductController::class, 'index'], [AuthMiddleware::class, [RoleMiddleware::class, $supplierRoles]]);
$router->get('/supplier-products/options', [SupplierProductController::class, 'options'], [AuthMiddleware::class, [RoleMiddleware::class, $supplierRoles]]);
$router->post('/supplier-products', [SupplierProductController::class, 'store'], [AuthMiddleware::class, [RoleMiddleware::class, $supplierRoles]]);
$router->put('/supplier-products', [SupplierProductController::class, 'update'], [AuthMiddleware::class, [RoleMiddleware::class, $supplierRoles]]);
$router->delete('/supplier-products', [SupplierProductController::class, 'destroy'], [AuthMiddleware::class, [RoleMiddleware::class, $supplierRoles]]);
