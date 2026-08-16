<?php

use App\Modules\EncounterClinicalInstructionItems\Controllers\EncounterClinicalInstructionItemController;

/** @var \App\Core\Router $router */

$router->get('/encounter-clinical-instruction-items', [EncounterClinicalInstructionItemController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/encounter-clinical-instruction-items', [EncounterClinicalInstructionItemController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/encounter-clinical-instruction-items', [EncounterClinicalInstructionItemController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/encounter-clinical-instruction-items', [EncounterClinicalInstructionItemController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
