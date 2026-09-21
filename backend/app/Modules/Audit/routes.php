<?php

use App\Modules\Audit\Controllers\AuditController;
use App\Middlewares\AuthMiddleware;
use App\Middlewares\RoleMiddleware;

/** @var \App\Core\Router $router */

$router->get('/hipaa-audit-logs', [AuditController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/hipaa-audit-logs/verify', [AuditController::class, 'verify'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
