<?php

use App\Modules\CareCoordination\Controllers\CareCoordinationController;

/** @var \App\Core\Router $router */

$router->get('/care-coordination', [CareCoordinationController::class, 'index'], [
    AuthMiddleware::class
]);
