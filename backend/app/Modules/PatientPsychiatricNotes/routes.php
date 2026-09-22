<?php

use App\Middleware\AuthMiddleware;
use App\Modules\PatientPsychiatricNotes\Controllers\PatientPsychiatricNoteController;

/** @var \App\Core\Router $router */

$router->get('/api/patient-psychiatric-notes', [PatientPsychiatricNoteController::class, 'index'], [AuthMiddleware::class]);
$router->get('/api/patient-psychiatric-notes/show', [PatientPsychiatricNoteController::class, 'show'], [AuthMiddleware::class]);
$router->post('/api/patient-psychiatric-notes', [PatientPsychiatricNoteController::class, 'store'], [AuthMiddleware::class]);
$router->put('/api/patient-psychiatric-notes', [PatientPsychiatricNoteController::class, 'update'], [AuthMiddleware::class]);
$router->delete('/api/patient-psychiatric-notes', [PatientPsychiatricNoteController::class, 'destroy'], [AuthMiddleware::class]);
