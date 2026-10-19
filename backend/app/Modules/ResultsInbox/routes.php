<?php

use App\Modules\ResultsInbox\Controllers\ResultsInboxController;
use App\Modules\ResultsInbox\Services\ResultReviewService;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// Results inbox: new lab and radiology results for your patients
// (the "!" in the top bar), until you open each one.
// ---------------------------------------------------------------

$router->get('/results-inbox', [ResultsInboxController::class, 'index'], [AuthMiddleware::class]);
$router->get('/results-inbox/count', [ResultsInboxController::class, 'count'], [AuthMiddleware::class]);
$router->post('/results-inbox/open', [ResultsInboxController::class, 'open'], [AuthMiddleware::class]);

// Sign-off: the doctor marks results reviewed (optional action + comment); unreviewed results
// older than the set number of days are flagged.
$router->post('/results-review', [ResultsInboxController::class, 'review'], [AuthMiddleware::class, [RoleMiddleware::class, ResultReviewService::REVIEW_ROLES]]);
// My Chart: release a result to the patient now, or hold it back (a critical result is
// withheld until a doctor clears it). Same roles that sign results off.
$router->post('/results-inbox/release', [ResultsInboxController::class, 'portalRelease'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, \App\Modules\MyChart\Services\PortalResultService::RELEASE_ROLES]
]);

$router->get('/results-review/settings', [ResultsInboxController::class, 'settings'], [AuthMiddleware::class]);
$router->post('/results-review/settings', [ResultsInboxController::class, 'saveSettings'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]]);
