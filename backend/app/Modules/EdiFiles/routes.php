<?php

use App\Modules\EdiFiles\Controllers\EdiFileController;

/** @var \App\Core\Router $router */

$router->get('/edi-files', [EdiFileController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/edi-files', [EdiFileController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/edi-files/csv-table', [EdiFileController::class, 'csvTable'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/edi-files/preview', [EdiFileController::class, 'preview'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/edi-files/notes', [EdiFileController::class, 'notesIndex'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/edi-files/notes', [EdiFileController::class, 'notesStore'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/edi-files/archive', [EdiFileController::class, 'setArchived'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
