<?php

use App\Modules\Auth\Controllers\AuthController;

/** @var \App\Core\Router $router */

$router->post('/login', [AuthController::class, 'login']);
$router->post('/logout', [AuthController::class, 'logout'], [AuthMiddleware::class]);