<?php

use App\Modules\Procurement\Controllers\ProcurementController;
use App\Modules\Procurement\Services\ProcurementReportService;

/** @var \App\Core\Router $router */

// Procurement reports: the people who order, receive and approve.
$procurementRoles = [AuthMiddleware::class, [RoleMiddleware::class, ProcurementReportService::ROLES]];

$router->get('/procurement/options', [ProcurementController::class, 'options'], $procurementRoles);
$router->get('/procurement/open-orders', [ProcurementController::class, 'openOrders'], $procurementRoles);
$router->get('/procurement/supplier-performance', [ProcurementController::class, 'supplierPerformance'], $procurementRoles);
$router->get('/procurement/spend', [ProcurementController::class, 'spend'], $procurementRoles);
$router->get('/procurement/price-history', [ProcurementController::class, 'priceHistory'], $procurementRoles);
$router->get('/procurement/price-differences', [ProcurementController::class, 'priceDifferences'], $procurementRoles);

// Approval limits: everyone in procurement can see them; only an administrator changes them.
$router->get('/approval-limits', [ProcurementController::class, 'limits'], $procurementRoles);
$router->put('/approval-limits', [ProcurementController::class, 'updateLimits'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]]);
