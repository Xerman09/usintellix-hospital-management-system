<?php

use App\Modules\ProviderCategories\Controllers\ProviderCategoryController;

/** @var \App\Core\Router $router */

$router->get('/provider-categories', [ProviderCategoryController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/provider-categories', [ProviderCategoryController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/provider-categories', [ProviderCategoryController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/provider-categories', [ProviderCategoryController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
