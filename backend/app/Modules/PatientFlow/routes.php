<?php

use App\Modules\PatientFlow\Controllers\PatientFlowController;
use App\Modules\PatientFlow\Controllers\QueueTokenController;

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

// Sequential Queue Token Management Routes
$router->get('/queue-tokens', [QueueTokenController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'nurse']]
]);

$router->post('/queue-tokens/generate', [QueueTokenController::class, 'generate'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'nurse']]
]);

$router->post('/queue-tokens/call', [QueueTokenController::class, 'call'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'nurse']]
]);

$router->post('/queue-tokens/serve', [QueueTokenController::class, 'serve'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'nurse']]
]);

$router->post('/queue-tokens/complete', [QueueTokenController::class, 'complete'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'nurse']]
]);

// Real-time Queue Display Board (Public Waiting Room TV Monitors & Dashboards)
$router->get('/queue-tokens/display-board', [QueueTokenController::class, 'displayBoard']);
$router->get('/patient-flow/queue-tokens/display-board', [QueueTokenController::class, 'displayBoard']);



// Printable Thermal Token Slip
$router->get('/queue-tokens/slip', [QueueTokenController::class, 'slip'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'nurse', 'patient']]
]);

