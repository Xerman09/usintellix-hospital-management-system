<?php

use App\Modules\InpatientAdmissions\Controllers\InpatientAdmissionsController;
use App\Modules\InpatientAdmissions\Controllers\DischargeSummaryController;
use App\Modules\InpatientAdmissions\Controllers\DailyRoundController;

/** @var \App\Core\Router $router */

$router->get('/inpatient-admissions/whiteboard', [InpatientAdmissionsController::class, 'whiteboard'], [
    AuthMiddleware::class
]);

$router->get('/inpatient-admissions/wards', [InpatientAdmissionsController::class, 'wards'], [
    AuthMiddleware::class
]);

$router->get('/inpatient-admissions/beds', [InpatientAdmissionsController::class, 'beds'], [
    AuthMiddleware::class
]);

$router->get('/inpatient-admissions/details', [InpatientAdmissionsController::class, 'details'], [
    AuthMiddleware::class
]);

$router->post('/inpatient-admissions/admit', [InpatientAdmissionsController::class, 'admit'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'nurse', 'clinician', 'staff']]
]);

$router->post('/inpatient-admissions/transfer', [InpatientAdmissionsController::class, 'transfer'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'nurse', 'clinician', 'staff']]
]);

$router->post('/inpatient-admissions/transfer/accept', [InpatientAdmissionsController::class, 'acceptTransfer'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'clinician']]
]);

$router->get('/inpatient-admissions/transfer/detail', [InpatientAdmissionsController::class, 'transferDetail'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'clinician', 'staff', 'receptionist']]
]);

$router->get('/inpatient-admissions/transfer/pending', [InpatientAdmissionsController::class, 'pendingHandovers'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'clinician', 'staff']]
]);


$router->post('/inpatient-admissions/pending-discharge', [InpatientAdmissionsController::class, 'pendingDischarge'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'nurse', 'clinician', 'staff']]
]);

$router->post('/inpatient-admissions/discharge', [InpatientAdmissionsController::class, 'discharge'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'nurse', 'clinician', 'staff']]
]);

$router->post('/inpatient-admissions/beds/status', [InpatientAdmissionsController::class, 'bedStatus'], [
    AuthMiddleware::class
]);

$router->post('/inpatient-admissions/wards', [InpatientAdmissionsController::class, 'createWard'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/inpatient-admissions/beds', [InpatientAdmissionsController::class, 'createBed'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/inpatient-admissions/discharge-summary', [DischargeSummaryController::class, 'getSummary'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'clinician', 'staff']]
]);

$router->post('/inpatient-admissions/discharge-summary/save-draft', [DischargeSummaryController::class, 'saveDraft'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'clinician']]
]);

$router->post('/inpatient-admissions/discharge-summary/finalize', [DischargeSummaryController::class, 'finalize'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician']]
]);

$router->get('/inpatient-admissions/discharge-summary/print', [DischargeSummaryController::class, 'printPdf'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'clinician', 'staff', 'receptionist']]
]);

$router->get('/inpatient-admissions/daily-rounds', [DailyRoundController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'clinician', 'staff', 'receptionist']]
]);

$router->get('/inpatient-admissions/daily-rounds/show', [DailyRoundController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'clinician', 'staff', 'receptionist']]
]);

$router->get('/inpatient-admissions/daily-rounds/options', [DailyRoundController::class, 'options'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'clinician', 'staff', 'receptionist']]
]);

$router->post('/inpatient-admissions/daily-rounds', [DailyRoundController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'clinician']]
]);

$router->post('/inpatient-admissions/daily-rounds/update', [DailyRoundController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'clinician']]
]);

$router->post('/inpatient-admissions/daily-rounds/delete', [DailyRoundController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician']]
]);


