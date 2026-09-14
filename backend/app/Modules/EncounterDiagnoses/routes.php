<?php

use App\Modules\EncounterDiagnoses\Controllers\EncounterDiagnosisController;

/** @var \App\Core\Router $router */

$router->get('/encounter-diagnoses', [EncounterDiagnosisController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/encounter-diagnoses', [EncounterDiagnosisController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/encounter-diagnoses', [EncounterDiagnosisController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
