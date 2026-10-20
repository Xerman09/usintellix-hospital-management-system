<?php

use App\Modules\OpdSpecialtyConsultations\Controllers\OpdSpecialtyConsultationController;
use App\Core\AuthMiddleware;
use App\Core\RoleMiddleware;

/** @var \App\Core\Router $router */

$router->get('/opd-specialty-templates', [OpdSpecialtyConsultationController::class, 'templates'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->get('/opd-specialty-consultations', [OpdSpecialtyConsultationController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->post('/opd-specialty-consultations', [OpdSpecialtyConsultationController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->put('/opd-specialty-consultations', [OpdSpecialtyConsultationController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);

$router->delete('/opd-specialty-consultations', [OpdSpecialtyConsultationController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'doctor', 'clinician', 'nurse']]
]);
