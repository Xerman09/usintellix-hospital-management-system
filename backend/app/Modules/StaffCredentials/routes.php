<?php

use App\Modules\StaffCredentials\Controllers\StaffCredentialController;

/** @var \App\Core\Router $router */

$hrView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'accountant']]];
$hrAction = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'charge_nurse']]];

// Hospital Clinical Privileges & Credentials Registry
$router->get('/staff-credentials/metrics', [StaffCredentialController::class, 'metrics'], $hrView);
$router->get('/staff-credentials', [StaffCredentialController::class, 'credentialsIndex'], $hrView);
$router->post('/staff-credentials', [StaffCredentialController::class, 'credentialSave'], $hrAction);
$router->delete('/staff-credentials', [StaffCredentialController::class, 'credentialDelete'], $hrAction);

$router->get('/clinical-privileges', [StaffCredentialController::class, 'privilegesIndex'], $hrView);
$router->get('/clinical-privileges/detail', [StaffCredentialController::class, 'privilegeDetail'], $hrView);
$router->post('/clinical-privileges', [StaffCredentialController::class, 'privilegeSave'], $hrAction);
$router->post('/clinical-privileges/check-procedure', [StaffCredentialController::class, 'checkProcedure'], $hrView);

$router->post('/staff-credentials/seed-demo', [StaffCredentialController::class, 'seedDemo'], $hrAction);

// Automated License Expiration Scanner & Prescribing Holds
$router->get('/staff-credentials/expiration-scanner', [StaffCredentialController::class, 'expirationScanner'], $hrView);
$router->post('/staff-credentials/prescribing-holds/override', [StaffCredentialController::class, 'holdOverride'], $hrAction);
$router->post('/staff-credentials/prescribing-holds/lift', [StaffCredentialController::class, 'holdLift'], $hrAction);
