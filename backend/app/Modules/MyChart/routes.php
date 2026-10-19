<?php

use App\Modules\MyChart\Controllers\MyChartController;

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
