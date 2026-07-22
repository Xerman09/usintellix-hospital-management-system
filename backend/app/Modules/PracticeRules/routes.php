<?php

use App\Modules\PracticeRules\Controllers\PracticeRuleController;

/** @var \App\Core\Router $router */

$router->get('/practice-rules', [PracticeRuleController::class, 'index'], [
    AuthMiddleware::class
]);

$router->get('/practice-rules/{id}', [PracticeRuleController::class, 'show'], [
    AuthMiddleware::class
]);

$router->post('/practice-rules', [PracticeRuleController::class, 'store'], [
    AuthMiddleware::class
]);

$router->put('/practice-rules/{id}', [PracticeRuleController::class, 'update'], [
    AuthMiddleware::class
]);

$router->delete('/practice-rules/{id}', [PracticeRuleController::class, 'destroy'], [
    AuthMiddleware::class
]);
