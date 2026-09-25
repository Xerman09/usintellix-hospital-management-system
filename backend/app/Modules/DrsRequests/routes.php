<?php

use App\Modules\DrsRequests\Controllers\DrsRequestController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

/** @var \App\Core\Router $router */

$router->get('/drs-requests/stats', [DrsRequestController::class, 'stats'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'receptionist', 'staff']]
]);

$router->get('/drs-requests/export-csv', [DrsRequestController::class, 'exportCsv'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'receptionist', 'staff']]
]);

$router->get('/drs-requests/show', [DrsRequestController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'receptionist', 'staff']]
]);

$router->get('/drs-requests/bundle', [DrsRequestController::class, 'bundle'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'receptionist', 'staff']]
]);

$router->get('/drs-requests/extension-notice', [DrsRequestController::class, 'extensionNotice'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'receptionist', 'staff']]
]);

$router->get('/drs-requests', [DrsRequestController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'receptionist', 'staff']]
]);

$router->post('/drs-requests/extension', [DrsRequestController::class, 'grantExtension'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'receptionist', 'staff']]
]);

$router->post('/drs-requests/fulfill', [DrsRequestController::class, 'fulfill'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'receptionist', 'staff']]
]);

$router->post('/drs-requests/deny', [DrsRequestController::class, 'deny'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'receptionist', 'staff']]
]);

$router->post('/drs-requests', [DrsRequestController::class, 'create'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'receptionist', 'staff']]
]);
