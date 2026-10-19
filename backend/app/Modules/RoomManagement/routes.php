<?php

use App\Modules\RoomManagement\Controllers\RoomManagementController;
use App\Modules\RoomManagement\Controllers\BedTurnoverController;

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

// 5. Environmental Services (EVS) / Bed Turnover Pipeline
$router->get('/room-management/evs/turnovers', [BedTurnoverController::class, 'index'], [
    AuthMiddleware::class
]);

$router->get('/room-management/evs/stats', [BedTurnoverController::class, 'stats'], [
    AuthMiddleware::class
]);

$router->get('/room-management/evs/turnover/detail', [BedTurnoverController::class, 'detail'], [
    AuthMiddleware::class
]);

$router->post('/room-management/evs/turnovers', [BedTurnoverController::class, 'store'], [
    AuthMiddleware::class
]);

$router->post('/room-management/evs/turnover/assign', [BedTurnoverController::class, 'assign'], [
    AuthMiddleware::class
]);

$router->post('/room-management/evs/turnover/start', [BedTurnoverController::class, 'start'], [
    AuthMiddleware::class
]);

$router->post('/room-management/evs/turnover/complete', [BedTurnoverController::class, 'complete'], [
    AuthMiddleware::class
]);

$router->post('/room-management/evs/turnover/inspect', [BedTurnoverController::class, 'inspect'], [
    AuthMiddleware::class
]);

$router->post('/room-management/evs/turnover/cancel', [BedTurnoverController::class, 'cancel'], [
    AuthMiddleware::class
]);

