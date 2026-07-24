<?php

use App\Modules\OrganizationTypes\Controllers\OrganizationTypeController;

/** @var \App\Core\Router $router */

$router->get('/organization-types', [OrganizationTypeController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/organization-types', [OrganizationTypeController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/organization-types', [OrganizationTypeController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/organization-types', [OrganizationTypeController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
