<?php

use App\Modules\Employees\Controllers\EmployeeController;

/** @var \App\Core\Router $router */

$router->get('/employees', [EmployeeController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/employees', [EmployeeController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
