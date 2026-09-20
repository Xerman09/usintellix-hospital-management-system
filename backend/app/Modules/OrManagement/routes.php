<?php

use App\Modules\OrManagement\Controllers\OrManagementController;

/** @var \App\Core\Router $router */

$router->get('/or-management/schedule', [OrManagementController::class, 'schedule'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/or-management/suites', [OrManagementController::class, 'suites'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/or-management/details', [OrManagementController::class, 'details'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/or-management/cases', [OrManagementController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/or-management/cases/update', [OrManagementController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/or-management/cases/stage', [OrManagementController::class, 'stage'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/or-management/suites/status', [OrManagementController::class, 'suiteStatus'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/or-management/suites', [OrManagementController::class, 'createSuite'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/or-management/suites/update', [OrManagementController::class, 'updateSuite'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
