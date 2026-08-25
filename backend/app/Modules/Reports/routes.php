<?php

use App\Modules\Reports\Controllers\ReportController;

/** @var \App\Core\Router $router */

$router->get('/reports/patient-list', [ReportController::class, 'patientList'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
