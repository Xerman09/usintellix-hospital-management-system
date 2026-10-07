<?php

use App\Modules\NursingStaff\Controllers\NursingStaffController;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// Nursing staff and the wards they work in. Admins manage anyone;
// a charge nurse manages people in their own wards (checked in the service).
// ---------------------------------------------------------------

$router->get('/nursing-staff', [NursingStaffController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'charge_nurse']]
]);

$router->get('/nursing-staff/history', [NursingStaffController::class, 'history'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'charge_nurse']]
]);

$router->post('/nursing-staff/wards', [NursingStaffController::class, 'setWards'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'charge_nurse']]
]);

$router->get('/nursing-staff/mine', [NursingStaffController::class, 'mine'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'nurse', 'charge_nurse', 'cna']]
]);

// ---------------------------------------------------------------
// Shift assignments (nurse + CNA per admitted patient per shift) and
// hand-overs. Everyone in nursing can read; assigning is for admins and
// the ward's charge nurse; hand-overs are written / received by the
// assigned nurses (all checked in NursingShiftService).
// ---------------------------------------------------------------

$router->get('/nurse-assignments', [\App\Modules\NursingStaff\Controllers\NursingShiftController::class, 'board'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'nurse', 'charge_nurse', 'cna', 'doctor']]
]);
$router->post('/nurse-assignments', [\App\Modules\NursingStaff\Controllers\NursingShiftController::class, 'save'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'charge_nurse']]
]);
$router->post('/nurse-assignments/copy-previous', [\App\Modules\NursingStaff\Controllers\NursingShiftController::class, 'copyPrevious'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'charge_nurse']]
]);
$router->get('/nurse-assignments/mine', [\App\Modules\NursingStaff\Controllers\NursingShiftController::class, 'mine'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'nurse', 'charge_nurse', 'cna']]
]);
// The chart widget, the census and (later) the room TV.
$router->get('/nurse-assignments/patient', [\App\Modules\NursingStaff\Controllers\NursingShiftController::class, 'patient'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'cna']]
]);
$router->get('/nurse-assignments/handovers', [\App\Modules\NursingStaff\Controllers\NursingShiftController::class, 'handovers'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'charge_nurse', 'cna']]
]);
$router->post('/nurse-assignments/handovers', [\App\Modules\NursingStaff\Controllers\NursingShiftController::class, 'writeHandover'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'nurse', 'charge_nurse']]
]);
$router->post('/nurse-assignments/handovers/receive', [\App\Modules\NursingStaff\Controllers\NursingShiftController::class, 'receive'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'nurse', 'charge_nurse']]
]);
