<?php

use App\Modules\PatientFlow\Controllers\PatientFlowController;

/** @var \App\Core\Router $router */

// The flow board, filterable by date range, visit category, facility,
// provider, stage, and patient search. Defaults to today only.
$router->get('/patient-flow', [PatientFlowController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-flow', [PatientFlowController::class, 'checkIn'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-flow', [PatientFlowController::class, 'updateStatusRoom'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-flow/drug-screen', [PatientFlowController::class, 'updateDrugScreen'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/patient-flow', [PatientFlowController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
