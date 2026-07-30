<?php

use App\Modules\CareTeams\Controllers\CareTeamController;

/** @var \App\Core\Router $router */

$allowedRoles = ['admin', 'receptionist', 'doctor'];

$router->get('/care-team', [CareTeamController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);

$router->get('/care-team/options', [CareTeamController::class, 'optionsIndex'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);

$router->post('/care-team', [CareTeamController::class, 'save'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);
