<?php

use App\Modules\EncounterFunctionalCognitiveStatusItems\Controllers\EncounterFunctionalCognitiveStatusItemController;

/** @var \App\Core\Router $router */

$router->get('/encounter-functional-cognitive-status-items', [EncounterFunctionalCognitiveStatusItemController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/encounter-functional-cognitive-status-items', [EncounterFunctionalCognitiveStatusItemController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/encounter-functional-cognitive-status-items', [EncounterFunctionalCognitiveStatusItemController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/encounter-functional-cognitive-status-items', [EncounterFunctionalCognitiveStatusItemController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
