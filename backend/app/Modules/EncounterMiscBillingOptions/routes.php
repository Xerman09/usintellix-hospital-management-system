<?php

use App\Modules\EncounterMiscBillingOptions\Controllers\EncounterMiscBillingOptionController;

/** @var \App\Core\Router $router */

$router->get('/encounter-misc-billing-options', [EncounterMiscBillingOptionController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/encounter-misc-billing-options', [EncounterMiscBillingOptionController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
