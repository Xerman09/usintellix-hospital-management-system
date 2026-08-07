<?php

use App\Modules\Providers\Controllers\ProviderController;

/** @var \App\Core\Router $router */

$router->get('/providers', [ProviderController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/providers', [ProviderController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/providers', [ProviderController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
