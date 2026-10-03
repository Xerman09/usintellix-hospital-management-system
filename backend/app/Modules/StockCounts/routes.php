<?php

use App\Modules\StockCounts\Controllers\StockCountController;
use App\Modules\StockCounts\Services\StockCountService;

/** @var \App\Core\Router $router */

// Storage locations' staff count; an administrator or the accountant
// approves the adjustment. Both can view counts and the difference report.
$countRoles = [AuthMiddleware::class, [RoleMiddleware::class, StockCountService::COUNTER_ROLES]];
$countApprove = [AuthMiddleware::class, [RoleMiddleware::class, StockCountService::APPROVER_ROLES]];
$countView = [AuthMiddleware::class, [RoleMiddleware::class, array_values(array_unique(array_merge(StockCountService::COUNTER_ROLES, StockCountService::APPROVER_ROLES)))]];

$router->get('/stock-counts', [StockCountController::class, 'index'], $countView);
$router->get('/stock-counts/detail', [StockCountController::class, 'show'], $countView);
$router->get('/stock-counts/options', [StockCountController::class, 'options'], $countView);
$router->get('/stock-counts/report', [StockCountController::class, 'report'], $countView);
$router->post('/stock-counts', [StockCountController::class, 'store'], $countRoles);
$router->put('/stock-counts', [StockCountController::class, 'update'], $countRoles);
$router->post('/stock-counts/approve', [StockCountController::class, 'approve'], $countApprove);
$router->post('/stock-counts/reject', [StockCountController::class, 'reject'], $countApprove);
$router->post('/stock-counts/cancel', [StockCountController::class, 'cancel'], $countView);
