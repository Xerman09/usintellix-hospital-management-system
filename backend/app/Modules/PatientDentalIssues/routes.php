<?php

use App\Modules\PatientDentalIssues\Controllers\PatientDentalIssueController;

/** @var \App\Core\Router $router */

$router->get('/patient-dental-issues', [PatientDentalIssueController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-dental-issues', [PatientDentalIssueController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->put('/patient-dental-issues', [PatientDentalIssueController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->delete('/patient-dental-issues', [PatientDentalIssueController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
