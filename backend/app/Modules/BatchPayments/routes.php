<?php

use App\Modules\BatchPayments\Controllers\BatchPaymentController;

/** @var \App\Core\Router $router */

$router->get('/batch-payments', [BatchPaymentController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/batch-payments/show', [BatchPaymentController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/batch-payments', [BatchPaymentController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/batch-payments', [BatchPaymentController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/batch-payments', [BatchPaymentController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/batch-payments/global', [BatchPaymentController::class, 'setGlobal'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/batch-payments/allocate', [BatchPaymentController::class, 'allocate'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/batch-payments/allocations', [BatchPaymentController::class, 'removeAllocation'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
