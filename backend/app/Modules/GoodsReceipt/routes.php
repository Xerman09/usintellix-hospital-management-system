<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\GoodsReceipt\Controllers\GoodsReceiptController;

/** @var \App\Core\Router $router */

$grnView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant', 'pharmacist', 'warehouse_staff']]];
$grnManage = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'nurse', 'charge_nurse', 'pharmacist', 'warehouse_staff', 'accountant']]];

// Goods Receipt Notes (GRN) & 3-Way Matching Routes
$router->get('/goods-receipt/notes', [GoodsReceiptController::class, 'index'], $grnView);
$router->get('/goods-receipt/notes/show', [GoodsReceiptController::class, 'show'], $grnView);
$router->get('/goods-receipt/metrics', [GoodsReceiptController::class, 'metrics'], $grnView);
$router->get('/goods-receipt/metadata', [GoodsReceiptController::class, 'metadata'], $grnView);
$router->get('/goods-receipt/notes/:id', [GoodsReceiptController::class, 'show'], $grnView);

$router->post('/goods-receipt/notes', [GoodsReceiptController::class, 'store'], $grnManage);
$router->post('/goods-receipt/notes/update', [GoodsReceiptController::class, 'update'], $grnManage);
$router->put('/goods-receipt/notes', [GoodsReceiptController::class, 'update'], $grnManage);
$router->delete('/goods-receipt/notes', [GoodsReceiptController::class, 'destroy'], $grnManage);
$router->post('/goods-receipt/notes/delete', [GoodsReceiptController::class, 'destroy'], $grnManage);

$router->post('/goods-receipt/authorize-ap', [GoodsReceiptController::class, 'authorizeAP'], $grnManage);
$router->post('/goods-receipt/notes/authorize-ap', [GoodsReceiptController::class, 'authorizeAP'], $grnManage);
