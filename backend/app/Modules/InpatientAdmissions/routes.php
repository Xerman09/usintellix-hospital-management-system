<?php

use App\Modules\InpatientAdmissions\Controllers\InpatientAdmissionsController;

/** @var \App\Core\Router $router */

$router->get('/inpatient-admissions/whiteboard', [InpatientAdmissionsController::class, 'whiteboard'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/inpatient-admissions/wards', [InpatientAdmissionsController::class, 'wards'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/inpatient-admissions/beds', [InpatientAdmissionsController::class, 'beds'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/inpatient-admissions/details', [InpatientAdmissionsController::class, 'details'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/inpatient-admissions/admit', [InpatientAdmissionsController::class, 'admit'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/inpatient-admissions/transfer', [InpatientAdmissionsController::class, 'transfer'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/inpatient-admissions/pending-discharge', [InpatientAdmissionsController::class, 'pendingDischarge'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/inpatient-admissions/discharge', [InpatientAdmissionsController::class, 'discharge'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/inpatient-admissions/beds/status', [InpatientAdmissionsController::class, 'bedStatus'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/inpatient-admissions/wards', [InpatientAdmissionsController::class, 'createWard'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/inpatient-admissions/beds', [InpatientAdmissionsController::class, 'createBed'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
