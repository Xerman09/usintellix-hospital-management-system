<?php

use App\Modules\PatientPrescriptions\Controllers\PatientPrescriptionController;

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
