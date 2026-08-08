<?php

use App\Modules\Surgeries\Controllers\SurgeryController;

/** @var \App\Core\Router $router */

$router->get('/surgeries', [SurgeryController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/surgeries', [SurgeryController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/surgeries', [SurgeryController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/surgeries', [SurgeryController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
