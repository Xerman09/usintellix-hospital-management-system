<?php

use App\Modules\EquipmentAssets\Controllers\EquipmentAssetController;
use App\Modules\EquipmentAssets\Controllers\BiomedicalController;

/** @var \App\Core\Router $router */

// Machinery Inventory Fleet
$router->get('/equipment-assets', [EquipmentAssetController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->get('/equipment-assets/metrics', [EquipmentAssetController::class, 'metrics'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->get('/equipment-assets/locations', [EquipmentAssetController::class, 'locations'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->get('/equipment-assets/show', [EquipmentAssetController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->post('/equipment-assets', [EquipmentAssetController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/equipment-assets', [EquipmentAssetController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/equipment-assets/status', [EquipmentAssetController::class, 'status'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/equipment-assets/logs', [EquipmentAssetController::class, 'recordLog'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/equipment-assets', [EquipmentAssetController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

// Biomedical PM Schedules & Calendar
$router->get('/equipment-assets/biomed/summary', [BiomedicalController::class, 'summary'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->get('/equipment-assets/biomed/schedules', [BiomedicalController::class, 'schedules'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->get('/equipment-assets/biomed/schedules/show', [BiomedicalController::class, 'showSchedule'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->post('/equipment-assets/biomed/schedules', [BiomedicalController::class, 'storeSchedule'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/equipment-assets/biomed/schedules', [BiomedicalController::class, 'updateSchedule'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/equipment-assets/biomed/schedules', [BiomedicalController::class, 'destroySchedule'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/equipment-assets/biomed/calendar', [BiomedicalController::class, 'calendar'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->post('/equipment-assets/biomed/schedules/generate-wo', [BiomedicalController::class, 'generateWorkOrder'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

// Biomedical Work Orders
$router->get('/equipment-assets/biomed/work-orders', [BiomedicalController::class, 'workOrders'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->get('/equipment-assets/biomed/work-orders/show', [BiomedicalController::class, 'showWorkOrder'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->post('/equipment-assets/biomed/work-orders', [BiomedicalController::class, 'storeWorkOrder'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/equipment-assets/biomed/work-orders', [BiomedicalController::class, 'updateWorkOrder'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

// Breakdown Ticketing & Urgent Repairs
$router->get('/equipment-assets/biomed/breakdown-summary', [BiomedicalController::class, 'breakdownSummary'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->get('/equipment-assets/biomed/tickets', [BiomedicalController::class, 'breakdownTickets'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->post('/equipment-assets/biomed/tickets', [BiomedicalController::class, 'storeBreakdownTicket'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->put('/equipment-assets/biomed/tickets/resolve', [BiomedicalController::class, 'resolveBreakdownTicket'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

// NIST Calibration & Electrical Safety Certifications
$router->get('/equipment-assets/biomed/calibration-summary', [BiomedicalController::class, 'calibrationSummary'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->get('/equipment-assets/biomed/calibration-records', [BiomedicalController::class, 'calibrationRecords'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->get('/equipment-assets/biomed/calibration-record', [BiomedicalController::class, 'calibrationRecord'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'pharmacist', 'receptionist']]
]);

$router->post('/equipment-assets/biomed/calibration-records', [BiomedicalController::class, 'storeCalibrationRecord'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
