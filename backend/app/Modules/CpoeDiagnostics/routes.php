<?php

use App\Modules\CpoeDiagnostics\Controllers\CpoeDiagnosticController;
use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;

/** @var \App\Core\Router $router */

$cpoeRoles = ['admin', 'doctor', 'clinician', 'nurse'];

$router->get('/cpoe-diagnostics/catalog', [CpoeDiagnosticController::class, 'catalog'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $cpoeRoles]
]);

$router->post('/cpoe-diagnostics/order', [CpoeDiagnosticController::class, 'order'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician']]
]);

$router->get('/cpoe-diagnostics/encounter-orders', [CpoeDiagnosticController::class, 'encounterOrders'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $cpoeRoles]
]);
