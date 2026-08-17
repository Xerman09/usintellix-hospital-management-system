<?php

use App\Modules\SpecimenMethods\Controllers\SpecimenMethodController;

/** @var \App\Core\Router $router */

$router->get('/specimen-methods', [SpecimenMethodController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/specimen-methods', [SpecimenMethodController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/specimen-methods', [SpecimenMethodController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/specimen-methods', [SpecimenMethodController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
