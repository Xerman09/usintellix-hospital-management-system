<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\Workforce\Controllers\WorkforceController;

/** @var \App\Core\Router $router */

$router->get('/workforce/stats', [WorkforceController::class, 'stats'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);

$router->get('/workforce/staff', [WorkforceController::class, 'listStaff'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);

$router->post('/workforce/trainings', [WorkforceController::class, 'recordTraining'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/workforce/trainings/{id}', [WorkforceController::class, 'getTraining'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);

$router->get('/workforce/staff/{employeeId}/trainings', [WorkforceController::class, 'staffTrainingHistory'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);

$router->get('/workforce/sanctions', [WorkforceController::class, 'listSanctions'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);

$router->post('/workforce/sanctions', [WorkforceController::class, 'recordSanction'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/workforce/sanctions/{id}', [WorkforceController::class, 'updateSanction'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/workforce/sanctions/{id}/dossier', [WorkforceController::class, 'sanctionDossier'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);

$router->get('/workforce/export/trainings-csv', [WorkforceController::class, 'exportTrainingsCsv'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);

$router->get('/workforce/export/sanctions-csv', [WorkforceController::class, 'exportSanctionsCsv'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);
