<?php

use App\Modules\SupplierInvoices\Controllers\SupplierInvoiceController;
use App\Modules\SupplierInvoices\Services\SupplierInvoiceService;

/** @var \App\Core\Router $router */

$invoiceRoles = SupplierInvoiceService::RECORDER_ROLES;
$invoiceViewRoles = array_values(array_unique(array_merge(SupplierInvoiceService::RECORDER_ROLES, SupplierInvoiceService::APPROVER_ROLES)));

$router->get('/supplier-invoices', [SupplierInvoiceController::class, 'index'], [AuthMiddleware::class, [RoleMiddleware::class, $invoiceViewRoles]]);
$router->get('/supplier-invoices/detail', [SupplierInvoiceController::class, 'show'], [AuthMiddleware::class, [RoleMiddleware::class, $invoiceViewRoles]]);
$router->get('/supplier-invoices/billable-orders', [SupplierInvoiceController::class, 'billableOrders'], [AuthMiddleware::class, [RoleMiddleware::class, $invoiceRoles]]);
$router->get('/supplier-invoices/order', [SupplierInvoiceController::class, 'order'], [AuthMiddleware::class, [RoleMiddleware::class, $invoiceRoles]]);
$router->post('/supplier-invoices/match', [SupplierInvoiceController::class, 'match'], [AuthMiddleware::class, [RoleMiddleware::class, $invoiceRoles]]);
$router->post('/supplier-invoices', [SupplierInvoiceController::class, 'store'], [AuthMiddleware::class, [RoleMiddleware::class, $invoiceRoles]]);
$router->put('/supplier-invoices', [SupplierInvoiceController::class, 'update'], [AuthMiddleware::class, [RoleMiddleware::class, $invoiceRoles]]);
$router->post('/supplier-invoices/approve', [SupplierInvoiceController::class, 'approve'], [AuthMiddleware::class, [RoleMiddleware::class, SupplierInvoiceService::APPROVER_ROLES]]);
$router->post('/supplier-invoices/reject', [SupplierInvoiceController::class, 'reject'], [AuthMiddleware::class, [RoleMiddleware::class, SupplierInvoiceService::APPROVER_ROLES]]);
$router->post('/supplier-invoices/cancel', [SupplierInvoiceController::class, 'cancel'], [AuthMiddleware::class, [RoleMiddleware::class, $invoiceViewRoles]]);
$router->delete('/supplier-invoices', [SupplierInvoiceController::class, 'destroy'], [AuthMiddleware::class, [RoleMiddleware::class, $invoiceRoles]]);
