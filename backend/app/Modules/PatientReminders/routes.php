<?php

use App\Modules\PatientReminders\Controllers\PatientReminderController;

/** @var \App\Core\Router $router */

$router->get('/patient-reminders', [PatientReminderController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);

$router->post('/patient-reminders/process', [PatientReminderController::class, 'process'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/patient-reminders/process-and-send', [PatientReminderController::class, 'processAndSend'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);
