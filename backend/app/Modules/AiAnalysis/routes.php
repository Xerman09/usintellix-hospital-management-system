<?php

use App\Modules\AiAnalysis\Controllers\AiAnalysisController;

/** @var \App\Core\Router $router */

$router->post('/ai/health-assessment', [AiAnalysisController::class, 'healthAssessment'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'patient']]
]);
