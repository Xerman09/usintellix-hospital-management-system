<?php

use App\Modules\EyeExam\Controllers\EyeExamController;
use App\Middleware\AuthMiddleware;
use App\Middleware\RoleMiddleware;

/** @var \App\Core\Router $router */

$router->get('/encounter-eye-exam', [EyeExamController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->post('/encounter-eye-exam', [EyeExamController::class, 'save'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);
