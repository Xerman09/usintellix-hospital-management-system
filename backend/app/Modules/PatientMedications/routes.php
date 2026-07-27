<?php

use App\Modules\PatientMedications\Controllers\PatientMedicationController;

/** @var \App\Core\Router $router */

$router->get('/patient-medications', [PatientMedicationController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-medications', [PatientMedicationController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-medications', [PatientMedicationController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/patient-medications', [PatientMedicationController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
