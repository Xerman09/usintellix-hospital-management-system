<?php

use App\Modules\MedicineLedger\Controllers\MedicineLedgerController;
use App\Modules\MedicineLedger\Services\MedicineLedgerService;

/** @var \App\Core\Router $router */

// The stock card: everyone who handles or accounts for stock can read it; nobody writes it by hand.
$ledgerRoles = [AuthMiddleware::class, [RoleMiddleware::class, MedicineLedgerService::ROLES]];

$router->get('/medicine-ledger/options', [MedicineLedgerController::class, 'options'], $ledgerRoles);
$router->get('/medicine-ledger', [MedicineLedgerController::class, 'ledger'], $ledgerRoles);
$router->get('/medicine-ledger/summary', [MedicineLedgerController::class, 'summary'], $ledgerRoles);
