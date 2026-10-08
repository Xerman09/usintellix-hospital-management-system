<?php

use App\Modules\OrManagement\Controllers\OrManagementController;

/** @var \App\Core\Router $router */

$router->get('/or-management/schedule', [OrManagementController::class, 'schedule'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/or-management/options', [OrManagementController::class, 'options'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/or-management/suites', [OrManagementController::class, 'suites'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/or-management/details', [OrManagementController::class, 'details'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/or-management/cases', [OrManagementController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/or-management/cases/update', [OrManagementController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/or-management/cases/stage', [OrManagementController::class, 'stage'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/or-management/suites/status', [OrManagementController::class, 'suiteStatus'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/or-management/suites', [OrManagementController::class, 'createSuite'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/or-management/suites/update', [OrManagementController::class, 'updateSuite'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

// ---------------------------------------------------------------
// OR Schedule (Surgery Phase 3): calendar, conflict checks, booking
// ready surgery requests, rescheduling, block times.
// ---------------------------------------------------------------
use App\Modules\OrManagement\Controllers\OrScheduleController;
use App\Modules\OrManagement\Services\OrSchedulingService;

$orScheduleRoles = [AuthMiddleware::class, [RoleMiddleware::class, OrSchedulingService::ROLES]];
$orScheduleAdmin = [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]];

$router->get('/or-schedule', [OrScheduleController::class, 'calendar'], $orScheduleRoles);
$router->post('/or-schedule/check', [OrScheduleController::class, 'check'], $orScheduleRoles);
$router->get('/or-schedule/case', [OrScheduleController::class, 'show'], $orScheduleRoles);
$router->post('/or-schedule/book', [OrScheduleController::class, 'book'], $orScheduleRoles);
$router->post('/or-schedule/reschedule', [OrScheduleController::class, 'reschedule'], $orScheduleRoles);
$router->post('/or-schedule/cancel', [OrScheduleController::class, 'cancel'], $orScheduleRoles);
$router->get('/or-schedule/blocks', [OrScheduleController::class, 'blocks'], $orScheduleRoles);
$router->post('/or-schedule/blocks', [OrScheduleController::class, 'saveBlock'], $orScheduleAdmin);
$router->post('/or-schedule/blocks/remove', [OrScheduleController::class, 'removeBlock'], $orScheduleAdmin);
$router->post('/or-schedule/turnover', [OrScheduleController::class, 'turnover'], $orScheduleAdmin);

// ---------------------------------------------------------------
// OR Live Board (Surgery Phase 4): stages in order, the WHO checklist
// built into the case, the intra-op record and stock used.
// ---------------------------------------------------------------
use App\Modules\OrManagement\Controllers\OrLiveController;

$router->get('/or-live/board', [OrLiveController::class, 'board'], $orScheduleRoles);
$router->get('/or-live/case', [OrLiveController::class, 'show'], $orScheduleRoles);
$router->post('/or-live/stage', [OrLiveController::class, 'stage'], $orScheduleRoles);
$router->post('/or-live/stage/undo', [OrLiveController::class, 'undo'], $orScheduleRoles);
$router->post('/or-live/delay', [OrLiveController::class, 'delay'], $orScheduleRoles);
$router->post('/or-live/checklist', [OrLiveController::class, 'checklist'], $orScheduleRoles);
$router->post('/or-live/times', [OrLiveController::class, 'times'], $orScheduleRoles);
$router->post('/or-live/vitals', [OrLiveController::class, 'addVitals'], $orScheduleRoles);
$router->post('/or-live/vitals/remove', [OrLiveController::class, 'removeVitals'], $orScheduleRoles);
$router->get('/or-live/stock', [OrLiveController::class, 'stock'], $orScheduleRoles);
$router->post('/or-live/items', [OrLiveController::class, 'addItem'], $orScheduleRoles);
$router->post('/or-live/items/void', [OrLiveController::class, 'voidItem'], $orScheduleRoles);
$router->post('/or-live/specimens', [OrLiveController::class, 'addSpecimen'], $orScheduleRoles);
$router->post('/or-live/specimens/remove', [OrLiveController::class, 'removeSpecimen'], $orScheduleRoles);

// Post-op (Surgery Phase 5): recovery readings, release to a bed / home,
// the operative report.
$router->post('/or-live/pacu', [OrLiveController::class, 'addPacu'], $orScheduleRoles);
$router->post('/or-live/pacu/remove', [OrLiveController::class, 'removePacu'], $orScheduleRoles);
$router->post('/or-live/release', [OrLiveController::class, 'release'], $orScheduleRoles);
$router->post('/or-live/report', [OrLiveController::class, 'saveReport'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor']]]);
$router->post('/or-live/report/sign', [OrLiveController::class, 'signReport'], [AuthMiddleware::class, [RoleMiddleware::class, ['doctor', 'admin']]]);
$router->post('/or-live/report/addendum', [OrLiveController::class, 'addendum'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor']]]);
$router->get('/or-live/report/print', [OrLiveController::class, 'printReport'], $orScheduleRoles);

// Charges and reports (Surgery Phase 6).
$router->post('/or-live/charges', [OrLiveController::class, 'postCharges'], $orScheduleRoles);
$router->post('/or-live/charges/void', [OrLiveController::class, 'voidCharge'], $orScheduleRoles);

use App\Modules\OrManagement\Controllers\OrReportController;

$router->get('/or-reports/options', [OrReportController::class, 'options'], $orScheduleRoles);
foreach (['utilization', 'timeliness', 'cancellations', 'volume', 'compliance', 'ssi'] as $orReport) {
    $router->get("/or-reports/{$orReport}", [OrReportController::class, $orReport], $orScheduleRoles);
}

// The day's OR list to print (time, room, surgeon, anesthesiologist, specialization).
$router->get('/or-list', [\App\Modules\OrManagement\Controllers\OrListController::class, 'index'], $orScheduleRoles);
