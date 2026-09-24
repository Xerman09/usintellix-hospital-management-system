<?php

use App\Modules\BusinessAssociates\Controllers\BusinessAssociateController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

/** @var \App\Core\Router $router */

$router->get('/business-associates/stats', [BusinessAssociateController::class, 'stats'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'compliance_officer', 'doctor', 'clinician']]
]);

$router->get('/business-associates/export-csv', [BusinessAssociateController::class, 'exportCsv'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'compliance_officer']]
]);

$router->get('/business-associates/dossier', [BusinessAssociateController::class, 'dossier'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'compliance_officer']]
]);

$router->get('/business-associates/show', [BusinessAssociateController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'compliance_officer', 'doctor', 'clinician']]
]);

$router->get('/business-associates', [BusinessAssociateController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'compliance_officer', 'doctor', 'clinician']]
]);

$router->post('/business-associates', [BusinessAssociateController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'compliance_officer']]
]);

$router->put('/business-associates', [BusinessAssociateController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'compliance_officer']]
]);

$router->delete('/business-associates', [BusinessAssociateController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'compliance_officer']]
]);
