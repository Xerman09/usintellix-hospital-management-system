<?php

use App\Modules\PatientMedicalDevices\Controllers\PatientMedicalDeviceController;

/** @var \App\Core\Router $router */

$router->get('/patient-medical-devices', [PatientMedicalDeviceController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-medical-devices', [PatientMedicalDeviceController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-medical-devices', [PatientMedicalDeviceController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/patient-medical-devices', [PatientMedicalDeviceController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
