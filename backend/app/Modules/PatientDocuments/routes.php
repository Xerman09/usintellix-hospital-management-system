<?php

use App\Modules\PatientDocuments\Controllers\PatientDocumentController;

/** @var \App\Core\Router $router */

$router->get('/patient-documents', [PatientDocumentController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'patient']]
]);

$router->post('/patient-documents', [PatientDocumentController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'patient']]
]);

$router->delete('/patient-documents', [PatientDocumentController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/patient-documents/lab-documents', [PatientDocumentController::class, 'labDocuments'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
