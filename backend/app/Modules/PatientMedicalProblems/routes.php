<?php

use App\Modules\PatientMedicalProblems\Controllers\PatientMedicalProblemController;

/** @var \App\Core\Router $router */

$router->get('/patient-medical-problems', [PatientMedicalProblemController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-medical-problems', [PatientMedicalProblemController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-medical-problems', [PatientMedicalProblemController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/patient-medical-problems', [PatientMedicalProblemController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
