<?php

use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;
use App\Modules\PerformanceEvaluations\Controllers\PerformanceEvaluationController;

/** @var \App\Core\Router $router */

$peView = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'receptionist', 'cashier', 'biller', 'billing_officer', 'accountant']]];
$peManage = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'charge_nurse']]];

// Performance Evaluations Routes
$router->get('/performance-evaluations', [PerformanceEvaluationController::class, 'index'], $peView);
$router->get('/performance-evaluations/metrics', [PerformanceEvaluationController::class, 'metrics'], $peView);
$router->get('/performance-evaluations/metadata', [PerformanceEvaluationController::class, 'metadata'], $peView);

$router->post('/performance-evaluations', [PerformanceEvaluationController::class, 'store'], $peManage);
$router->post('/performance-evaluations/update', [PerformanceEvaluationController::class, 'update'], $peManage);
$router->put('/performance-evaluations', [PerformanceEvaluationController::class, 'update'], $peManage);
$router->delete('/performance-evaluations', [PerformanceEvaluationController::class, 'destroy'], $peManage);
$router->post('/performance-evaluations/delete', [PerformanceEvaluationController::class, 'destroy'], $peManage);

$router->post('/performance-evaluations/acknowledge', [PerformanceEvaluationController::class, 'acknowledge'], $peView);
