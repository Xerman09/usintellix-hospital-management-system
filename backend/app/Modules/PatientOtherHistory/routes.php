<?php

use App\Modules\PatientOtherHistory\Controllers\PatientOtherHistoryController;

/** @var \App\Core\Router $router */

$router->get('/patient-other-history', [PatientOtherHistoryController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-other-history', [PatientOtherHistoryController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
