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

$router->get('/reports/amc-measures', [ReportController::class, 'amcMeasures'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/real-world-testing', [ReportController::class, 'realWorldTesting'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/alerts-log', [ReportController::class, 'alertsLog'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/visits/daily', [ReportController::class, 'dailySummary'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/visits/appointments', [ReportController::class, 'appointmentsReport'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/visits/patient-flow', [ReportController::class, 'patientFlowBoard'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/visits/encounters', [ReportController::class, 'encountersReport'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/visits/appointments-encounters', [ReportController::class, 'appointmentsEncountersReport'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/visits/superbill', [ReportController::class, 'superbillReport'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/visits/eligibility', [ReportController::class, 'eligibilityReport'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/reports/visits/chart-activity', [ReportController::class, 'chartActivityReport'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
