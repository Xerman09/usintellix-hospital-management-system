<?php

use App\Modules\PatientLetters\Controllers\PatientLetterController;

/** @var \App\Core\Router $router */

$router->post('/patient-letters', [PatientLetterController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-letters', [PatientLetterController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
