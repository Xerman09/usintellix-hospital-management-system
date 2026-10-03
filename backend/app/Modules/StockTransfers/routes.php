<?php

use App\Modules\StockTransfers\Controllers\StockTransferController;
use App\Modules\StockTransfers\Services\StockTransferService;

/** @var \App\Core\Router $router */

// Storage locations' staff make, send and receive transfers; accountants can look.
$transferStaff = [AuthMiddleware::class, [RoleMiddleware::class, StockTransferService::STAFF_ROLES]];
$transferView = [AuthMiddleware::class, [RoleMiddleware::class, StockTransferService::VIEW_ROLES]];

$router->get('/stock-transfers', [StockTransferController::class, 'index'], $transferView);
$router->get('/stock-transfers/detail', [StockTransferController::class, 'show'], $transferView);
$router->get('/stock-transfers/options', [StockTransferController::class, 'options'], $transferView);
$router->post('/stock-transfers', [StockTransferController::class, 'store'], $transferStaff);
$router->put('/stock-transfers', [StockTransferController::class, 'update'], $transferStaff);
$router->delete('/stock-transfers', [StockTransferController::class, 'destroy'], $transferStaff);
$router->post('/stock-transfers/send', [StockTransferController::class, 'send'], $transferStaff);
$router->post('/stock-transfers/receive', [StockTransferController::class, 'receive'], $transferStaff);
$router->post('/stock-transfers/cancel', [StockTransferController::class, 'cancel'], $transferStaff);
