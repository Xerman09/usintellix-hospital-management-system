<?php

use App\Modules\DocumentTemplates\Controllers\DocumentTemplateController;

/** @var \App\Core\Router $router */

// Read-only listing (filenames only) is opened up beyond admin so the
// Popups > Letter screen can offer a Template picker to receptionist/
// doctor too -- upload/delete stay admin-only, unchanged below.
$router->get('/document-templates', [DocumentTemplateController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/document-templates', [DocumentTemplateController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/document-templates/category', [DocumentTemplateController::class, 'updateCategory'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/document-templates', [DocumentTemplateController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
