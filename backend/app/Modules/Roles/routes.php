<?php

use App\Modules\Roles\Controllers\RoleController;

/** @var \App\Core\Router $router */

$router->get('/roles', [RoleController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
