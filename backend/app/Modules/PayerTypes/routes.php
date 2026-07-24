<?php

use App\Modules\PayerTypes\Controllers\PayerTypeController;

/** @var \App\Core\Router $router */

$router->get('/payer-types', [PayerTypeController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/payer-types', [PayerTypeController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/payer-types', [PayerTypeController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/payer-types', [PayerTypeController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
