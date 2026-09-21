<?php

use App\Modules\Auth\Controllers\AuthController;

/** @var \App\Core\Router $router */

$router->post('/login', [AuthController::class, 'login']);
$router->post('/verify-2fa', [AuthController::class, 'verifyTwoFactor']);
$router->get('/ping', [AuthController::class, 'ping'], [AuthMiddleware::class]);
$router->post('/logout', [AuthController::class, 'logout'], [AuthMiddleware::class]);
$router->put('/auth/first-login', [AuthController::class, 'completeFirstLogin'], [AuthMiddleware::class]);
$router->put('/auth/expired-password', [AuthController::class, 'updateExpiredPassword']);