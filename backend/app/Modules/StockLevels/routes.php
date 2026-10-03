<?php

use App\Modules\StockLevels\Controllers\StockLevelController;
use App\Modules\StockLevels\Services\StockLevelService;

/** @var \App\Core\Router $router */

$levelView = [AuthMiddleware::class, [RoleMiddleware::class, StockLevelService::VIEW_ROLES]];
$levelEdit = [AuthMiddleware::class, [RoleMiddleware::class, StockLevelService::EDIT_ROLES]];

$router->get('/stock-levels/options', [StockLevelController::class, 'options'], $levelView);
$router->get('/stock-levels', [StockLevelController::class, 'levels'], $levelView);
// Items below their minimum at every location (the pharmacy dashboard's list).
$router->get('/stock-levels/low-stock', [StockLevelController::class, 'lowStock'], $levelView);
$router->post('/stock-levels', [StockLevelController::class, 'save'], $levelEdit);
$router->post('/stock-levels/copy', [StockLevelController::class, 'copy'], $levelEdit);
