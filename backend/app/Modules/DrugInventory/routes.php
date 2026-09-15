<?php

use App\Modules\DrugInventory\Controllers\DrugInventoryController;

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
