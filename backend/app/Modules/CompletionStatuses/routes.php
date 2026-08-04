<?php

use App\Modules\CompletionStatuses\Controllers\CompletionStatusController;

/** @var \App\Core\Router $router */

$router->get('/completion-statuses', [CompletionStatusController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/completion-statuses', [CompletionStatusController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/completion-statuses', [CompletionStatusController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/completion-statuses', [CompletionStatusController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
