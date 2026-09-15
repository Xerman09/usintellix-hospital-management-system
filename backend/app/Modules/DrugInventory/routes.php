<?php

use App\Modules\DrugInventory\Controllers\DrugInventoryController;
use App\Modules\DrugInventory\Controllers\WarehouseController;

/** @var \App\Core\Router $router */

$router->get('/drug-inventory', [DrugInventoryController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/drug-inventory/options', [DrugInventoryController::class, 'options'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/drug-inventory', [DrugInventoryController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/drug-inventory/transfer', [DrugInventoryController::class, 'transfer'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/warehouses', [WarehouseController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/warehouses', [WarehouseController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/warehouses', [WarehouseController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/warehouses', [WarehouseController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
