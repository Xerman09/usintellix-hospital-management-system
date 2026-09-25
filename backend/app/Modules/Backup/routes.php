<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\Backup\Controllers\BackupController;

/** @var \App\Core\Router $router */

$router->get('/backup/stats', [BackupController::class, 'stats'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist']]
]);

$router->get('/backup/latest', [BackupController::class, 'latest'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist']]
]);

$router->get('/backup/list', [BackupController::class, 'list'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist']]
]);

$router->post('/backup/create', [BackupController::class, 'create'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/backup/verify', [BackupController::class, 'verify'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/backup/drills', [BackupController::class, 'drills'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist']]
]);

$router->post('/backup/drills', [BackupController::class, 'storeDrill'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/backup/export/backups', [BackupController::class, 'exportBackups'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician']]
]);

$router->get('/backup/export/drills', [BackupController::class, 'exportDrills'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician']]
]);
