<?php

use App\Modules\BusinessSettings\Controllers\BusinessSettingController;

/** @var \App\Core\Router $router */

$router->get('/business-settings', [BusinessSettingController::class, 'show']);

$router->put('/business-settings', [BusinessSettingController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/business-settings/logo', [BusinessSettingController::class, 'uploadLogo'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/business-settings/logo', [BusinessSettingController::class, 'removeLogo'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
