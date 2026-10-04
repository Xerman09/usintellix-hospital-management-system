<?php

use App\Modules\PatientPrescriptions\Controllers\PatientPrescriptionController;
use App\Modules\PatientPrescriptions\Controllers\PrescriptionController;
use App\Modules\PatientPrescriptions\Services\PrescriptionService;

/** @var \App\Core\Router $router */

$router->get('/patient-prescriptions', [PatientPrescriptionController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'patient']]
]);

// A patient requesting a refill on one of their own active prescriptions —
// sends a message to their assigned provider. Not a staff action, so it
// doesn't belong alongside store/update/destroy above.
$router->post('/patient-prescriptions/refill-request', [PatientPrescriptionController::class, 'requestRefill'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

// Drug Catalog items to prescribe from, with usable stock.
$router->get('/patient-prescriptions/drug-options', [PatientPrescriptionController::class, 'drugOptions'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-prescriptions/refill-request/cancel', [PatientPrescriptionController::class, 'cancelRefillRequest'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/patient-prescriptions', [PatientPrescriptionController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-prescriptions', [PatientPrescriptionController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/patient-prescriptions', [PatientPrescriptionController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

// Prescription slips: one prescription, many medicines.
$router->get('/prescriptions', [PrescriptionController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'patient']]
]);

$router->get('/prescriptions/form-options', [PrescriptionController::class, 'formOptions'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PrescriptionService::WRITER_ROLES]
]);

$router->get('/prescriptions/print', [PrescriptionController::class, 'printData'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PrescriptionService::WRITER_ROLES]
]);

$router->post('/prescriptions', [PrescriptionController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PrescriptionService::WRITER_ROLES]
]);

$router->put('/prescriptions', [PrescriptionController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PrescriptionService::WRITER_ROLES]
]);

$router->post('/prescriptions/cancel', [PrescriptionController::class, 'cancel'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PrescriptionService::WRITER_ROLES]
]);
