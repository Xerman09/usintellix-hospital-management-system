<?php

use App\Modules\EncounterDiagnoses\Controllers\EncounterDiagnosisController;

/** @var \App\Core\Router $router */

$router->get('/encounter-diagnoses', [EncounterDiagnosisController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->post('/encounter-diagnoses', [EncounterDiagnosisController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->delete('/encounter-diagnoses', [EncounterDiagnosisController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);
