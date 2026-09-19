<?php

use App\Modules\BatchCom\Controllers\BatchComController;
use App\Core\Middleware\AuthMiddleware;

/** @var \App\Core\Router $router */

$router->post('/batch-com/filter', [
    BatchComController::class,
    'filter'
], [
    AuthMiddleware::class
]);

$router->get('/batch-com/export-csv', [
    BatchComController::class,
    'exportCsv'
], [
    AuthMiddleware::class
]);

$router->post('/batch-com/send', [
    BatchComController::class,
    'send'
], [
    AuthMiddleware::class
]);

$router->get('/batch-com/logs', [
    BatchComController::class,
    'logs'
], [
    AuthMiddleware::class
]);

$router->get('/batch-com/settings', [
    BatchComController::class,
    'getSettings'
], [
    AuthMiddleware::class
]);

$router->post('/batch-com/settings', [
    BatchComController::class,
    'saveSettings'
], [
    AuthMiddleware::class
]);
