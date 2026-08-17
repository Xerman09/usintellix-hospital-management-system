<?php

use App\Modules\SpecimenSites\Controllers\SpecimenSiteController;

/** @var \App\Core\Router $router */

$router->get('/specimen-sites', [SpecimenSiteController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/specimen-sites', [SpecimenSiteController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/specimen-sites', [SpecimenSiteController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/specimen-sites', [SpecimenSiteController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
