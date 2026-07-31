<?php

use App\Modules\PreferenceTypes\Controllers\PreferenceTypeController;

/** @var \App\Core\Router $router */

$router->get('/preference-types', [PreferenceTypeController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/preference-types', [PreferenceTypeController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/preference-types', [PreferenceTypeController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/preference-types', [PreferenceTypeController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
