<?php

use App\Modules\PatientProcedureResults\Controllers\PatientProcedureResultController;

/** @var \App\Core\Router $router */

$router->get('/patient-procedure-results', [PatientProcedureResultController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'lab_technician']]
]);

$router->put('/patient-procedure-results/bulk', [PatientProcedureResultController::class, 'bulkSave'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'lab_technician']]
]);

// Import results from a CSV file (each row flagged Normal / Abnormal / Critical).
$router->post('/patient-procedure-results/import', [PatientProcedureResultController::class, 'import'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse', 'lab_technician']]
]);
