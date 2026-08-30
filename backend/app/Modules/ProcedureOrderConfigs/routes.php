<?php

use App\Modules\ProcedureOrderConfigs\Controllers\ProcedureOrderConfigController;

/** @var \App\Core\Router $router */

$router->get('/procedure-order-configs', [ProcedureOrderConfigController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/procedure-order-configs', [ProcedureOrderConfigController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/procedure-order-configs', [ProcedureOrderConfigController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/procedure-order-configs', [ProcedureOrderConfigController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
