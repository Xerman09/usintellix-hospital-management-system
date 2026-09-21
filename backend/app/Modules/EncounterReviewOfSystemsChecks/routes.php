<?php

use App\Modules\EncounterReviewOfSystemsChecks\Controllers\EncounterReviewOfSystemsCheckController;

/** @var \App\Core\Router $router */

$router->get('/encounter-review-of-systems-checks', [EncounterReviewOfSystemsCheckController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->put('/encounter-review-of-systems-checks', [EncounterReviewOfSystemsCheckController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);
