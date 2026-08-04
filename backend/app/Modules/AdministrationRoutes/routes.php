<?php

use App\Modules\AdministrationRoutes\Controllers\AdministrationRouteController;

/** @var \App\Core\Router $router */

$router->get('/administration-routes', [AdministrationRouteController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/administration-routes', [AdministrationRouteController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/administration-routes', [AdministrationRouteController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/administration-routes', [AdministrationRouteController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
