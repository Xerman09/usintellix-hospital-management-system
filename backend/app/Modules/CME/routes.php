<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\CME\Controllers\CMEController;

/** @var \App\Core\Router $router */

$cmeView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$cmeManage = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'charge_nurse']]];

// CME / CPD Credit Ledger Routes
$router->get('/cme/records', [CMEController::class, 'index'], $cmeView);
$router->get('/cme/profile', [CMEController::class, 'profile'], $cmeView);
$router->get('/cme/compliance-overview', [CMEController::class, 'complianceOverview'], $cmeView);
$router->get('/cme/metadata', [CMEController::class, 'metadata'], $cmeView);

$router->post('/cme/records', [CMEController::class, 'store'], $cmeManage);
$router->post('/cme/records/update', [CMEController::class, 'update'], $cmeManage);
$router->put('/cme/records', [CMEController::class, 'update'], $cmeManage);
$router->delete('/cme/records', [CMEController::class, 'destroy'], $cmeManage);
$router->post('/cme/records/delete', [CMEController::class, 'destroy'], $cmeManage);
