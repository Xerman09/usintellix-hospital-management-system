<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\Amendments\Controllers\AmendmentController;

/** @var \App\Core\Router $router */

// Administrative statutory pipeline routes
$router->get('/amendments/pipeline', [AmendmentController::class, 'pipeline'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

$router->get('/amendments/stats', [AmendmentController::class, 'stats'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

$router->get('/amendments/show', [AmendmentController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

$router->post('/amendments/statutory', [AmendmentController::class, 'storeStatutory'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

$router->post('/amendments/extension', [AmendmentController::class, 'grantExtension'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

$router->get('/amendments/extension-notice', [AmendmentController::class, 'extensionNotice'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

$router->post('/amendments/accept', [AmendmentController::class, 'accept'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

$router->post('/amendments/deny', [AmendmentController::class, 'deny'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

$router->get('/amendments/denial-notice', [AmendmentController::class, 'denialNotice'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

$router->post('/amendments/disagreement', [AmendmentController::class, 'fileDisagreement'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

$router->post('/amendments/rebuttal', [AmendmentController::class, 'fileRebuttal'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

$router->get('/amendments/registry/export', [AmendmentController::class, 'exportCsv'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

// Patient chart routes (backwards-compatible)
$router->get('/amendments', [AmendmentController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

$router->post('/amendments', [AmendmentController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

$router->put('/amendments', [AmendmentController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);

$router->delete('/amendments', [AmendmentController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician']]
]);
