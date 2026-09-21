<?php

use App\Modules\EncounterReviewOfSystems\Controllers\EncounterReviewOfSystemController;

/** @var \App\Core\Router $router */

$router->get('/encounter-review-of-systems', [EncounterReviewOfSystemController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->put('/encounter-review-of-systems', [EncounterReviewOfSystemController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);
