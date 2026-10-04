<?php

use App\Modules\PharmacyReports\Controllers\PharmacyReportController;
use App\Modules\PharmacyReports\Services\PharmacyReportService;

/** @var \App\Core\Router $router */

// Read-only, with patient details: the people who dispense.
$pharmacyReportRoles = [AuthMiddleware::class, [RoleMiddleware::class, PharmacyReportService::ROLES]];

$router->get('/pharmacy-reports/options', [PharmacyReportController::class, 'options'], $pharmacyReportRoles);
$router->get('/pharmacy-reports/dispensing-log', [PharmacyReportController::class, 'dispensingLog'], $pharmacyReportRoles);
$router->get('/pharmacy-reports/dangerous-drugs', [PharmacyReportController::class, 'dangerousDrugs'], $pharmacyReportRoles);
$router->get('/pharmacy-reports/unfilled', [PharmacyReportController::class, 'unfilled'], $pharmacyReportRoles);
$router->get('/pharmacy-reports/by-prescriber', [PharmacyReportController::class, 'byPrescriber'], $pharmacyReportRoles);
