<?php

use App\Modules\PatientLifestyle\Controllers\PatientLifestyleController;

/** @var \App\Core\Router $router */

$router->get('/patient-lifestyle', [PatientLifestyleController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-lifestyle', [PatientLifestyleController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
