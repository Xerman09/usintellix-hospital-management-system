<?php

use App\Modules\InpatientVitals\Controllers\InpatientVitalsController;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// Inpatient vital signs: nurses, CNAs and doctors record and read;
// the schedule (every N hours) is set by nurses and doctors.
// Voiding is checked in the service (who recorded it / charge nurse / admin).
// ---------------------------------------------------------------

$vitalsReadRoles = ['admin', 'doctor', 'clinician', 'nurse', 'charge_nurse', 'cna'];

$router->get('/inpatient-vitals', [InpatientVitalsController::class, 'board'], [AuthMiddleware::class, [RoleMiddleware::class, $vitalsReadRoles]]);
$router->get('/inpatient-vitals/patient', [InpatientVitalsController::class, 'patient'], [AuthMiddleware::class, [RoleMiddleware::class, array_merge($vitalsReadRoles, ['receptionist'])]]);
$router->get('/inpatient-vitals/history', [InpatientVitalsController::class, 'history'], [AuthMiddleware::class, [RoleMiddleware::class, $vitalsReadRoles]]);
$router->post('/inpatient-vitals', [InpatientVitalsController::class, 'record'], [AuthMiddleware::class, [RoleMiddleware::class, $vitalsReadRoles]]);
$router->post('/inpatient-vitals/void', [InpatientVitalsController::class, 'void'], [AuthMiddleware::class, [RoleMiddleware::class, $vitalsReadRoles]]);
$router->post('/inpatient-vitals/schedule', [InpatientVitalsController::class, 'schedule'], [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'doctor', 'nurse', 'charge_nurse']]]);
