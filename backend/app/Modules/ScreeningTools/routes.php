<?php

use App\Modules\ScreeningTools\Controllers\ScreeningToolController;

/** @var \App\Core\Router $router */

$router->get('/screening-tools', [ScreeningToolController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/screening-tools', [ScreeningToolController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/screening-tools', [ScreeningToolController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/screening-tools', [ScreeningToolController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
