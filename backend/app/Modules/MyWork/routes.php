<?php

use App\Modules\MyWork\Controllers\MyWorkController;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// My Work: the first screen after login -- what is assigned to me
// today (my patients, medicines and vitals due, results to review,
// appointments, OR cases, orders to verify, pending lab orders).
// ---------------------------------------------------------------

$router->get('/my-work', [MyWorkController::class, 'index'], [AuthMiddleware::class, [RoleMiddleware::class,
    ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'cna', 'pharmacist', 'lab_technician']]]);
