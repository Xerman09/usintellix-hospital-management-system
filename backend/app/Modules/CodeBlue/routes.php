<?php

use App\Modules\CodeBlue\Controllers\CodeBlueController;
use App\Modules\CodeBlue\Services\CodeBlueService;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// Code Blue: call a code (with its location), alert the code team,
// the ward and the nurse stations at once; "Responding"; end it.
// ---------------------------------------------------------------

$codeBlueStaff = [AuthMiddleware::class, [RoleMiddleware::class, CodeBlueService::CALL_ROLES]];
$router->get('/code-blue', [CodeBlueController::class, 'index'], $codeBlueStaff);
$router->get('/code-blue/show', [CodeBlueController::class, 'show'], $codeBlueStaff);
$router->post('/code-blue', [CodeBlueController::class, 'call'], $codeBlueStaff);
$router->post('/code-blue/respond', [CodeBlueController::class, 'answer'], $codeBlueStaff);
$router->post('/code-blue/end', [CodeBlueController::class, 'end'], $codeBlueStaff);
$router->get('/code-blue/team', [CodeBlueController::class, 'team'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]]);
$router->post('/code-blue/team', [CodeBlueController::class, 'addMember'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]]);
$router->delete('/code-blue/team', [CodeBlueController::class, 'removeMember'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]]);
