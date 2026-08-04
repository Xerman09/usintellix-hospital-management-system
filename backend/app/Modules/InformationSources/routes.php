<?php

use App\Modules\InformationSources\Controllers\InformationSourceController;

/** @var \App\Core\Router $router */

$router->get('/information-sources', [InformationSourceController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/information-sources', [InformationSourceController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/information-sources', [InformationSourceController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/information-sources', [InformationSourceController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
