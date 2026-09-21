<?php

use App\Modules\EncounterClinicalNoteItems\Controllers\EncounterClinicalNoteItemController;

/** @var \App\Core\Router $router */

$router->get('/encounter-clinical-note-items', [EncounterClinicalNoteItemController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->post('/encounter-clinical-note-items', [EncounterClinicalNoteItemController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->put('/encounter-clinical-note-items', [EncounterClinicalNoteItemController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->delete('/encounter-clinical-note-items', [EncounterClinicalNoteItemController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);
