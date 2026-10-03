<?php

use App\Modules\Requisitions\Controllers\RequisitionController;
use App\Modules\Requisitions\Services\RequisitionService;

/** @var \App\Core\Router $router */

// Any staff member can ask; who approves is decided per request (the
// department head, else an administrator); purchasing converts.
$requestRoles = [AuthMiddleware::class, [RoleMiddleware::class, RequisitionService::REQUESTER_ROLES]];
$purchaseRoles = [AuthMiddleware::class, [RoleMiddleware::class, RequisitionService::PURCHASER_ROLES]];

$router->get('/requisitions', [RequisitionController::class, 'index'], $requestRoles);
$router->get('/requisitions/detail', [RequisitionController::class, 'show'], $requestRoles);
$router->get('/requisitions/options', [RequisitionController::class, 'options'], $requestRoles);
$router->get('/requisitions/low-stock', [RequisitionController::class, 'lowStock'], $requestRoles);
$router->post('/requisitions', [RequisitionController::class, 'store'], $requestRoles);
$router->put('/requisitions', [RequisitionController::class, 'update'], $requestRoles);
$router->delete('/requisitions', [RequisitionController::class, 'destroy'], $requestRoles);
$router->post('/requisitions/approve', [RequisitionController::class, 'approve'], $requestRoles);
$router->post('/requisitions/reject', [RequisitionController::class, 'reject'], $requestRoles);
$router->post('/requisitions/cancel', [RequisitionController::class, 'cancel'], $requestRoles);
$router->post('/requisitions/close', [RequisitionController::class, 'close'], $purchaseRoles);
$router->get('/requisitions/outstanding', [RequisitionController::class, 'outstanding'], $purchaseRoles);
$router->post('/requisitions/convert', [RequisitionController::class, 'convert'], $purchaseRoles);
