<?php

use App\Modules\Dashboard\Controllers\DashboardController;

$router->get('/dashboard', [DashboardController::class, 'index'], [AuthMiddleware::class]);
$router->get('/dashboard/stats', [DashboardController::class, 'stats'], [AuthMiddleware::class]);