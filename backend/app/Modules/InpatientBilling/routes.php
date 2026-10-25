<?php

use App\Modules\InpatientBilling\Controllers\InpatientFolioController;

/** @var \App\Core\Router $router */

$billingView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$billingAction = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];

// Consolidated Inpatient Master Folios
$router->get('/inpatient-billing/folios', [InpatientFolioController::class, 'index'], $billingView);
$router->get('/inpatient-billing/folios/detail', [InpatientFolioController::class, 'detail'], $billingView);
$router->get('/inpatient-billing/folios/for-admission', [InpatientFolioController::class, 'forAdmission'], $billingView);
$router->get('/inpatient-billing/admissions', [InpatientFolioController::class, 'listAdmissions'], $billingView);

$router->post('/inpatient-billing/folios/sync', [InpatientFolioController::class, 'sync'], $billingAction);
$router->post('/inpatient-billing/folios/line-items', [InpatientFolioController::class, 'addLineItem'], $billingAction);
$router->post('/inpatient-billing/folios/line-items/void', [InpatientFolioController::class, 'voidLineItem'], $billingAction);
$router->post('/inpatient-billing/folios/discount-insurance', [InpatientFolioController::class, 'applyDiscount'], $billingAction);
$router->post('/inpatient-billing/folios/payments', [InpatientFolioController::class, 'recordPayment'], $billingAction);
$router->post('/inpatient-billing/folios/clearance', [InpatientFolioController::class, 'issueClearance'], $billingAction);
$router->post('/inpatient-billing/folios/seed-clinical-charges', [InpatientFolioController::class, 'seedClinicalCharges'], $billingAction);
