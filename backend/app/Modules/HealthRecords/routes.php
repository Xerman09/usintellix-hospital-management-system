<?php

use App\Modules\HealthRecords\Controllers\HealthRecordController;

/** @var \App\Core\Router $router */

$router->get('/health-summary', [HealthRecordController::class, 'summary'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'patient']]
]);
