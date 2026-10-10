<?php

use App\Modules\Icu\Controllers\IcuController;
use App\Modules\Icu\Services\IcuService;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// ICU flowsheet: hourly vital signs, level of consciousness, oxygen /
// ventilator settings, drips (rate and dose), intake and output with a
// running balance.
// ---------------------------------------------------------------

$icuView = [AuthMiddleware::class, [RoleMiddleware::class, IcuService::VIEW_ROLES]];
$icuRecord = [AuthMiddleware::class, [RoleMiddleware::class, IcuService::RECORD_ROLES]];
$icuIo = [AuthMiddleware::class, [RoleMiddleware::class, IcuService::IO_ROLES]];
$router->get('/icu', [IcuController::class, 'board'], $icuView);
$router->get('/icu/flowsheet', [IcuController::class, 'flowsheet'], $icuView);
$router->post('/icu/hour', [IcuController::class, 'hour'], $icuRecord);
$router->post('/icu/hour/void', [IcuController::class, 'voidHour'], $icuRecord);
$router->post('/icu/io', [IcuController::class, 'io'], $icuIo);
$router->post('/icu/io/void', [IcuController::class, 'voidIo'], $icuIo);
$router->post('/icu/drip/start', [IcuController::class, 'dripStart'], $icuRecord);
$router->post('/icu/drip/rate', [IcuController::class, 'dripRate'], $icuRecord);
$router->post('/icu/drip/stop', [IcuController::class, 'dripStop'], $icuRecord);
