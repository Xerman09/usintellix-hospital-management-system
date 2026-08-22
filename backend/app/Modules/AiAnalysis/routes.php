<?php

use App\Modules\AiAnalysis\Controllers\AiAnalysisController;

global $router;

$router->post('/api/ai/health-assessment', [AiAnalysisController::class, 'healthAssessment']);
