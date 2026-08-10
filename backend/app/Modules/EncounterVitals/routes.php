<?php

use App\Modules\EncounterVitals\Controllers\EncounterVitalController;

/** @var \App\Core\Router $router */

$router->get('/encounter-vitals', [EncounterVitalController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/encounter-vitals', [EncounterVitalController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
