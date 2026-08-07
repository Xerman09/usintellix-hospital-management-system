<?php

use App\Modules\PatientSdohAssessment\Controllers\PatientSdohAssessmentController;

/** @var \App\Core\Router $router */

$router->get('/patient-sdoh-assessments', [PatientSdohAssessmentController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-sdoh-assessments', [PatientSdohAssessmentController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-sdoh-assessments', [PatientSdohAssessmentController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/patient-sdoh-assessments', [PatientSdohAssessmentController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
