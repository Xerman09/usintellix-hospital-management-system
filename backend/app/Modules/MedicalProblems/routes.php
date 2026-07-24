<?php

use App\Modules\MedicalProblems\Controllers\MedicalProblemController;

/** @var \App\Core\Router $router */

$router->get('/medical-problems', [MedicalProblemController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/medical-problems', [MedicalProblemController::class, 'register'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/medical-problems', [MedicalProblemController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/medical-problems', [MedicalProblemController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
