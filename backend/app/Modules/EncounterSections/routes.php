<?php

use App\Modules\EncounterSections\Controllers\EncounterSectionController;

/** @var \App\Core\Router $router */

$router->get('/encounter-sections', [EncounterSectionController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->put('/encounter-sections', [EncounterSectionController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->post('/encounter-sections/sign', [EncounterSectionController::class, 'sign'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->delete('/encounter-sections', [EncounterSectionController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);
