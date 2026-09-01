<?php

use App\Modules\PracticeRules\Controllers\PracticeRuleController;

/** @var \App\Core\Router $router */

// GET /practice-rules -> list all rules
// GET /practice-rules?id=X -> single rule, with JSON fields decoded
$router->get('/practice-rules', [PracticeRuleController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/practice-rules', [PracticeRuleController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/practice-rules', [PracticeRuleController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/practice-rules', [PracticeRuleController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/practice-rules/alert-manager', [PracticeRuleController::class, 'bulkUpdateAlertFlags'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
