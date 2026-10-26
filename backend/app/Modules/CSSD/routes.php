<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\CSSD\Controllers\CSSDController;

/** @var \App\Core\Router $router */

$cssdView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant', 'pharmacist', 'warehouse_staff']]];
$cssdManage = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'warehouse_staff']]];

// CSSD Surgical Instrument Sets & Trays Manifest Routes
$router->get('/cssd/metrics', [CSSDController::class, 'metrics'], $cssdView);
$router->get('/cssd/metadata', [CSSDController::class, 'metadata'], $cssdView);

// Master Surgical Trays
$router->get('/cssd/master-trays', [CSSDController::class, 'indexMaster'], $cssdView);
$router->get('/cssd/master-trays/show', [CSSDController::class, 'showMaster'], $cssdView);
$router->get('/cssd/master-trays/:id', [CSSDController::class, 'showMaster'], $cssdView);
$router->post('/cssd/master-trays', [CSSDController::class, 'storeMaster'], $cssdManage);
$router->post('/cssd/master-trays/update', [CSSDController::class, 'updateMaster'], $cssdManage);
$router->put('/cssd/master-trays', [CSSDController::class, 'updateMaster'], $cssdManage);
$router->delete('/cssd/master-trays', [CSSDController::class, 'destroyMaster'], $cssdManage);
$router->post('/cssd/master-trays/delete', [CSSDController::class, 'destroyMaster'], $cssdManage);

// Circulating Physical Trays
$router->get('/cssd/physical-trays', [CSSDController::class, 'indexPhysical'], $cssdView);
$router->get('/cssd/physical-trays/show', [CSSDController::class, 'showPhysical'], $cssdView);
$router->get('/cssd/physical-trays/:id', [CSSDController::class, 'showPhysical'], $cssdView);
$router->post('/cssd/physical-trays', [CSSDController::class, 'storePhysical'], $cssdManage);
$router->post('/cssd/physical-trays/update-status', [CSSDController::class, 'updateStatus'], $cssdManage);
$router->delete('/cssd/physical-trays', [CSSDController::class, 'destroyPhysical'], $cssdManage);
$router->post('/cssd/physical-trays/delete', [CSSDController::class, 'destroyPhysical'], $cssdManage);

// Sterilizer Equipment Machines & Daily Bowie-Dick Tests
$router->get('/cssd/machines', [CSSDController::class, 'indexMachines'], $cssdView);
$router->post('/cssd/machines', [CSSDController::class, 'storeMachine'], $cssdManage);
$router->post('/cssd/machines/bowie-dick', [CSSDController::class, 'recordBowieDick'], $cssdManage);

// Autoclave Sterilization Batches & Biological Spore Validation
$router->get('/cssd/batches', [CSSDController::class, 'indexBatches'], $cssdView);
$router->get('/cssd/batches/show', [CSSDController::class, 'showBatch'], $cssdView);
$router->get('/cssd/batches/:id', [CSSDController::class, 'showBatch'], $cssdView);
$router->post('/cssd/batches', [CSSDController::class, 'storeBatch'], $cssdManage);
$router->post('/cssd/batches/update', [CSSDController::class, 'updateBatch'], $cssdManage);
$router->put('/cssd/batches', [CSSDController::class, 'updateBatch'], $cssdManage);
$router->post('/cssd/batches/verify-spore', [CSSDController::class, 'verifySpore'], $cssdManage);

// Thermal Barcode Labels
$router->get('/cssd/batches/thermal-labels', [CSSDController::class, 'thermalLabels'], $cssdView);
$router->get('/cssd/batches/:id/thermal-labels', [CSSDController::class, 'thermalLabels'], $cssdView);
