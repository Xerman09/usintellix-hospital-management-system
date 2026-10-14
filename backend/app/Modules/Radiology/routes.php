<?php

use App\Modules\Radiology\Controllers\RadiologyController;
use App\Modules\Radiology\Services\RadiologyService;
use App\Modules\Radiology\Services\RadChargeService;
use App\Modules\Radiology\Services\RadReportService;
use App\Modules\Radiology\Services\RadStatsService;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// Radiology (module 15). Phase 1: imaging orders (X-ray, ultrasound,
// CT, MRI) with their safety screening and preparation instructions,
// and the scheduling worklist per machine.
// ---------------------------------------------------------------

$radView = [AuthMiddleware::class, [RoleMiddleware::class, RadiologyService::VIEW_ROLES]];
$radOrder = [AuthMiddleware::class, [RoleMiddleware::class, RadiologyService::ORDER_ROLES]];
$radSchedule = [AuthMiddleware::class, [RoleMiddleware::class, RadiologyService::SCHEDULE_ROLES]];
$radPrep = [AuthMiddleware::class, [RoleMiddleware::class, array_merge(RadiologyService::SCHEDULE_ROLES, ['nurse', 'charge_nurse'])]];

$router->get('/radiology/worklist', [RadiologyController::class, 'worklist'], $radView);
$router->get('/radiology/order-context', [RadiologyController::class, 'orderContext'], $radOrder);
$router->post('/radiology/order', [RadiologyController::class, 'order'], $radOrder);
$router->post('/radiology/cancel-study', [RadiologyController::class, 'cancelStudy'], $radOrder);
$router->get('/radiology/slots', [RadiologyController::class, 'slots'], $radView);
$router->get('/radiology/prep-sheet', [RadiologyController::class, 'prepSheet'], $radView);
$router->post('/radiology/schedule', [RadiologyController::class, 'schedule'], $radSchedule);
$router->post('/radiology/reschedule', [RadiologyController::class, 'reschedule'], $radSchedule);
$router->post('/radiology/booking/cancel', [RadiologyController::class, 'cancelBooking'], $radSchedule);
$router->post('/radiology/booking/arrived', [RadiologyController::class, 'arrived'], $radSchedule);
$router->post('/radiology/booking/prep', [RadiologyController::class, 'markPrep'], $radPrep);

// Phase 2: the study as performed, its images (opened in the DICOM viewer) and the radiologist's report.
$radPerform = [AuthMiddleware::class, [RoleMiddleware::class, RadReportService::PERFORM_ROLES]];
$radReport = [AuthMiddleware::class, [RoleMiddleware::class, RadReportService::REPORT_ROLES]];
$radAdmin = [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]];
$router->post('/radiology/perform', [RadiologyController::class, 'perform'], $radPerform);
$router->post('/radiology/images', [RadiologyController::class, 'uploadImage'], $radPerform);
$router->post('/radiology/images/delete', [RadiologyController::class, 'deleteImage'], $radPerform);
$router->get('/radiology/images', [RadiologyController::class, 'images'], $radView);
$router->get('/radiology/reports', [RadiologyController::class, 'reports'], $radView);
$router->get('/radiology/report', [RadiologyController::class, 'report'], $radView);
$router->get('/radiology/report/form', [RadiologyController::class, 'reportForm'], $radReport);
$router->post('/radiology/report/save', [RadiologyController::class, 'reportSave'], $radReport);
$router->get('/radiology/radiologists', [RadiologyController::class, 'radiologists'], $radAdmin);
$router->post('/radiology/radiologists', [RadiologyController::class, 'radiologistsSave'], $radAdmin);

// Phase 3: imaging charges to the patient ledger, and the turnaround / volume report per machine.
$radStats = [AuthMiddleware::class, [RoleMiddleware::class, RadStatsService::ROLES]];
$radCharges = [AuthMiddleware::class, [RoleMiddleware::class, RadChargeService::VIEW_ROLES]];
$radBill = [AuthMiddleware::class, [RoleMiddleware::class, RadChargeService::BILL_ROLES]];
$router->get('/radiology/stats', [RadiologyController::class, 'stats'], $radStats);
$router->get('/radiology/charges', [RadiologyController::class, 'charges'], $radCharges);
$router->post('/radiology/charges/post', [RadiologyController::class, 'chargePost'], $radBill);
$router->post('/radiology/charges/void', [RadiologyController::class, 'chargeVoid'], $radBill);
$router->post('/radiology/charges/discount', [RadiologyController::class, 'chargeDiscount'], $radBill);
$router->get('/radiology/prices', [RadiologyController::class, 'prices'], $radCharges);
$router->post('/radiology/prices', [RadiologyController::class, 'pricesSave'], $radBill);
