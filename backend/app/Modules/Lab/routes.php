<?php

use App\Modules\Lab\Controllers\LabController;
use App\Modules\Lab\Services\LabChargeService;
use App\Modules\Lab\Services\LabReportService;
use App\Modules\Lab\Services\LabResultService;
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
// Phase 2: result entry (lab), verification and release (medical technologists), lab staff (admin).
$labResults = [AuthMiddleware::class, [RoleMiddleware::class, LabResultService::ENTER_ROLES]];
$router->get('/lab/results', [LabController::class, 'results'], $labResults);
$router->get('/lab/results/form', [LabController::class, 'resultForm'], $labResults);
$router->post('/lab/results/save', [LabController::class, 'resultSave'], $labResults);
$router->post('/lab/results/verify', [LabController::class, 'resultVerify'], $labResults);
$router->post('/lab/results/return', [LabController::class, 'resultReturn'], $labResults);
$router->get('/lab/staff', [LabController::class, 'staff'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]]);
$router->post('/lab/staff', [LabController::class, 'staffSave'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]]);
// Phase 3: turnaround & workload report; lab charges to the patient ledger (prices and posting: admin).
$labReport = [AuthMiddleware::class, [RoleMiddleware::class, LabReportService::ROLES]];
$labCharges = [AuthMiddleware::class, [RoleMiddleware::class, LabChargeService::VIEW_ROLES]];
$labBill = [AuthMiddleware::class, [RoleMiddleware::class, LabChargeService::BILL_ROLES]];
$router->get('/lab/report', [LabController::class, 'report'], $labReport);
$router->get('/lab/charges', [LabController::class, 'charges'], $labCharges);
$router->post('/lab/charges/post', [LabController::class, 'chargePost'], $labBill);
$router->post('/lab/charges/void', [LabController::class, 'chargeVoid'], $labBill);
$router->post('/lab/charges/discount', [LabController::class, 'chargeDiscount'], $labBill);
$router->get('/lab/prices', [LabController::class, 'prices'], $labCharges);
$router->post('/lab/prices', [LabController::class, 'pricesSave'], $labBill);
