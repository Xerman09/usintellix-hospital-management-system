<?php

use App\Modules\Radiology\Controllers\RadiologyController;
use App\Modules\Radiology\Services\RadiologyService;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// Radiology (module 15). Phase 1: imaging orders (X-ray, ultrasound,
// CT, MRI) with their safety screening and preparation instructions,
// and the scheduling worklist per machine.
// ---------------------------------------------------------------

$radView = [AuthMiddleware::class, [RoleMiddleware::class, RadiologyService::VIEW_ROLES]];
$radOrder = [AuthMiddleware::class, [RoleMiddleware::class, RadiologyService::ORDER_ROLES]];
$radSchedule = [AuthMiddleware::class, [RoleMiddleware::class, RadiologyService::SCHEDULE_ROLES]];
$radPrep = [AuthMiddleware::class, [RoleMiddleware::class, array_merge(RadiologyService::SCHEDULE_ROLES, ['nurse', 'charge_nurse'])]];

$router->get('/radiology/worklist', [RadiologyController::class, 'worklist'], $radView);
$router->get('/radiology/order-context', [RadiologyController::class, 'orderContext'], $radOrder);
$router->post('/radiology/order', [RadiologyController::class, 'order'], $radOrder);
$router->post('/radiology/cancel-study', [RadiologyController::class, 'cancelStudy'], $radOrder);
$router->get('/radiology/slots', [RadiologyController::class, 'slots'], $radView);
$router->get('/radiology/prep-sheet', [RadiologyController::class, 'prepSheet'], $radView);
$router->post('/radiology/schedule', [RadiologyController::class, 'schedule'], $radSchedule);
$router->post('/radiology/reschedule', [RadiologyController::class, 'reschedule'], $radSchedule);
$router->post('/radiology/booking/cancel', [RadiologyController::class, 'cancelBooking'], $radSchedule);
$router->post('/radiology/booking/arrived', [RadiologyController::class, 'arrived'], $radSchedule);
$router->post('/radiology/booking/prep', [RadiologyController::class, 'markPrep'], $radPrep);
