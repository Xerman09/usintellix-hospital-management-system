<?php

use App\Modules\ClaimDenials\Controllers\ClaimDenialController;

/** @var \App\Core\Router $router */

$billingView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$billingAction = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];

// Claim Denial Management & Appeals Workflow
$router->get('/claim-denials', [ClaimDenialController::class, 'index'], $billingView);
$router->get('/claim-denials/detail', [ClaimDenialController::class, 'detail'], $billingView);
$router->get('/claim-denials/metrics', [ClaimDenialController::class, 'metrics'], $billingView);
$router->get('/claim-denials/carc-dictionary', [ClaimDenialController::class, 'dictionary'], $billingView);

$router->post('/claim-denials', [ClaimDenialController::class, 'store'], $billingAction);
$router->post('/claim-denials/generate-appeal-letter', [ClaimDenialController::class, 'generateLetter'], $billingAction);
$router->post('/claim-denials/appeals', [ClaimDenialController::class, 'submitAppeal'], $billingAction);
$router->post('/claim-denials/appeals/outcome', [ClaimDenialController::class, 'recordOutcome'], $billingAction);
$router->post('/claim-denials/seed-samples', [ClaimDenialController::class, 'seed'], $billingAction);
