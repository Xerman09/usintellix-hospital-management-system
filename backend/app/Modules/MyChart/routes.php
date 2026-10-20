<?php

use App\Modules\MyChart\Controllers\MyChartController;
use App\Modules\MyChart\Services\PortalExplanationService;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// My Chart: the patient portal's own endpoints. Patient role only --
// staff read the same data through the chart and the results inbox.
// Each action resolves the patient through PortalGuard, so none of
// them takes a patient_id from the request.
// ---------------------------------------------------------------

$router->get('/mychart/results', [MyChartController::class, 'results'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/results/show', [MyChartController::class, 'result'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/results/trend', [MyChartController::class, 'trend'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/results/ask', [MyChartController::class, 'askAboutResult'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

// ---------------------------------------------------------------
// The staff side of My Chart: the plain-language explanations a
// patient reads under a result, edited under Laboratory settings.
// ---------------------------------------------------------------

$router->get('/portal-explanations', [MyChartController::class, 'explanations'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalExplanationService::VIEW_ROLES]
]);

$router->post('/portal-explanations', [MyChartController::class, 'saveExplanation'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalExplanationService::EDIT_ROLES]
]);
