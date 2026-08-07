<?php

use App\Modules\PatientSdohAssessment\Controllers\PatientSdohAssessmentController;

/** @var \App\Core\Router $router */

$router->get('/patient-sdoh-assessment', [PatientSdohAssessmentController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-sdoh-assessment', [PatientSdohAssessmentController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
