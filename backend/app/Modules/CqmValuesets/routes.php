<?php

use App\Modules\CqmValuesets\Controllers\CqmValuesetController;
use App\Modules\CqmValuesets\Controllers\CqmValuesetCodeController;

/** @var \App\Core\Router $router */

$router->get('/cqm-valuesets', [CqmValuesetController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/cqm-valuesets', [CqmValuesetController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/cqm-valuesets', [CqmValuesetController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/cqm-valuesets', [CqmValuesetController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/cqm-valuesets/codes', [CqmValuesetCodeController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/cqm-valuesets/codes/search', [CqmValuesetCodeController::class, 'search'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/cqm-valuesets/codes', [CqmValuesetCodeController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/cqm-valuesets/codes', [CqmValuesetCodeController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/cqm-valuesets/codes', [CqmValuesetCodeController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
