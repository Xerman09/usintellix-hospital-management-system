<?php

use App\Modules\PriceLevels\Controllers\PriceLevelController;

/** @var \App\Core\Router $router */

$router->get('/price-levels', [PriceLevelController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/price-levels', [PriceLevelController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/price-levels', [PriceLevelController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/price-levels', [PriceLevelController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
