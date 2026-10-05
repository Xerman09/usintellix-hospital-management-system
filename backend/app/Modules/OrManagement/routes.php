<?php

use App\Modules\OrManagement\Controllers\OrManagementController;

/** @var \App\Core\Router $router */

$router->get('/or-management/schedule', [OrManagementController::class, 'schedule'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/or-management/options', [OrManagementController::class, 'options'], [
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

// ---------------------------------------------------------------
// OR Schedule (Surgery Phase 3): calendar, conflict checks, booking
// ready surgery requests, rescheduling, block times.
// ---------------------------------------------------------------
use App\Modules\OrManagement\Controllers\OrScheduleController;
use App\Modules\OrManagement\Services\OrSchedulingService;

$orScheduleRoles = [AuthMiddleware::class, [RoleMiddleware::class, OrSchedulingService::ROLES]];
$orScheduleAdmin = [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]];

$router->get('/or-schedule', [OrScheduleController::class, 'calendar'], $orScheduleRoles);
$router->post('/or-schedule/check', [OrScheduleController::class, 'check'], $orScheduleRoles);
$router->get('/or-schedule/case', [OrScheduleController::class, 'show'], $orScheduleRoles);
$router->post('/or-schedule/book', [OrScheduleController::class, 'book'], $orScheduleRoles);
$router->post('/or-schedule/reschedule', [OrScheduleController::class, 'reschedule'], $orScheduleRoles);
$router->post('/or-schedule/cancel', [OrScheduleController::class, 'cancel'], $orScheduleRoles);
$router->get('/or-schedule/blocks', [OrScheduleController::class, 'blocks'], $orScheduleRoles);
$router->post('/or-schedule/blocks', [OrScheduleController::class, 'saveBlock'], $orScheduleAdmin);
$router->post('/or-schedule/blocks/remove', [OrScheduleController::class, 'removeBlock'], $orScheduleAdmin);
$router->post('/or-schedule/turnover', [OrScheduleController::class, 'turnover'], $orScheduleAdmin);
