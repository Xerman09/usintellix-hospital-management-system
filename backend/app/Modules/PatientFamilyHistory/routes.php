<?php

use App\Modules\PatientFamilyHistory\Controllers\PatientFamilyHistoryController;

/** @var \App\Core\Router $router */

$router->get('/patient-family-history', [PatientFamilyHistoryController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-family-history', [PatientFamilyHistoryController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
