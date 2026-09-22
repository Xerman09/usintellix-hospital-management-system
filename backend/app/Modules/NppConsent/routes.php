<?php

use App\Modules\NppConsent\Controllers\NppConsentController;

/** @var \App\Core\Router $router */

$router->get('/npp-consent/status', [NppConsentController::class, 'status'], [AuthMiddleware::class]);
$router->post('/npp-consent/capture', [NppConsentController::class, 'capture'], [AuthMiddleware::class]);