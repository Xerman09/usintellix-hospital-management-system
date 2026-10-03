<?php

use App\Modules\PharmacyDashboard\Controllers\PharmacyDashboardController;
use App\Modules\PharmacyDashboard\Services\PharmacyDashboardService;

/** @var \App\Core\Router $router */

$router->get('/pharmacy-dashboard', [PharmacyDashboardController::class, 'overview'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PharmacyDashboardService::ROLES]
]);
