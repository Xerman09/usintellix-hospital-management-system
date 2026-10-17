<?php

use App\Modules\EquipmentAssets\Controllers\EquipmentAssetController;

/** @var \App\Core\Router $router */

$router->get('/equipment-assets', [EquipmentAssetController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->get('/equipment-assets/metrics', [EquipmentAssetController::class, 'metrics'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->get('/equipment-assets/locations', [EquipmentAssetController::class, 'locations'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->get('/equipment-assets/show', [EquipmentAssetController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->post('/equipment-assets', [EquipmentAssetController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/equipment-assets', [EquipmentAssetController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/equipment-assets/status', [EquipmentAssetController::class, 'status'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/equipment-assets/logs', [EquipmentAssetController::class, 'recordLog'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/equipment-assets', [EquipmentAssetController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
