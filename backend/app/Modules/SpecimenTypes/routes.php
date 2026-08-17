<?php

use App\Modules\SpecimenTypes\Controllers\SpecimenTypeController;

/** @var \App\Core\Router $router */

$router->get('/specimen-types', [SpecimenTypeController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/specimen-types', [SpecimenTypeController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/specimen-types', [SpecimenTypeController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/specimen-types', [SpecimenTypeController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
