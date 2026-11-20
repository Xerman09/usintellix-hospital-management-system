<?php

use App\Modules\BusinessModules\Controllers\BusinessModuleController;

/** @var \App\Core\Router $router */

$router->get('/business-modules', [BusinessModuleController::class, 'index']);

$router->put('/business-modules', [BusinessModuleController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/business-modules/preset', [BusinessModuleController::class, 'applyPreset'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
