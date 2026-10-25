<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\Attendance\Controllers\AttendanceController;

/** @var \App\Core\Router $router */

$attendanceView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$attendanceAction = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'accountant']]];
$attendanceAdmin = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'charge_nurse', 'accountant']]];

// Staff Attendance Time Clock Routes
$router->get('/attendance/logs', [AttendanceController::class, 'index'], $attendanceView);
$router->get('/attendance/status', [AttendanceController::class, 'status'], $attendanceView);
$router->get('/attendance/staff', [AttendanceController::class, 'staffList'], $attendanceView);

$router->post('/attendance/clock-in', [AttendanceController::class, 'clockIn'], $attendanceAction);
$router->post('/attendance/clock-out', [AttendanceController::class, 'clockOut'], $attendanceAction);

$router->post('/attendance/overtime/approve', [AttendanceController::class, 'approveOt'], $attendanceAdmin);
$router->post('/attendance/overtime/reject', [AttendanceController::class, 'rejectOt'], $attendanceAdmin);
