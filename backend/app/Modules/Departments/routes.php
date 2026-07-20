<?php

use App\Modules\Departments\Controllers\DepartmentController;

/** @var \App\Core\Router $router */

$router->get('/departments', [DepartmentController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
