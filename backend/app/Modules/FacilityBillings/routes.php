<?php

use App\Modules\FacilityBillings\Controllers\FacilityBillingController;

/** @var \App\Core\Router $router */

$router->get('/facility-billings', [FacilityBillingController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/facility-billings', [FacilityBillingController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/facility-billings', [FacilityBillingController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/facility-billings', [FacilityBillingController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
