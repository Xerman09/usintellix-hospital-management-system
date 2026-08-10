<?php

use App\Modules\VoidReasons\Controllers\VoidReasonController;

/** @var \App\Core\Router $router */

$router->get('/void-reasons', [VoidReasonController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/void-reasons', [VoidReasonController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/void-reasons', [VoidReasonController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/void-reasons', [VoidReasonController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
