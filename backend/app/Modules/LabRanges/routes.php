<?php

use App\Modules\LabRanges\Controllers\LabRangeController;
use App\Modules\LabRanges\Services\LabRangeService;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// Critical lab ranges: the admin sets each test's normal range and
// critical limits; results are flagged Normal / Abnormal / Critical.
// ---------------------------------------------------------------

$router->get('/lab-ranges', [LabRangeController::class, 'index'], [AuthMiddleware::class, [RoleMiddleware::class, LabRangeService::VIEW_ROLES]]);
$router->post('/lab-ranges', [LabRangeController::class, 'save'], [AuthMiddleware::class, [RoleMiddleware::class, LabRangeService::EDIT_ROLES]]);
$router->delete('/lab-ranges', [LabRangeController::class, 'destroy'], [AuthMiddleware::class, [RoleMiddleware::class, LabRangeService::EDIT_ROLES]]);
$router->post('/lab-ranges/test', [LabRangeController::class, 'test'], [AuthMiddleware::class, [RoleMiddleware::class, LabRangeService::VIEW_ROLES]]);
