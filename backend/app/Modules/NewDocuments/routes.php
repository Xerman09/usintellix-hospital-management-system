<?php

use App\Modules\NewDocuments\Controllers\NewDocumentsController;
use App\Core\Middlewares\AuthMiddleware;
use App\Core\Middlewares\RoleMiddleware;

/** @var \App\Core\Router $router */

$router->get('/new-documents/documents', [NewDocumentsController::class, 'documents'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'accountant']]
]);

$router->get('/new-documents/categories', [NewDocumentsController::class, 'categories'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'accountant']]
]);

$router->get('/new-documents/stats', [NewDocumentsController::class, 'stats'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'accountant']]
]);

$router->get('/new-documents/templates', [NewDocumentsController::class, 'templates'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'accountant']]
]);

$router->post('/new-documents/upload', [NewDocumentsController::class, 'upload'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'accountant']]
]);

$router->put('/new-documents/update', [NewDocumentsController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'accountant']]
]);

$router->delete('/new-documents/delete', [NewDocumentsController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'accountant']]
]);
