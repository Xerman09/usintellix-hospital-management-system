<?php

use App\Modules\Patients\Controllers\PatientController;

/** @var \App\Core\Router $router */

$router->post('/patients', [PatientController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['receptionist']]
]);
