<?php

use App\Modules\X12Partners\Controllers\X12PartnerController;

/** @var \App\Core\Router $router */

$router->get('/x12-partners', [X12PartnerController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/x12-partners', [X12PartnerController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/x12-partners', [X12PartnerController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/x12-partners', [X12PartnerController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
