<?php

use App\Modules\Announcements\Controllers\AnnouncementController;

/** @var \App\Core\Router $router */

// End-users can view announcements matching their role
$router->get('/announcements', [AnnouncementController::class, 'index'], [
    AuthMiddleware::class
]);

$router->get('/announcements/active', [AnnouncementController::class, 'active'], [
    AuthMiddleware::class
]);

$router->get('/announcements/show', [AnnouncementController::class, 'show'], [
    AuthMiddleware::class
]);

$router->get('/announcements/roles', [AnnouncementController::class, 'roles'], [
    AuthMiddleware::class
]);

// Only Admins can create, update, delete announcements
$router->post('/announcements', [AnnouncementController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/announcements/update', [AnnouncementController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/announcements', [AnnouncementController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/announcements', [AnnouncementController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);