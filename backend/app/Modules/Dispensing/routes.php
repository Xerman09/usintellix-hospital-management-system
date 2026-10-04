<?php

use App\Modules\Dispensing\Controllers\DispensingController;
use App\Modules\Dispensing\Services\DispensingService;

/** @var \App\Core\Router $router */

$dispensingRoles = [AuthMiddleware::class, [RoleMiddleware::class, DispensingService::ROLES]];

$router->get('/dispensing', [DispensingController::class, 'index'], $dispensingRoles);
$router->get('/dispensing/show', [DispensingController::class, 'show'], $dispensingRoles);
$router->get('/dispensing/options', [DispensingController::class, 'options'], $dispensingRoles);
$router->get('/dispensing/labels', [DispensingController::class, 'labels'], $dispensingRoles);
$router->post('/dispensing', [DispensingController::class, 'store'], $dispensingRoles);
$router->post('/dispensing/void', [DispensingController::class, 'void'], $dispensingRoles);
$router->post('/dispensing/check', [DispensingController::class, 'check'], $dispensingRoles);
$router->post('/dispensing/close', [DispensingController::class, 'close'], $dispensingRoles);
$router->post('/dispensing/refill-request', [DispensingController::class, 'requestRefill'], $dispensingRoles);
$router->post('/dispensing/refill-decline', [DispensingController::class, 'declineRefill'], $dispensingRoles);
$router->post('/dispensing/payment', [DispensingController::class, 'payment'], $dispensingRoles);
$router->get('/dispensing/charge-slip', [DispensingController::class, 'chargeSlip'], $dispensingRoles);
