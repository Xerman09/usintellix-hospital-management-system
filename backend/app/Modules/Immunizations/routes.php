<?php

use App\Modules\Immunizations\Controllers\ImmunizationController;

/** @var \App\Core\Router $router */

$router->get('/immunizations', [ImmunizationController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/immunizations', [ImmunizationController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/immunizations', [ImmunizationController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/immunizations', [ImmunizationController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
