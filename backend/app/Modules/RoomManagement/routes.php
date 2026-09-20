<?php

use App\Modules\RoomManagement\Controllers\RoomManagementController;

/** @var \App\Core\Router $router */

// 1. Availability Monitor
$router->get('/room-management/monitor', [RoomManagementController::class, 'monitor'], [
    AuthMiddleware::class
]);

// 2. Buildings
$router->get('/room-management/buildings', [RoomManagementController::class, 'buildingsIndex'], [
    AuthMiddleware::class
]);

$router->post('/room-management/buildings', [RoomManagementController::class, 'buildingsStore'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/room-management/buildings', [RoomManagementController::class, 'buildingsUpdate'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/room-management/buildings', [RoomManagementController::class, 'buildingsDestroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

// 3. Rooms
$router->get('/room-management/rooms', [RoomManagementController::class, 'roomsIndex'], [
    AuthMiddleware::class
]);

$router->get('/room-management/rooms/detail', [RoomManagementController::class, 'roomsDetail'], [
    AuthMiddleware::class
]);

$router->post('/room-management/rooms', [RoomManagementController::class, 'roomsStore'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/room-management/rooms', [RoomManagementController::class, 'roomsUpdate'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/room-management/rooms', [RoomManagementController::class, 'roomsDestroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

// 4. Beds
$router->get('/room-management/beds', [RoomManagementController::class, 'bedsIndex'], [
    AuthMiddleware::class
]);

$router->post('/room-management/beds', [RoomManagementController::class, 'bedsStore'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/room-management/beds', [RoomManagementController::class, 'bedsUpdate'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/room-management/beds/status', [RoomManagementController::class, 'bedsUpdateStatus'], [
    AuthMiddleware::class
]);

$router->delete('/room-management/beds', [RoomManagementController::class, 'bedsDestroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
