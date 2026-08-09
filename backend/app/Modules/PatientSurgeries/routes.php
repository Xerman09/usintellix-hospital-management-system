<?php

use App\Modules\PatientSurgeries\Controllers\PatientSurgeryController;

/** @var \App\Core\Router $router */

$router->get('/patient-surgeries', [PatientSurgeryController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-surgeries', [PatientSurgeryController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-surgeries', [PatientSurgeryController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/patient-surgeries', [PatientSurgeryController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
