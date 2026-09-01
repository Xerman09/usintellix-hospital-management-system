<?php

use App\Modules\FormDefinitions\Controllers\FormDefinitionController;

/** @var \App\Core\Router $router */

$router->get('/form-definitions', [FormDefinitionController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/form-definitions', [FormDefinitionController::class, 'bulkUpdate'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
