<?php

use App\Modules\Dietary\Controllers\DietaryController;

/** @var \App\Core\Router $router */

$dietView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'dietitian', 'nutritionist']]];
$dietPrescribe = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'dietitian']]];
$dietKitchen = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'charge_nurse', 'dietitian', 'nutritionist']]];

// Clinical Diet Prescriptions
$router->get('/dietary/prescriptions', [DietaryController::class, 'index'], $dietView);
$router->get('/dietary/prescriptions/detail', [DietaryController::class, 'detail'], $dietView);
$router->get('/dietary/stats', [DietaryController::class, 'stats'], $dietView);
$router->get('/dietary/patient-allergies', [DietaryController::class, 'patientAllergies'], $dietView);
$router->post('/dietary/prescriptions/save', [DietaryController::class, 'prescribe'], $dietPrescribe);
$router->post('/dietary/prescriptions/discontinue', [DietaryController::class, 'discontinue'], $dietPrescribe);

// Kitchen Meal Tray Preparation & Allergy Clearance
$router->get('/dietary/trays', [DietaryController::class, 'trays'], $dietView);
$router->get('/dietary/trays/detail', [DietaryController::class, 'trayDetail'], $dietView);
$router->post('/dietary/trays/status', [DietaryController::class, 'updateTray'], $dietKitchen);
