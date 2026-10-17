<?php

use App\Modules\ClinicSchedules\Controllers\ClinicScheduleController;

/** @var \App\Core\Router $router */

$router->get('/clinic-schedules/overview', [ClinicScheduleController::class, 'overview'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'receptionist', 'clinician', 'charge_nurse']]
]);

$router->get('/clinic-schedules/show', [ClinicScheduleController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'receptionist', 'clinician', 'charge_nurse']]
]);

$router->post('/clinic-schedules/save', [ClinicScheduleController::class, 'save'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'charge_nurse']]
]);

$router->post('/clinic-schedules/copy-day', [ClinicScheduleController::class, 'copyDay'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'charge_nurse']]
]);
