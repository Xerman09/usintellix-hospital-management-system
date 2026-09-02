<?php

use App\Modules\ChartTracker\Controllers\ChartTrackerController;

/** @var \App\Core\Router $router */

$router->get('/chart-tracker/lookup', [ChartTrackerController::class, 'lookup'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/chart-tracker/check-in', [ChartTrackerController::class, 'checkIn'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
