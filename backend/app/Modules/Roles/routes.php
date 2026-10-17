<?php

use App\Modules\Roles\Controllers\RoleController;

/** @var \App\Core\Router $router */

$router->get('/roles', [RoleController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/roles', [RoleController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/roles', [RoleController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/roles', [RoleController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

// Dynamic Role Permissions Capability Matrix
$router->get('/roles/permissions', [RoleController::class, 'permissionsMatrix'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/roles/role-permissions', [RoleController::class, 'getRolePermissions'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/roles/permissions', [RoleController::class, 'updatePermissions'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/user/permissions', [RoleController::class, 'userPermissions'], [
    AuthMiddleware::class
]);
