<?php

use App\Modules\PatientLedger\Controllers\PatientLedgerController;

/** @var \App\Core\Router $router */

$router->get('/patient-ledger', [PatientLedgerController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-ledger', [PatientLedgerController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
