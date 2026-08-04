<?php

use App\Modules\AmountUnits\Controllers\AmountUnitController;

/** @var \App\Core\Router $router */

$router->get('/amount-units', [AmountUnitController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/amount-units', [AmountUnitController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/amount-units', [AmountUnitController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/amount-units', [AmountUnitController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
