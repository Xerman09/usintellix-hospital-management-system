<?php

use App\Modules\Census\Controllers\CensusController;
use App\Modules\Census\Services\CensusService;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// Census: the midnight census per ward, by doctor and specialization,
// saved each day.
// ---------------------------------------------------------------

$router->get('/census', [CensusController::class, 'index'], [AuthMiddleware::class, [RoleMiddleware::class, CensusService::VIEW_ROLES]]);
$router->post('/census/save', [CensusController::class, 'save'], [AuthMiddleware::class, [RoleMiddleware::class, CensusService::SAVE_ROLES]]);
