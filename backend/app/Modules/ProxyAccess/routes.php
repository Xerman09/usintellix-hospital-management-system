<?php

use App\Modules\ProxyAccess\Controllers\ProxyAccessController;

/** @var \App\Core\Router $router */

$router->get('/proxy-access/mine', [ProxyAccessController::class, 'mine'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/proxy-access/switch', [ProxyAccessController::class, 'switchPatient'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);
