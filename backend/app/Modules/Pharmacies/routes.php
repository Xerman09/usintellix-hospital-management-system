<?php

use App\Modules\Pharmacies\Controllers\PharmacyController;

/** @var \App\Core\Router $router */

$router->get('/pharmacies', [PharmacyController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/pharmacies', [PharmacyController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/pharmacies', [PharmacyController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/pharmacies', [PharmacyController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
