<?php

use App\Modules\MyWork\Controllers\MyWorkController;
use App\Modules\MyWork\Controllers\TaskController;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// My Work: the first screen after login -- what is assigned to me
// today (my patients, medicines and vitals due, results to review,
// appointments, OR cases, orders to verify, pending lab orders).
// ---------------------------------------------------------------

$router->get('/my-work', [MyWorkController::class, 'index'], [AuthMiddleware::class, [RoleMiddleware::class,
    ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'cna', 'pharmacist', 'lab_technician']]]);

// Tasks: assigned to a person, a role or the patient's nurse, with a due time. Overdue tasks
// alert; completing one records who and when. Any staff member (the service checks who may
// complete, change or cancel each task).
$router->get('/tasks', [TaskController::class, 'index'], [AuthMiddleware::class]);
$router->get('/tasks/options', [TaskController::class, 'options'], [AuthMiddleware::class]);
$router->post('/tasks', [TaskController::class, 'save'], [AuthMiddleware::class]);
$router->post('/tasks/complete', [TaskController::class, 'complete'], [AuthMiddleware::class]);
$router->post('/tasks/cancel', [TaskController::class, 'cancel'], [AuthMiddleware::class]);
