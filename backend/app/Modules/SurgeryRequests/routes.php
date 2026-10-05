<?php

use App\Modules\SurgeryRequests\Controllers\SurgeryRequestController;
use App\Modules\SurgeryRequests\Services\SurgeryRequestService;

/** @var \App\Core\Router $router */

// Viewing and the readiness checklist: the OR / ward team. Requesting, changing and cancelling: doctors (and admin).
$surgeryRequestViewers = [AuthMiddleware::class, [RoleMiddleware::class, SurgeryRequestService::VIEW_ROLES]];
$surgeryRequesters = [AuthMiddleware::class, [RoleMiddleware::class, SurgeryRequestService::REQUEST_ROLES]];

$router->get('/surgery-requests', [SurgeryRequestController::class, 'index'], $surgeryRequestViewers);
$router->get('/surgery-requests/show', [SurgeryRequestController::class, 'show'], $surgeryRequestViewers);
$router->get('/surgery-requests/patient', [SurgeryRequestController::class, 'patient'], $surgeryRequestViewers);
$router->get('/surgery-requests/form-options', [SurgeryRequestController::class, 'formOptions'], $surgeryRequestViewers);
$router->post('/surgery-requests', [SurgeryRequestController::class, 'store'], $surgeryRequesters);
$router->put('/surgery-requests', [SurgeryRequestController::class, 'update'], $surgeryRequesters);
$router->post('/surgery-requests/check', [SurgeryRequestController::class, 'check'], $surgeryRequestViewers);
$router->post('/surgery-requests/ready-override', [SurgeryRequestController::class, 'readyOverride'], $surgeryRequesters);
$router->post('/surgery-requests/cancel', [SurgeryRequestController::class, 'cancel'], $surgeryRequesters);
