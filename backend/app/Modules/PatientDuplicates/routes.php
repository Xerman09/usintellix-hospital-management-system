<?php

use App\Modules\PatientDuplicates\Controllers\PatientDuplicateController;

/** @var \App\Core\Router $router */

$router->get('/patient-duplicates', [PatientDuplicateController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/patient-duplicates/dismiss', [PatientDuplicateController::class, 'dismiss'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
