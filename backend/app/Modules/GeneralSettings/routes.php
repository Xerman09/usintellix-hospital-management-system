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

$router->get('/system-timezone', [GeneralSettingController::class, 'systemTimezone']);

$router->get('/general-settings/timezones', [GeneralSettingController::class, 'timezones'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/general-settings/timezone', [GeneralSettingController::class, 'updateTimezone'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
