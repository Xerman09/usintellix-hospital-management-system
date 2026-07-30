<?php

use App\Modules\DischargeDispositions\Controllers\DischargeDispositionController;

/** @var \App\Core\Router $router */

$router->get('/discharge-dispositions', [DischargeDispositionController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
