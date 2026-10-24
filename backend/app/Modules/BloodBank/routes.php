<?php

use App\Modules\BloodBank\Controllers\BloodDonorController;

/** @var \App\Core\Router $router */

$bbView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'lab_technician']]];
$bbManage = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'lab_technician']]];

// Blood Donor Registry & TTI Screening Routes
$router->get('/blood-bank/donors', [BloodDonorController::class, 'index'], $bbView);
$router->get('/blood-bank/donors/detail', [BloodDonorController::class, 'detail'], $bbView);
$router->get('/blood-bank/donors/stats', [BloodDonorController::class, 'stats'], $bbView);
$router->post('/blood-bank/donors/save', [BloodDonorController::class, 'save'], $bbManage);
