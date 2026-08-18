<?php

use App\Modules\EncounterSpeechDictationItems\Controllers\EncounterSpeechDictationItemController;

/** @var \App\Core\Router $router */

$router->get('/encounter-speech-dictation-items', [EncounterSpeechDictationItemController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/encounter-speech-dictation-items', [EncounterSpeechDictationItemController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/encounter-speech-dictation-items', [EncounterSpeechDictationItemController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/encounter-speech-dictation-items', [EncounterSpeechDictationItemController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
