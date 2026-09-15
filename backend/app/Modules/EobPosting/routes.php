<?php

use App\Modules\EobPosting\Controllers\EobPostingController;

/** @var \App\Core\Router $router */

$router->get('/eob-posting/search', [EobPostingController::class, 'search'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/eob-posting/post', [EobPostingController::class, 'post'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
