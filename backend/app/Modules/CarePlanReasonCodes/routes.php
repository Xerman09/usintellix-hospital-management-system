<?php

use App\Modules\CarePlanReasonCodes\Controllers\CarePlanReasonCodeController;

/** @var \App\Core\Router $router */

$router->get('/care-plan-reason-codes', [CarePlanReasonCodeController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/care-plan-reason-codes', [CarePlanReasonCodeController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/care-plan-reason-codes', [CarePlanReasonCodeController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/care-plan-reason-codes', [CarePlanReasonCodeController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
