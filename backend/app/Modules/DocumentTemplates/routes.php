<?php

use App\Modules\DocumentTemplates\Controllers\DocumentTemplateController;

/** @var \App\Core\Router $router */

$router->get('/document-templates', [DocumentTemplateController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/document-templates', [DocumentTemplateController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/document-templates', [DocumentTemplateController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
