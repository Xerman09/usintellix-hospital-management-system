<?php

use App\Modules\PatientGeneralHistory\Controllers\PatientGeneralHistoryController;

/** @var \App\Core\Router $router */

$router->get('/patient-general-history', [PatientGeneralHistoryController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-general-history', [PatientGeneralHistoryController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
