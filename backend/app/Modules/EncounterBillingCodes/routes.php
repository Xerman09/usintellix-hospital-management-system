<?php

use App\Modules\EncounterBillingCodes\Controllers\EncounterBillingCodeController;

/** @var \App\Core\Router $router */

$router->get('/encounter-billing-codes', [EncounterBillingCodeController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/encounter-billing-codes', [EncounterBillingCodeController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/encounter-billing-codes', [EncounterBillingCodeController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/encounter-billing-codes', [EncounterBillingCodeController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
