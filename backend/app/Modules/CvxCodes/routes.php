<?php

use App\Modules\CvxCodes\Controllers\CvxCodeController;

/** @var \App\Core\Router $router */

$router->get('/cvx-codes', [CvxCodeController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/cvx-codes', [CvxCodeController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/cvx-codes', [CvxCodeController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/cvx-codes', [CvxCodeController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
