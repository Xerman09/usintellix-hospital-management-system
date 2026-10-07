<?php

use App\Modules\ResultsInbox\Controllers\ResultsInboxController;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// Results inbox: new lab and radiology results for your patients
// (the "!" in the top bar), until you open each one.
// ---------------------------------------------------------------

$router->get('/results-inbox', [ResultsInboxController::class, 'index'], [AuthMiddleware::class]);
$router->get('/results-inbox/count', [ResultsInboxController::class, 'count'], [AuthMiddleware::class]);
$router->post('/results-inbox/open', [ResultsInboxController::class, 'open'], [AuthMiddleware::class]);
