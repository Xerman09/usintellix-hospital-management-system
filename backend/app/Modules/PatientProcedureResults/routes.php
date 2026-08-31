<?php

use App\Modules\PatientProcedureResults\Controllers\PatientProcedureResultController;

/** @var \App\Core\Router $router */

$router->get('/patient-procedure-results', [PatientProcedureResultController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-procedure-results/bulk', [PatientProcedureResultController::class, 'bulkSave'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
