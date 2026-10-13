<?php

use App\Modules\Lab\Controllers\LabController;
use App\Modules\Lab\Services\LabService;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// Lab department (module 14). Phase 1: lab requests from the clinic,
// ER and wards reach the lab worklist; specimen collection with
// accession numbers and barcode labels.
// ---------------------------------------------------------------

$labView = [AuthMiddleware::class, [RoleMiddleware::class, LabService::VIEW_ROLES]];
$labOrder = [AuthMiddleware::class, [RoleMiddleware::class, LabService::ORDER_ROLES]];
$labCollect = [AuthMiddleware::class, [RoleMiddleware::class, LabService::COLLECT_ROLES]];
$router->get('/lab/worklist', [LabController::class, 'worklist'], $labView);
$router->get('/lab/order-context', [LabController::class, 'orderContext'], $labOrder);
$router->post('/lab/order', [LabController::class, 'order'], $labOrder);
$router->post('/lab/cancel-test', [LabController::class, 'cancelTest'], $labOrder);
$router->post('/lab/collect', [LabController::class, 'collect'], $labCollect);
$router->post('/lab/specimen/void', [LabController::class, 'voidSpecimen'], $labCollect);
$router->post('/lab/labels', [LabController::class, 'labels'], $labView);
