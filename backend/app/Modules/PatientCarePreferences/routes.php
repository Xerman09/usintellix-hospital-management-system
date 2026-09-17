<?php

use App\Modules\PatientCarePreferences\Controllers\PatientCarePreferenceController;

/** @var \App\Core\Router $router */

$router->get('/patient-care-preferences', [PatientCarePreferenceController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-care-preferences', [PatientCarePreferenceController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-care-preferences', [PatientCarePreferenceController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/patient-care-preferences', [PatientCarePreferenceController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
