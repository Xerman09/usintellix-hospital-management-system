<?php

use App\Modules\PatientPrescriptions\Controllers\PatientPrescriptionController;

/** @var \App\Core\Router $router */

$router->get('/patient-prescriptions', [PatientPrescriptionController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
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
