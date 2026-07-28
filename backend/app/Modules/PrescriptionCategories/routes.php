<?php

use App\Modules\PrescriptionCategories\Controllers\PrescriptionCategoryController;

/** @var \App\Core\Router $router */

$router->get('/prescription-categories', [PrescriptionCategoryController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/prescription-categories', [PrescriptionCategoryController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/prescription-categories', [PrescriptionCategoryController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/prescription-categories', [PrescriptionCategoryController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
