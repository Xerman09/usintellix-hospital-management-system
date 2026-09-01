<?php

use App\Modules\Codes\Controllers\CodeController;

/** @var \App\Core\Router $router */

$router->get('/codes', [CodeController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/codes', [CodeController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/codes', [CodeController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/codes', [CodeController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/codes/import', [CodeController::class, 'import'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/codes/install-code-set', [CodeController::class, 'installCodeSet'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
