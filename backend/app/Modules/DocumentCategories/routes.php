<?php

use App\Modules\DocumentCategories\Controllers\DocumentCategoryController;

/** @var \App\Core\Router $router */

$router->get('/document-categories', [DocumentCategoryController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/document-categories', [DocumentCategoryController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/document-categories', [DocumentCategoryController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/document-categories', [DocumentCategoryController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
