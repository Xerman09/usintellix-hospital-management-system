<?php

use App\Modules\SecurityIncidents\Controllers\SecurityIncidentController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

/** @var \App\Core\Router $router */

$router->get('/security-incidents/stats', [SecurityIncidentController::class, 'stats'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/security-incidents/export-csv', [SecurityIncidentController::class, 'exportCsv'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/security-incidents/letter', [SecurityIncidentController::class, 'letter'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/security-incidents/ocr-export', [SecurityIncidentController::class, 'ocrExport'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/security-incidents/show', [SecurityIncidentController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/security-incidents', [SecurityIncidentController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/security-incidents/assess', [SecurityIncidentController::class, 'assess'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/security-incidents/link-patient', [SecurityIncidentController::class, 'linkPatient'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/security-incidents/remove-patient', [SecurityIncidentController::class, 'removePatient'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/security-incidents/update-patient', [SecurityIncidentController::class, 'updatePatientNotification'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/security-incidents', [SecurityIncidentController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/security-incidents', [SecurityIncidentController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/security-incidents', [SecurityIncidentController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
