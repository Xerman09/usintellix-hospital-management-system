<?php

use App\Modules\CqmSourceOfPayments\Controllers\CqmSourceOfPaymentController;

/** @var \App\Core\Router $router */

$router->get('/cqm-source-of-payments', [CqmSourceOfPaymentController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/cqm-source-of-payments', [CqmSourceOfPaymentController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/cqm-source-of-payments', [CqmSourceOfPaymentController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/cqm-source-of-payments', [CqmSourceOfPaymentController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
