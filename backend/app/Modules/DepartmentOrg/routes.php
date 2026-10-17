<?php

use App\Modules\DepartmentOrg\Controllers\DepartmentOrgController;

/** @var \App\Core\Router $router */

$router->get('/department-org/tree', [DepartmentOrgController::class, 'tree'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'receptionist', 'clinician', 'charge_nurse']]
]);

$router->post('/department-org/assign-head', [DepartmentOrgController::class, 'assignHead'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/department-org/assign-ward', [DepartmentOrgController::class, 'assignWard'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
