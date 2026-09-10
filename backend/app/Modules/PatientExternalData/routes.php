<?php

use App\Modules\PatientExternalData\Controllers\PatientExternalDataController;

/** @var \App\Core\Router $router */

$router->get('/patient-external-data', [PatientExternalDataController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-external-data', [PatientExternalDataController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/patient-external-data', [PatientExternalDataController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
