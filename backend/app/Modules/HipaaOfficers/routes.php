<?php

declare(strict_types=1);

use App\Core\Router;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;
use App\Modules\HipaaOfficers\Controllers\HipaaOfficerController;

/** @var Router $router */

// Public endpoint for NPP, patient portal, and public inquiry
$router->get('/hipaa-officers/public', [HipaaOfficerController::class, 'public']);

// Authenticated endpoints
$router->get('/hipaa-officers', [HipaaOfficerController::class, 'index'], [AuthMiddleware::class]);
$router->get('/hipaa-officers/stats', [HipaaOfficerController::class, 'stats'], [AuthMiddleware::class]);
$router->get('/hipaa-officers/export-csv', [HipaaOfficerController::class, 'exportCsv'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
$router->get('/hipaa-officers/attestation/{type}', [HipaaOfficerController::class, 'attestation'], [AuthMiddleware::class]);
$router->get('/hipaa-officers/{type}', [HipaaOfficerController::class, 'show'], [AuthMiddleware::class]);
$router->put('/hipaa-officers/{type}', [HipaaOfficerController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
