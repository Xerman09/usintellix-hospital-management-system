<?php

use App\Modules\Er\Controllers\ErController;
use App\Modules\Er\Services\ErService;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// ER: quick registration (unknown patients allowed, identified /
// merged later) and triage (acuity 1-5, chief complaint, vital signs).
// ---------------------------------------------------------------

$erView = [AuthMiddleware::class, [RoleMiddleware::class, ErService::VIEW_ROLES]];
$router->get('/er', [ErController::class, 'index'], $erView);
$router->get('/er/show', [ErController::class, 'show'], $erView);
$router->get('/er/patients', [ErController::class, 'patients'], [AuthMiddleware::class, [RoleMiddleware::class, ErService::REGISTER_ROLES]]);
$router->post('/er/register', [ErController::class, 'register'], [AuthMiddleware::class, [RoleMiddleware::class, ErService::REGISTER_ROLES]]);
$router->post('/er/triage', [ErController::class, 'triage'], [AuthMiddleware::class, [RoleMiddleware::class, ErService::TRIAGE_ROLES]]);
$router->post('/er/identify', [ErController::class, 'identify'], [AuthMiddleware::class, [RoleMiddleware::class, ErService::REGISTER_ROLES]]);
$router->post('/er/close', [ErController::class, 'close'], [AuthMiddleware::class, [RoleMiddleware::class, ErService::REGISTER_ROLES]]);
