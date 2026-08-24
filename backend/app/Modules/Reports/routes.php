<?php

use App\Modules\Reports\Controllers\ReportController;
use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;

/** @var \App\Core\Router $router */

$router->get('/reports/patient-list', [ReportController::class, 'patientList'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
