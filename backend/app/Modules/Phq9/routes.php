<?php

use App\Modules\Phq9\Controllers\Phq9Controller;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

/** @var \App\Core\Router $router */

$router->get('/encounter-phq9', [Phq9Controller::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'receptionist', 'accountant', 'billing', 'staff']]
]);

$router->post('/encounter-phq9', [Phq9Controller::class, 'save'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);
