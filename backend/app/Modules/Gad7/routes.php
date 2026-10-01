<?php

use App\Modules\Gad7\Controllers\Gad7Controller;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

/** @var \App\Core\Router $router */

$router->get('/encounter-gad7', [Gad7Controller::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'receptionist', 'accountant', 'billing', 'staff']]
]);

$router->post('/encounter-gad7', [Gad7Controller::class, 'save'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);
