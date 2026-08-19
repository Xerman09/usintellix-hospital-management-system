<?php

use App\Modules\Patients\Controllers\PatientController;

/** @var \App\Core\Router $router */

$router->get('/patients', [PatientController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/patients/dashboard-summary', [PatientController::class, 'dashboardSummary'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patients', [PatientController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['receptionist']]
]);

$router->delete('/patients', [PatientController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/patients', [PatientController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/patients/photo', [PatientController::class, 'uploadPhoto'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->delete('/patients/photo', [PatientController::class, 'removePhoto'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);
