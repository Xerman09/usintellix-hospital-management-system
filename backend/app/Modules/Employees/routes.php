<?php

use App\Modules\Employees\Controllers\EmployeeController;

/** @var \App\Core\Router $router */

// Read-only listing is opened up beyond admin so any staff member can
// populate a coworker picker (e.g. Popups > Letter's From/To dropdowns)
// -- register/update/etc below stay admin-only, unchanged.
$router->get('/employees', [EmployeeController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/employees', [EmployeeController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/employees', [EmployeeController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/employees/unlock', [EmployeeController::class, 'unlock'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/employees/status', [EmployeeController::class, 'status'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/employees/sessions', [EmployeeController::class, 'sessions'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/employees/sessions/revoke', [EmployeeController::class, 'revokeSession'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/employees/sessions/revoke-all', [EmployeeController::class, 'revokeAllSessions'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

