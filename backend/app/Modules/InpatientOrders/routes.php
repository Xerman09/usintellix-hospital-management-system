<?php

use App\Modules\InpatientOrders\Controllers\CabinetController;
use App\Modules\InpatientOrders\Controllers\MarController;
use App\Modules\InpatientOrders\Controllers\MedOrderController;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// Inpatient medicine orders: doctors order and stop; pharmacists
// verify or reject; nurses and doctors read. Role rules are also
// checked in MedOrderService.
// ---------------------------------------------------------------

$medOrderReaders = ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'pharmacist'];

$router->get('/med-orders/options', [MedOrderController::class, 'options'], [AuthMiddleware::class, [RoleMiddleware::class, $medOrderReaders]]);
$router->get('/med-orders/drugs', [MedOrderController::class, 'drugs'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'pharmacist']]]);
$router->post('/med-orders/check', [MedOrderController::class, 'check'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor']]]);
$router->post('/med-orders', [MedOrderController::class, 'store'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor']]]);
$router->get('/med-orders/admission', [MedOrderController::class, 'admission'], [AuthMiddleware::class, [RoleMiddleware::class, $medOrderReaders]]);
$router->get('/med-orders/patient', [MedOrderController::class, 'patient'], [AuthMiddleware::class, [RoleMiddleware::class, $medOrderReaders]]);
$router->get('/med-orders/queue', [MedOrderController::class, 'queue'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'pharmacist']]]);
$router->post('/med-orders/verify', [MedOrderController::class, 'verify'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'pharmacist']]]);
$router->post('/med-orders/reject', [MedOrderController::class, 'reject'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'pharmacist']]]);
$router->post('/med-orders/discontinue', [MedOrderController::class, 'discontinue'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor']]]);

// ---------------------------------------------------------------
// Medicine administration record (MAR): nurses record doses as
// given / held / refused; doctors and pharmacists read.
// ---------------------------------------------------------------

$marGivers = ['admin', 'nurse', 'charge_nurse'];

$router->get('/mar/board', [MarController::class, 'board'], [AuthMiddleware::class, [RoleMiddleware::class, $medOrderReaders]]);
$router->get('/mar/admission', [MarController::class, 'admission'], [AuthMiddleware::class, [RoleMiddleware::class, $medOrderReaders]]);
$router->post('/mar/give', [MarController::class, 'give'], [AuthMiddleware::class, [RoleMiddleware::class, $marGivers]]);
$router->post('/mar/hold', [MarController::class, 'hold'], [AuthMiddleware::class, [RoleMiddleware::class, $marGivers]]);
$router->post('/mar/refuse', [MarController::class, 'refuse'], [AuthMiddleware::class, [RoleMiddleware::class, $marGivers]]);
$router->post('/mar/void', [MarController::class, 'void'], [AuthMiddleware::class, [RoleMiddleware::class, $marGivers]]);
$router->post('/mar/recheck', [MarController::class, 'recheck'], [AuthMiddleware::class, [RoleMiddleware::class, $marGivers]]);
// Supply: where a dose is taken from (ward stock / pharmacy), and the admin settings for it.
$router->get('/mar/supply', [MarController::class, 'supply'], [AuthMiddleware::class, [RoleMiddleware::class, $marGivers]]);
$router->get('/mar/supply-settings', [MarController::class, 'supplySettings'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]]);
$router->post('/mar/supply-settings', [MarController::class, 'saveSupplySettings'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]]);

// Dangerous-drugs register (read only; entries are written when a DD dose is recorded on the MAR).
$router->get('/dd-register', [MarController::class, 'ddRegister'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'pharmacist', 'doctor', 'nurse', 'charge_nurse']]]);

// ---------------------------------------------------------------
// Ward medicine cabinets: nurses take medicine out for a patient's
// dose (deducted through the medicine ledger), then give it on the
// MAR (charged), return it or record it as wasted.
// ---------------------------------------------------------------

$router->get('/ward-cabinet', [CabinetController::class, 'view'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'nurse', 'charge_nurse', 'pharmacist', 'doctor']]]);
$router->post('/ward-cabinet/withdraw', [CabinetController::class, 'withdraw'], [AuthMiddleware::class, [RoleMiddleware::class, $marGivers]]);
$router->post('/ward-cabinet/return', [CabinetController::class, 'giveBack'], [AuthMiddleware::class, [RoleMiddleware::class, $marGivers]]);
$router->post('/ward-cabinet/waste', [CabinetController::class, 'waste'], [AuthMiddleware::class, [RoleMiddleware::class, $marGivers]]);
$router->post('/ward-cabinet/levels', [CabinetController::class, 'levels'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'pharmacist', 'charge_nurse']]]);

// Restocking the cabinets: automatic requests to the pharmacy, filled as stock transfers,
// receipt confirmed by the ward.
$router->get('/ward-cabinet/restock-queue', [CabinetController::class, 'restockQueue'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'pharmacist']]]);
$router->post('/ward-cabinet/restock/fill', [CabinetController::class, 'restockFill'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'pharmacist']]]);
$router->post('/ward-cabinet/restock/receive', [CabinetController::class, 'restockReceive'], [AuthMiddleware::class, [RoleMiddleware::class, $marGivers]]);
$router->post('/ward-cabinet/restock/urgent', [CabinetController::class, 'restockUrgent'], [AuthMiddleware::class, [RoleMiddleware::class, $marGivers]]);
$router->post('/ward-cabinet/restock/request', [CabinetController::class, 'restockNow'], [AuthMiddleware::class, [RoleMiddleware::class, $marGivers]]);
