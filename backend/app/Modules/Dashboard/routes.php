<?php

use App\Modules\Dashboard\Controllers\DashboardController;

$router->get('/dashboard', [DashboardController::class, 'index'], [AuthMiddleware::class]);