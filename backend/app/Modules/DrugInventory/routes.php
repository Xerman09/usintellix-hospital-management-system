<?php

use App\Modules\DrugInventory\Controllers\DrugInventoryController;
use App\Modules\DrugInventory\Controllers\PharmacyBatchRecallController;
use App\Modules\DrugInventory\Controllers\PharmacyCompoundingController;
use App\Modules\DrugInventory\Controllers\NarcoticsVaultController;
use App\Modules\DrugInventory\Controllers\LotRecallTraceController;
use App\Modules\DrugInventory\Controllers\NearExpiryQuarantineController;
use App\Modules\DrugInventory\Controllers\WarehouseController;

/** @var \App\Core\Router $router */

$router->get('/drug-inventory', [DrugInventoryController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/drug-inventory/options', [DrugInventoryController::class, 'options'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/drug-inventory', [DrugInventoryController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/drug-inventory/catalog', [DrugInventoryController::class, 'catalog'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/drug-inventory/drug', [DrugInventoryController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/drug-inventory', [DrugInventoryController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/drug-inventory', [DrugInventoryController::class, 'destroyDrug'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/drug-inventory/receive', [DrugInventoryController::class, 'receive'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/drug-inventory/import', [DrugInventoryController::class, 'import'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/drug-inventory/transfer', [DrugInventoryController::class, 'transfer'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/drug-inventory/destroy', [DrugInventoryController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/drug-inventory/destroyed', [DrugInventoryController::class, 'destroyedList'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

// Drug Batch / Lot Recalls & Quarantine
$router->get('/drug-inventory/recalls', [PharmacyBatchRecallController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->get('/drug-inventory/recalls/detail', [PharmacyBatchRecallController::class, 'detail'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->post('/drug-inventory/recalls', [PharmacyBatchRecallController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->post('/drug-inventory/recalls/status', [PharmacyBatchRecallController::class, 'updateStatus'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

// Near-Expiry Automated Quarantine Lock (<60 days)
$router->get('/drug-inventory/quarantine', [NearExpiryQuarantineController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->post('/drug-inventory/quarantine/scan', [NearExpiryQuarantineController::class, 'scan'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->post('/drug-inventory/quarantine/release', [NearExpiryQuarantineController::class, 'release'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->get('/drug-inventory/quarantine/logs', [NearExpiryQuarantineController::class, 'logs'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

// Lot Recall Trace Engine & Patient Outreach (pharmacy_lot_recalls)
$router->get('/drug-inventory/recall-trace/search-lots', [LotRecallTraceController::class, 'searchLots'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->get('/drug-inventory/recall-trace/trace', [LotRecallTraceController::class, 'trace'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->post('/drug-inventory/recall-trace/quarantine', [LotRecallTraceController::class, 'quarantine'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->post('/drug-inventory/recall-trace/create-recall', [LotRecallTraceController::class, 'createRecall'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->post('/drug-inventory/recall-trace/outreach-status', [LotRecallTraceController::class, 'updateOutreach'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->get('/drug-inventory/recall-trace/list', [LotRecallTraceController::class, 'list'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->get('/drug-inventory/recall-trace/export-csv', [LotRecallTraceController::class, 'exportCsv'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

// Extemporaneous Compounding & Specialized Formulations (pharmacy_compounding_records)
$router->get('/drug-inventory/compounding', [PharmacyCompoundingController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->get('/drug-inventory/compounding/detail', [PharmacyCompoundingController::class, 'detail'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->get('/drug-inventory/compounding/formulas', [PharmacyCompoundingController::class, 'formulas'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->post('/drug-inventory/compounding', [PharmacyCompoundingController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->post('/drug-inventory/compounding/inspect', [PharmacyCompoundingController::class, 'inspect'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
$router->get('/drug-inventory/compounding/label', [PharmacyCompoundingController::class, 'label'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

// Central Pharmacy Narcotics Safe Perpetual Ledger & Dual-Custody Witnessing
$router->get('/drug-inventory/narcotics-vault/stats', [NarcoticsVaultController::class, 'stats'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'pharmacist', 'charge_nurse']]
]);
$router->get('/drug-inventory/narcotics-vault/items', [NarcoticsVaultController::class, 'items'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'pharmacist', 'charge_nurse']]
]);
$router->get('/drug-inventory/narcotics-vault/movements', [NarcoticsVaultController::class, 'movements'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'pharmacist', 'charge_nurse']]
]);
$router->post('/drug-inventory/narcotics-vault/movements', [NarcoticsVaultController::class, 'recordMovement'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'pharmacist', 'charge_nurse']]
]);
$router->post('/drug-inventory/narcotics-vault/verify-witness', [NarcoticsVaultController::class, 'verifyWitness'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'pharmacist', 'charge_nurse']]
]);
$router->post('/drug-inventory/narcotics-vault/set-pin', [NarcoticsVaultController::class, 'setPin'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'pharmacist', 'charge_nurse']]
]);
$router->get('/drug-inventory/narcotics-vault/shift-audits', [NarcoticsVaultController::class, 'shiftAudits'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'pharmacist', 'charge_nurse']]
]);
$router->post('/drug-inventory/narcotics-vault/shift-audits', [NarcoticsVaultController::class, 'recordShiftAudit'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'pharmacist', 'charge_nurse']]
]);

$router->get('/warehouses', [WarehouseController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/warehouses/options', [WarehouseController::class, 'options'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->get('/warehouses/stock', [WarehouseController::class, 'stock'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

// Minimum / maximum stock per item at a location.
$router->post('/warehouses/stock-levels', [WarehouseController::class, 'saveStockLevel'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/warehouses/stock-levels', [WarehouseController::class, 'removeStockLevel'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/warehouses', [WarehouseController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/warehouses', [WarehouseController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/warehouses', [WarehouseController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
