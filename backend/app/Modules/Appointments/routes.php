<?php

use App\Modules\Appointments\Controllers\AppointmentController;

/** @var \App\Core\Router $router */

$router->get('/appointments', [AppointmentController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/appointments', [AppointmentController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/appointments', [AppointmentController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/appointments', [AppointmentController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
