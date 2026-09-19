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