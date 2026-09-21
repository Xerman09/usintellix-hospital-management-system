<?php

use App\Modules\EncounterObservationItems\Controllers\EncounterObservationItemController;

/** @var \App\Core\Router $router */

$router->get('/encounter-observation-items', [EncounterObservationItemController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->post('/encounter-observation-items', [EncounterObservationItemController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->put('/encounter-observation-items', [EncounterObservationItemController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->delete('/encounter-observation-items', [EncounterObservationItemController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);
