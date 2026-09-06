<?php

use App\Modules\Reminders\Controllers\ReminderController;

/** @var \App\Core\Router $router */

// List every reminder the logged-in user sent or was sent.
$router->get('/reminders/mine', [ReminderController::class, 'mine'], [
    AuthMiddleware::class
]);

// Send a new dated reminder. Body: { recipient_ids, patient_id?, due_date?, priority?, body, require_each_complete? }
$router->post('/reminders', [ReminderController::class, 'store'], [
    AuthMiddleware::class
]);

// Mark the logged-in user's own copy of a reminder as completed. Body: { reminder_id }
$router->post('/reminders/complete', [ReminderController::class, 'complete'], [
    AuthMiddleware::class
]);

// Remove a reminder (sender only). Body: { id }
$router->delete('/reminders', [ReminderController::class, 'destroy'], [
    AuthMiddleware::class
]);
