<?php

use App\Modules\Portal\Controllers\PortalController;

/** @var \App\Core\Router $router */

$router->get('/portal/audits', [
    PortalController::class,
    'audits'
], [
    AuthMiddleware::class
]);

$router->get('/portal/signatures', [
    PortalController::class,
    'signatures'
], [
    AuthMiddleware::class
]);

$router->get('/portal/mail', [
    PortalController::class,
    'mail'
], [
    AuthMiddleware::class
]);

$router->post('/portal/mail', [
    PortalController::class,
    'sendMail'
], [
    AuthMiddleware::class
]);

// Mobile App version check (public for app pre-login/post-login auto-updater)
$router->get('/portal/app-version', [
    PortalController::class,
    'appVersion'
]);
