<?php

use App\Modules\Reports\Controllers\ReportController;

/** @var \App\Core\Router $router */

$router->get('/reports/patient-list', [ReportController::class, 'patientList'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/rx', [ReportController::class, 'rxReport'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/patient-list-creation', [ReportController::class, 'patientListCreation'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/message-list', [ReportController::class, 'messageList'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/clinical', [ReportController::class, 'clinical'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/referrals', [ReportController::class, 'referrals'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/immunization-registry', [ReportController::class, 'immunizationRegistry'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/immunization-registry/cvx-codes', [ReportController::class, 'immunizationRegistryCvxCodes'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/history', [ReportController::class, 'reportHistory'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/reports/history', [ReportController::class, 'logReport'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/standard-measures', [ReportController::class, 'standardMeasures'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
