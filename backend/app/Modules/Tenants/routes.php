<?php

use App\Modules\Tenants\Controllers\TenantController;

/** @var \App\Core\Router $router */

$router->post('/tenants/register', [TenantController::class, 'register']);
