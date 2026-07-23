<?php

use App\Modules\VisitCategories\Controllers\VisitCategoryController;

/** @var \App\Core\Router $router */

$router->get('/visit-categories', [VisitCategoryController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/visit-categories', [VisitCategoryController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/visit-categories', [VisitCategoryController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/visit-categories', [VisitCategoryController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
