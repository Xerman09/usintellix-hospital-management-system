<?php

use App\Modules\Recalls\Controllers\RecallController;

/** @var \App\Core\Router $router */

// List the recalls the logged-in user is allowed to see.
$router->get('/recalls/mine', [RecallController::class, 'mine'], [
    AuthMiddleware::class
]);

$router->post('/recalls', [RecallController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/recalls', [RecallController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/recalls', [RecallController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
