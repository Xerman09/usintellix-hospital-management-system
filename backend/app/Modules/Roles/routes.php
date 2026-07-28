<?php

use App\Modules\Roles\Controllers\RoleController;

/** @var \App\Core\Router $router */

$router->get('/roles', [RoleController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/roles', [RoleController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/roles', [RoleController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/roles', [RoleController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
