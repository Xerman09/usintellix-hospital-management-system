<?php

use App\Modules\GeneralSettings\Controllers\GeneralSettingController;

/** @var \App\Core\Router $router */

$router->get('/general-settings', [GeneralSettingController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/general-settings', [GeneralSettingController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
