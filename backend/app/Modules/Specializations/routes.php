<?php

use App\Modules\Specializations\Controllers\SpecializationController;
use App\Modules\Specializations\Services\SpecializationService;

/** @var \App\Core\Router $router */

$specializationReaders = [AuthMiddleware::class, [RoleMiddleware::class, SpecializationService::READ_ROLES]];
$specializationAdmins = [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]];

$router->get('/specializations', [SpecializationController::class, 'index'], $specializationReaders);
$router->post('/specializations', [SpecializationController::class, 'store'], $specializationAdmins);
$router->put('/specializations', [SpecializationController::class, 'update'], $specializationAdmins);
$router->post('/specializations/active', [SpecializationController::class, 'setActive'], $specializationAdmins);
