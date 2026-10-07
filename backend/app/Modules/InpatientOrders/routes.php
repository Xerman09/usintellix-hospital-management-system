<?php

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
