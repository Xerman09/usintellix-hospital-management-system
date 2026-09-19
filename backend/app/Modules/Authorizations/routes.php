<?php

use App\Modules\Authorizations\Controllers\AuthorizationController;
use App\Core\Middleware\AuthMiddleware;

/** @var \App\Core\Router $router */

$router->get('/authorizations', [
    AuthorizationController::class,
    'index'
], [
    AuthMiddleware::class
]);

$router->post('/authorizations/clinical/sign', [
    AuthorizationController::class,
    'signClinical'
], [
    AuthMiddleware::class
]);

$router->post('/authorizations/clinical/batch-sign', [
    AuthorizationController::class,
    'batchSignClinical'
], [
    AuthMiddleware::class
]);

$router->post('/authorizations/prior-auth/save', [
    AuthorizationController::class,
    'savePriorAuth'
], [
    AuthMiddleware::class
]);

$router->post('/authorizations/prior-auth/decrement', [
    AuthorizationController::class,
    'decrementPriorAuthUnit'
], [
    AuthMiddleware::class
]);

$router->post('/authorizations/prior-auth/delete', [
    AuthorizationController::class,
    'deletePriorAuth'
], [
    AuthMiddleware::class
]);
