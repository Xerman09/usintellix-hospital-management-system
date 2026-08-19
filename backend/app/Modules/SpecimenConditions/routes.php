<?php

use App\Modules\SpecimenConditions\Controllers\SpecimenConditionController;

/** @var \App\Core\Router $router */

$router->get('/specimen-conditions', [SpecimenConditionController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/specimen-conditions', [SpecimenConditionController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/specimen-conditions', [SpecimenConditionController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/specimen-conditions', [SpecimenConditionController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
