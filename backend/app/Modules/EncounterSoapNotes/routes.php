<?php

use App\Modules\EncounterSoapNotes\Controllers\EncounterSoapNoteController;

/** @var \App\Core\Router $router */

$router->get('/encounter-soap-notes', [EncounterSoapNoteController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->post('/encounter-soap-notes', [EncounterSoapNoteController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->put('/encounter-soap-notes', [EncounterSoapNoteController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->delete('/encounter-soap-notes', [EncounterSoapNoteController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->post('/encounter-soap-notes/sign', [EncounterSoapNoteController::class, 'sign'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);
