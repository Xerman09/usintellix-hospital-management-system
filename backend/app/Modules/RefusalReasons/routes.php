<?php

use App\Modules\RefusalReasons\Controllers\RefusalReasonController;

/** @var \App\Core\Router $router */

$router->get('/refusal-reasons', [RefusalReasonController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/refusal-reasons', [RefusalReasonController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/refusal-reasons', [RefusalReasonController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/refusal-reasons', [RefusalReasonController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
