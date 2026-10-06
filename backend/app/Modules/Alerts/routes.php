<?php

use App\Modules\Alerts\Controllers\AlertController;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// Alert center: every signed-in staff member sees the alerts sent to
// them (by person, role, unit or everyone). The service hides staff
// alerts from patient accounts.
// ---------------------------------------------------------------

$router->get('/alerts/poll', [AlertController::class, 'poll'], [AuthMiddleware::class]);
$router->get('/alerts', [AlertController::class, 'index'], [AuthMiddleware::class]);
$router->get('/alerts/show', [AlertController::class, 'show'], [AuthMiddleware::class]);
$router->get('/alerts/options', [AlertController::class, 'options'], [AuthMiddleware::class]);
$router->post('/alerts/seen', [AlertController::class, 'seen'], [AuthMiddleware::class]);
$router->post('/alerts/read', [AlertController::class, 'read'], [AuthMiddleware::class]);
$router->post('/alerts/read-all', [AlertController::class, 'readAll'], [AuthMiddleware::class]);
$router->post('/alerts/acknowledge', [AlertController::class, 'acknowledge'], [AuthMiddleware::class]);

// Sending by hand: admin, doctor, nurse (checked in the controller; only admins send to everyone).
$router->post('/alerts/send', [AlertController::class, 'send'], [AuthMiddleware::class]);
