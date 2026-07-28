<?php

use App\Modules\Rooms\Controllers\RoomController;

/** @var \App\Core\Router $router */

$router->get('/rooms', [RoomController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
