<?php

use App\Modules\SupplierReturns\Controllers\SupplierReturnController;
use App\Modules\SupplierReturns\Services\SupplierReturnService;

/** @var \App\Core\Router $router */

// Storage locations' staff prepare and send returns; admins / accountants
// approve them and record the supplier's credit. Both can view.
$returnPrepare = [AuthMiddleware::class, [RoleMiddleware::class, SupplierReturnService::PREPARER_ROLES]];
$returnApprove = [AuthMiddleware::class, [RoleMiddleware::class, SupplierReturnService::APPROVER_ROLES]];
$returnView = [AuthMiddleware::class, [RoleMiddleware::class, array_values(array_unique(array_merge(SupplierReturnService::PREPARER_ROLES, SupplierReturnService::APPROVER_ROLES)))]];

$router->get('/supplier-returns', [SupplierReturnController::class, 'index'], $returnView);
$router->get('/supplier-returns/detail', [SupplierReturnController::class, 'show'], $returnView);
$router->get('/supplier-returns/sources', [SupplierReturnController::class, 'sources'], $returnPrepare);
$router->post('/supplier-returns', [SupplierReturnController::class, 'store'], $returnPrepare);
$router->put('/supplier-returns', [SupplierReturnController::class, 'update'], $returnPrepare);
$router->delete('/supplier-returns', [SupplierReturnController::class, 'destroy'], $returnPrepare);
$router->post('/supplier-returns/send', [SupplierReturnController::class, 'send'], $returnPrepare);
$router->post('/supplier-returns/approve', [SupplierReturnController::class, 'approve'], $returnApprove);
$router->post('/supplier-returns/reject', [SupplierReturnController::class, 'reject'], $returnApprove);
$router->post('/supplier-returns/credit', [SupplierReturnController::class, 'credit'], $returnApprove);
$router->post('/supplier-returns/cancel', [SupplierReturnController::class, 'cancel'], $returnView);
