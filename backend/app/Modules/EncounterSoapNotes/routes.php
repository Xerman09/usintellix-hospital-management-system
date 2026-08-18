<?php

use App\Modules\EncounterSoapNotes\Controllers\EncounterSoapNoteController;

/** @var \App\Core\Router $router */

$router->get('/encounter-soap-notes', [EncounterSoapNoteController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/encounter-soap-notes', [EncounterSoapNoteController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/encounter-soap-notes', [EncounterSoapNoteController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/encounter-soap-notes', [EncounterSoapNoteController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/encounter-soap-notes/sign', [EncounterSoapNoteController::class, 'sign'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
