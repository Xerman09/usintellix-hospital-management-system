<?php

use App\Modules\Er\Controllers\ErController;
use App\Modules\Er\Services\ErBoardService;
use App\Modules\Er\Services\ErProtocolService;
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
// Phase 2: the tracking board -- bed, doctor, nurse; settings (admin): beds, waiting-time targets, the ER team.
$router->post('/er/assign', [ErController::class, 'assign'], [AuthMiddleware::class, [RoleMiddleware::class, ErBoardService::ASSIGN_ROLES]]);
$erAdmin = [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]];
$router->post('/er/targets', [ErController::class, 'targets'], $erAdmin);
$router->post('/er/beds', [ErController::class, 'bed'], $erAdmin);
$router->post('/er/team', [ErController::class, 'team'], $erAdmin);
// Phase 3: chest pain / stroke / sepsis protocols -- start, record a step, stop; step targets (admin).
$erProto = [AuthMiddleware::class, [RoleMiddleware::class, ErProtocolService::ROLES]];
$router->post('/er/protocol/start', [ErController::class, 'protocolStart'], $erProto);
$router->post('/er/protocol/step', [ErController::class, 'protocolStep'], $erProto);
$router->post('/er/protocol/stop', [ErController::class, 'protocolStop'], $erProto);
$router->post('/er/protocol-targets', [ErController::class, 'protocolTargets'], $erAdmin);
