<?php

use App\Modules\PatientMerge\Controllers\PatientMergeController;

/** @var \App\Core\Router $router */

$router->get('/patient-merge/validate', [PatientMergeController::class, 'validatePair'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/patient-merge', [PatientMergeController::class, 'merge'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
