<?php

use App\Modules\ProviderInsuranceNumbers\Controllers\ProviderInsuranceNumberController;

/** @var \App\Core\Router $router */

$router->get('/provider-insurance-numbers', [ProviderInsuranceNumberController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->put('/provider-insurance-numbers', [ProviderInsuranceNumberController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
