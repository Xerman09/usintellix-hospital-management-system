<?php

use App\Modules\LotTrace\Controllers\LotTraceController;
use App\Modules\LotTrace\Services\LotTraceService;

/** @var \App\Core\Router $router */

// Read-only: the same people who can read the medicine ledger.
$lotTraceRoles = [AuthMiddleware::class, [RoleMiddleware::class, LotTraceService::ROLES]];

$router->get('/lot-trace/search', [LotTraceController::class, 'search'], $lotTraceRoles);
$router->get('/lot-trace', [LotTraceController::class, 'trace'], $lotTraceRoles);
