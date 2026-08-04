<?php

use App\Modules\PatientImmunizations\Controllers\PatientImmunizationController;

/** @var \App\Core\Router $router */

$router->get('/patient-immunizations', [PatientImmunizationController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-immunizations', [PatientImmunizationController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-immunizations', [PatientImmunizationController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/patient-immunizations', [PatientImmunizationController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
