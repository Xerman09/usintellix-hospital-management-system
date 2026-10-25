<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\LifeSupport\Controllers\LifeSupportController;

/** @var \App\Core\Router $router */

$lsView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$lsManage = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'charge_nurse']]];

// Life Support Clinical Certifications Tracker Routes
$router->get('/life-support/certifications', [LifeSupportController::class, 'index'], $lsView);
$router->get('/life-support/metrics', [LifeSupportController::class, 'metrics'], $lsView);
$router->get('/life-support/matrix', [LifeSupportController::class, 'matrix'], $lsView);
$router->get('/life-support/reminders', [LifeSupportController::class, 'reminders'], $lsView);
$router->get('/life-support/metadata', [LifeSupportController::class, 'metadata'], $lsView);

$router->post('/life-support/certifications', [LifeSupportController::class, 'store'], $lsManage);
$router->post('/life-support/certifications/update', [LifeSupportController::class, 'update'], $lsManage);
$router->put('/life-support/certifications', [LifeSupportController::class, 'update'], $lsManage);
$router->delete('/life-support/certifications', [LifeSupportController::class, 'destroy'], $lsManage);
$router->post('/life-support/certifications/delete', [LifeSupportController::class, 'destroy'], $lsManage);

$router->post('/life-support/scan-expirations', [LifeSupportController::class, 'scan'], $lsManage);
$router->post('/life-support/remind', [LifeSupportController::class, 'manualReminder'], $lsManage);
$router->post('/life-support/reminders/acknowledge', [LifeSupportController::class, 'acknowledgeReminder'], $lsView);
