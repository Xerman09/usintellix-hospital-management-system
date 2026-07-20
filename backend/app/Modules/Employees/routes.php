<?php

use App\Modules\Employees\Controllers\EmployeeController;

/** @var \App\Core\Router $router */

$router->post('/employees', [EmployeeController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
