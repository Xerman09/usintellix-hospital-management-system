<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\DutyRosters\Controllers\DutyRosterController;

/** @var \App\Core\Router $router */

$rosterView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$rosterAction = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'charge_nurse', 'receptionist']]];

// Doctor On-Call & Duty Rosters
$router->get('/duty-rosters/calendar', [DutyRosterController::class, 'calendar'], $rosterView);
$router->get('/duty-rosters/directory/today', [DutyRosterController::class, 'todayDirectory'], $rosterView);
$router->get('/duty-rosters/metadata', [DutyRosterController::class, 'metadata'], $rosterView);
$router->get('/duty-rosters/swaps', [DutyRosterController::class, 'listSwaps'], $rosterView);

$router->post('/duty-rosters', [DutyRosterController::class, 'store'], $rosterAction);
$router->put('/duty-rosters', [DutyRosterController::class, 'update'], $rosterAction);
$router->post('/duty-rosters/update', [DutyRosterController::class, 'update'], $rosterAction);
$router->delete('/duty-rosters', [DutyRosterController::class, 'destroy'], $rosterAction);
$router->post('/duty-rosters/delete', [DutyRosterController::class, 'destroy'], $rosterAction);

$router->post('/duty-rosters/swaps', [DutyRosterController::class, 'requestSwap'], $rosterAction);
$router->post('/duty-rosters/swaps/approve', [DutyRosterController::class, 'approveSwap'], $rosterAction);
$router->post('/duty-rosters/swaps/reject', [DutyRosterController::class, 'rejectSwap'], $rosterAction);
