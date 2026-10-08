<?php

use App\Modules\CodeBlue\Controllers\CodeBlueController;
use App\Modules\CodeBlue\Services\CodeBlueReportService;
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
// The code record (Phase 2): one tap per event, corrections, the outcome.
$router->post('/code-blue/record', [CodeBlueController::class, 'record'], $codeBlueStaff);
$router->post('/code-blue/record/fix', [CodeBlueController::class, 'fixRecord'], $codeBlueStaff);
$router->post('/code-blue/outcome', [CodeBlueController::class, 'outcome'], $codeBlueStaff);
// Phase 3: the code sheet (chart), the report, crash carts (stock).
$router->get('/code-blue/sheet', [CodeBlueController::class, 'sheet'], $codeBlueStaff);
$router->get('/code-blue/patient', [CodeBlueController::class, 'patient'], $codeBlueStaff);
$router->get('/code-blue/report', [CodeBlueController::class, 'report'], [AuthMiddleware::class, [RoleMiddleware::class, CodeBlueReportService::ROLES]]);
$router->post('/code-blue/cart', [CodeBlueController::class, 'cart'], $codeBlueStaff);
$codeBlueAdmin = [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]];
$router->get('/code-blue/carts', [CodeBlueController::class, 'carts'], $codeBlueAdmin);
$router->post('/code-blue/carts', [CodeBlueController::class, 'saveCart'], $codeBlueAdmin);
$router->delete('/code-blue/carts', [CodeBlueController::class, 'removeCart'], $codeBlueAdmin);
$router->post('/code-blue/cart-drugs', [CodeBlueController::class, 'saveCartDrugs'], $codeBlueAdmin);
$router->get('/code-blue/team', [CodeBlueController::class, 'team'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]]);
$router->post('/code-blue/team', [CodeBlueController::class, 'addMember'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]]);
$router->delete('/code-blue/team', [CodeBlueController::class, 'removeMember'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin']]]);
