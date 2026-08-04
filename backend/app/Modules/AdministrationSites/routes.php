<?php

use App\Modules\AdministrationSites\Controllers\AdministrationSiteController;

/** @var \App\Core\Router $router */

$router->get('/administration-sites', [AdministrationSiteController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/administration-sites', [AdministrationSiteController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/administration-sites', [AdministrationSiteController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/administration-sites', [AdministrationSiteController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
