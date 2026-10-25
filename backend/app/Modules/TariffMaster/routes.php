<?php

use App\Modules\TariffMaster\Controllers\TariffMasterController;
use App\Modules\TariffMaster\Controllers\PackageOverageController;

/** @var \App\Core\Router $router */

$billingView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$billingAction = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];

// Hospital Master Tariff Book & Service Packages
$router->get('/tariffs', [TariffMasterController::class, 'index'], $billingView);
$router->get('/tariffs/summary', [TariffMasterController::class, 'summary'], $billingView);
$router->get('/tariffs/detail', [TariffMasterController::class, 'detail'], $billingView);
$router->get('/tariffs/packages', [TariffMasterController::class, 'packages'], $billingView);
$router->get('/tariffs/packages/detail', [TariffMasterController::class, 'packageDetail'], $billingView);

$router->post('/tariffs', [TariffMasterController::class, 'create'], $billingAction);
$router->post('/tariffs/update', [TariffMasterController::class, 'update'], $billingAction);
$router->post('/tariffs/calculate', [TariffMasterController::class, 'calculate'], $billingView);
$router->post('/tariffs/seed-demo', [TariffMasterController::class, 'seedDemo'], $billingAction);

// Bundled Packages Patient Enrollments & Automated Overage Engine
$router->get('/package-enrollments', [PackageOverageController::class, 'index'], $billingView);
$router->get('/package-enrollments/summary', [PackageOverageController::class, 'summary'], $billingView);
$router->get('/package-enrollments/detail', [PackageOverageController::class, 'detail'], $billingView);

$router->post('/package-enrollments', [PackageOverageController::class, 'enroll'], $billingAction);
$router->post('/package-enrollments/calculate-overages', [PackageOverageController::class, 'calculate'], $billingAction);
$router->post('/package-enrollments/sync', [PackageOverageController::class, 'sync'], $billingAction);
$router->post('/package-enrollments/post-to-folio', [PackageOverageController::class, 'postToFolio'], $billingAction);
$router->post('/package-enrollments/seed-demo', [PackageOverageController::class, 'seedDemo'], $billingAction);
