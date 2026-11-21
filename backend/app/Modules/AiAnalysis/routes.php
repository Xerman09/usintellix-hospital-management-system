<?php

use App\Modules\AiAnalysis\Controllers\AiAnalysisController;

/** @var \App\Core\Router $router */

$router->post('/ai/health-assessment', [AiAnalysisController::class, 'healthAssessment'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor', 'patient']]
]);

// ---------------------------------------------------------------
// AI analysis of reports (AI-1).
//
// No RoleMiddleware list here, deliberately. Access is a capability
// (`ai_analysis`), checked inside AiGuardService along with the spend caps
// and rate limits, so there is one place that decides whether a request may
// cost money rather than two that have to agree. A role list here would be a
// second, quieter gate that nobody updates.
// ---------------------------------------------------------------

$router->get('/ai/reports', [AiAnalysisController::class, 'reports'], [
    AuthMiddleware::class
]);

$router->post('/ai/analyse', [AiAnalysisController::class, 'analyse'], [
    AuthMiddleware::class
]);

$router->get('/ai/usage', [AiAnalysisController::class, 'usage'], [
    AuthMiddleware::class
]);
