<?php

use App\Modules\Classes\Controllers\ClassController;

/** @var \App\Core\Router $router */

$router->get('/classes', [ClassController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/classes', [ClassController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/classes', [ClassController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/classes', [ClassController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
