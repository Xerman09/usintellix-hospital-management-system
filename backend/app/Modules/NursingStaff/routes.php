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
