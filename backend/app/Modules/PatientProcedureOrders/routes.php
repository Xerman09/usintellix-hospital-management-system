<?php

use App\Modules\PatientProcedureOrders\Controllers\PatientProcedureOrderController;

/** @var \App\Core\Router $router */

$router->get('/patient-procedure-orders', [PatientProcedureOrderController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-procedure-orders', [PatientProcedureOrderController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-procedure-orders', [PatientProcedureOrderController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/patient-procedure-orders', [PatientProcedureOrderController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
