<?php

use App\Modules\Icd10Diagnoses\Controllers\Icd10DiagnosisController;

/** @var \App\Core\Router $router */

$router->get('/icd10-diagnoses', [Icd10DiagnosisController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/icd10-diagnoses', [Icd10DiagnosisController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/icd10-diagnoses', [Icd10DiagnosisController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/icd10-diagnoses', [Icd10DiagnosisController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
