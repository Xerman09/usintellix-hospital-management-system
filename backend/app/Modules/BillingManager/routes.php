<?php

use App\Modules\BillingManager\Controllers\BillingManagerController;

/** @var \App\Core\Router $router */

$router->post('/billing-manager/search', [BillingManagerController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/billing-manager/criteria-options', [BillingManagerController::class, 'criteriaOptions'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/billing-manager/mark-cleared', [BillingManagerController::class, 'markCleared'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/billing-manager/reopen', [BillingManagerController::class, 'reopen'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/billing-manager/x12-status', [BillingManagerController::class, 'updateX12Status'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
