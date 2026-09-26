<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\Deidentification\Controllers\DeidentificationController;

/** @var \App\Core\Router $router */

$router->get('/deidentification/stats', [DeidentificationController::class, 'stats'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);

$router->get('/deidentification/exports', [DeidentificationController::class, 'list'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);

$router->post('/deidentification/generate', [DeidentificationController::class, 'generate'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician']]
]);

$router->get('/deidentification/exports/{id}', [DeidentificationController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);

$router->get('/deidentification/exports/{id}/csv', [DeidentificationController::class, 'exportCsv'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);

$router->get('/deidentification/exports/{id}/json', [DeidentificationController::class, 'exportJson'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);

$router->get('/deidentification/exports/{id}/attestation', [DeidentificationController::class, 'attestation'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);

$router->post('/deidentification/exports/{id}/lookup', [DeidentificationController::class, 'lookup'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/deidentification/registry/csv', [DeidentificationController::class, 'exportRegistryCsv'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);

$router->get('/deidentification/checklist', [DeidentificationController::class, 'statutoryChecklist'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'receptionist', 'biller', 'accountant']]
]);
