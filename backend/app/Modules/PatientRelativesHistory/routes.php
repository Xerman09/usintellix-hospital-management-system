<?php

use App\Modules\PatientRelativesHistory\Controllers\PatientRelativesHistoryController;

/** @var \App\Core\Router $router */

$router->get('/patient-relatives-history', [PatientRelativesHistoryController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-relatives-history', [PatientRelativesHistoryController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
