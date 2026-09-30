<?php

use App\Modules\Departments\Controllers\DepartmentController;

/** @var \App\Core\Router $router */

// 1. Department List & Details
$router->get('/departments', [DepartmentController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'patient']]
]);

$router->get('/departments/stats', [DepartmentController::class, 'stats'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/departments/options', [DepartmentController::class, 'options'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/departments/show', [DepartmentController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/departments/staff', [DepartmentController::class, 'staff'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

// 2. Department Management (Admin)
$router->post('/departments', [DepartmentController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/departments', [DepartmentController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/departments', [DepartmentController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
