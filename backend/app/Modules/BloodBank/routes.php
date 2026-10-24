<?php

use App\Modules\BloodBank\Controllers\BloodDonorController;
use App\Modules\BloodBank\Controllers\BloodInventoryController;

/** @var \App\Core\Router $router */

$bbView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'lab_technician']]];
$bbManage = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'lab_technician']]];

// Blood Donor Registry & TTI Screening Routes
$router->get('/blood-bank/donors', [BloodDonorController::class, 'index'], $bbView);
$router->get('/blood-bank/donors/detail', [BloodDonorController::class, 'detail'], $bbView);
$router->get('/blood-bank/donors/stats', [BloodDonorController::class, 'stats'], $bbView);
$router->post('/blood-bank/donors/save', [BloodDonorController::class, 'save'], $bbManage);

// Blood Inventory & Cold-Chain Tracking Routes
$router->get('/blood-bank/inventory', [BloodInventoryController::class, 'index'], $bbView);
$router->get('/blood-bank/inventory/stats', [BloodInventoryController::class, 'stats'], $bbView);
$router->get('/blood-bank/inventory/storage-locations', [BloodInventoryController::class, 'storageLocations'], $bbView);
$router->post('/blood-bank/inventory/add', [BloodInventoryController::class, 'add'], $bbManage);
$router->post('/blood-bank/inventory/status', [BloodInventoryController::class, 'updateStatus'], $bbManage);
$router->post('/blood-bank/cold-chain/log-temp', [BloodInventoryController::class, 'logTemp'], $bbManage);
