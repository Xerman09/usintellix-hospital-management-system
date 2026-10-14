<?php

use App\Modules\Auth\Controllers\AuthController;

/** @var \App\Core\Router $router */

$router->post('/login', [AuthController::class, 'login']);
$router->post('/verify-2fa', [AuthController::class, 'verifyTwoFactor']);
$router->post('/resend-2fa', [AuthController::class, 'resendTwoFactor']);
$router->get('/ping', [AuthController::class, 'ping'], [AuthMiddleware::class]);
$router->get('/auth/me', [AuthController::class, 'me'], [AuthMiddleware::class]);
$router->post('/logout', [AuthController::class, 'logout'], [AuthMiddleware::class]);
$router->put('/auth/first-login', [AuthController::class, 'completeFirstLogin'], [AuthMiddleware::class]);
$router->put('/auth/expired-password', [AuthController::class, 'updateExpiredPassword']);
$router->put('/auth/breached-password', [AuthController::class, 'updateBreachedPassword']);
$router->post('/auth/check-password-breach', [AuthController::class, 'checkPasswordBreach']);
$router->post('/auth/npp-acknowledge', [AuthController::class, 'acknowledgeNpp'], [AuthMiddleware::class]);