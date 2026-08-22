<?php

use App\Modules\Profile\Controllers\ProfileController;

/** @var \App\Core\Router $router */

$router->get('/profile', [ProfileController::class, 'show'], [AuthMiddleware::class]);
$router->put('/profile', [ProfileController::class, 'update'], [AuthMiddleware::class]);
$router->put('/profile/password', [ProfileController::class, 'changePassword'], [AuthMiddleware::class]);
$router->post('/profile/avatar', [ProfileController::class, 'uploadAvatar'], [AuthMiddleware::class]);
$router->delete('/profile/avatar', [ProfileController::class, 'removeAvatar'], [AuthMiddleware::class]);
$router->post('/profile/signature', [ProfileController::class, 'saveSignature'], [AuthMiddleware::class]);
