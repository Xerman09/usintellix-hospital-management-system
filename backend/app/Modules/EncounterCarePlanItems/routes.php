<?php

use App\Modules\EncounterCarePlanItems\Controllers\EncounterCarePlanItemController;

/** @var \App\Core\Router $router */

$router->get('/encounter-care-plan-items', [EncounterCarePlanItemController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/encounter-care-plan-items', [EncounterCarePlanItemController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/encounter-care-plan-items', [EncounterCarePlanItemController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/encounter-care-plan-items', [EncounterCarePlanItemController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
