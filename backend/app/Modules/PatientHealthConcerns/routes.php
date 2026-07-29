<?php

use App\Modules\PatientHealthConcerns\Controllers\PatientHealthConcernController;

/** @var \App\Core\Router $router */

$router->get('/patient-health-concerns', [PatientHealthConcernController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-health-concerns', [PatientHealthConcernController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-health-concerns', [PatientHealthConcernController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/patient-health-concerns', [PatientHealthConcernController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
