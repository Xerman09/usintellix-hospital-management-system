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

// ---------------------------------------------------------------
// Forgot Password. Unauthenticated by necessity -- the whole point
// is that the caller cannot sign in -- so every one of these is
// rate-limited inside PasswordResetService and none of them ever
// says whether an account exists.
// ---------------------------------------------------------------
$router->post('/auth/password-reset/request', [AuthController::class, 'requestPasswordReset']);
$router->post('/auth/password-reset/verify', [AuthController::class, 'verifyPasswordResetCode']);
$router->post('/auth/password-reset/complete', [AuthController::class, 'completePasswordReset']);