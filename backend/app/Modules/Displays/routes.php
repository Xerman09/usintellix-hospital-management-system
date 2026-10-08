<?php

use App\Modules\Displays\Controllers\DisplayController;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// TV displays: registered devices (room, nurse station, waiting
// room, OR) with a display key. The TV's feed takes no user login,
// only the device key (X-Display-Key header). Admin manages them.
// ---------------------------------------------------------------

$router->get('/display/feed', [DisplayController::class, 'feed']);

$adminOnly = [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]];
$router->get('/display-devices', [DisplayController::class, 'index'], $adminOnly);
$router->get('/display-devices/options', [DisplayController::class, 'options'], $adminOnly);
$router->get('/display-devices/show', [DisplayController::class, 'show'], $adminOnly);
$router->post('/display-devices', [DisplayController::class, 'save'], $adminOnly);
$router->post('/display-devices/key', [DisplayController::class, 'newKey'], $adminOnly);
$router->post('/display-devices/power', [DisplayController::class, 'power'], $adminOnly);
$router->post('/display-devices/reload', [DisplayController::class, 'reload'], $adminOnly);
$router->delete('/display-devices', [DisplayController::class, 'destroy'], $adminOnly);
