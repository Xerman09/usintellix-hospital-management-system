<?php

use App\Modules\VisitTypes\Controllers\VisitTypeController;

/** @var \App\Core\Router $router */

$router->get('/visit-types', [VisitTypeController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/visit-types', [VisitTypeController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/visit-types', [VisitTypeController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/visit-types', [VisitTypeController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
