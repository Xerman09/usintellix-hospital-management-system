<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\SupplyCatalog\Controllers\SupplyCatalogController;

/** @var \App\Core\Router $router */

$scView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant', 'pharmacist', 'warehouse_staff']]];
$scManage = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'nurse', 'charge_nurse', 'pharmacist', 'warehouse_staff', 'accountant']]];

// Hospital Non-Pharmaceutical Supply Catalog Routes
$router->get('/supply-catalog/items', [SupplyCatalogController::class, 'index'], $scView);
$router->get('/supply-catalog/metrics', [SupplyCatalogController::class, 'metrics'], $scView);
$router->get('/supply-catalog/metadata', [SupplyCatalogController::class, 'metadata'], $scView);
$router->get('/supply-catalog/items/:id', [SupplyCatalogController::class, 'show'], $scView);

$router->post('/supply-catalog/items', [SupplyCatalogController::class, 'store'], $scManage);
$router->post('/supply-catalog/items/update', [SupplyCatalogController::class, 'update'], $scManage);
$router->put('/supply-catalog/items', [SupplyCatalogController::class, 'update'], $scManage);
$router->delete('/supply-catalog/items', [SupplyCatalogController::class, 'destroy'], $scManage);
$router->post('/supply-catalog/items/delete', [SupplyCatalogController::class, 'destroy'], $scManage);

$router->post('/supply-catalog/adjust-stock', [SupplyCatalogController::class, 'adjustStock'], $scManage);
