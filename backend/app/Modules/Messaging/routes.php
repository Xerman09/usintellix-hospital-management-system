<?php

use App\Modules\Messaging\Controllers\MessagingController;

/** @var \App\Core\Router $router */

/*
|--------------------------------------------------------------------------
| Messaging Routes
|--------------------------------------------------------------------------
|
| Routes for internal hospital messaging. This Router matches routes as
| exact strings and calls controller methods with no arguments, so unlike
| a framework router there is no "/{id}" placeholder support here — ids
| are passed as a query string param (GET) or JSON body field (POST),
| the same way every other module in this app does it.
|
*/

// List the logged-in user's conversations.
$router->get('/messages', [
    MessagingController::class,
    'index'
], [
    AuthMiddleware::class
]);

// Create a new conversation. Body: { participant_ids: [...], subject? }
$router->post('/messages', [
    MessagingController::class,
    'store'
], [
    AuthMiddleware::class
]);

// "My Messages" flat inbox. Query: ?scope=all|active|inactive
$router->get('/messages/mine', [
    MessagingController::class,
    'mine'
], [
    AuthMiddleware::class
]);

// Users available to start a new conversation with.
$router->get('/messages/recipients', [
    MessagingController::class,
    'recipients'
], [
    AuthMiddleware::class
]);

// Soft-delete a single message. Body: { message_id }
$router->delete('/messages/conversation/messages', [
    MessagingController::class,
    'destroyMessage'
], [
    AuthMiddleware::class
]);

// Message type catalog (compose form dropdown + admin management screen).
$router->get('/messages/types', [
    MessagingController::class,
    'typesIndex'
], [
    AuthMiddleware::class
]);

$router->post('/messages/types', [
    MessagingController::class,
    'typesStore'
], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/messages/types', [
    MessagingController::class,
    'typesUpdate'
], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/messages/types', [
    MessagingController::class,
    'typesDestroy'
], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

// Message status catalog (compose form dropdown + admin management screen).
$router->get('/messages/statuses', [
    MessagingController::class,
    'statusesIndex'
], [
    AuthMiddleware::class
]);

$router->post('/messages/statuses', [
    MessagingController::class,
    'statusesStore'
], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->put('/messages/statuses', [
    MessagingController::class,
    'statusesUpdate'
], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->delete('/messages/statuses', [
    MessagingController::class,
    'statusesDestroy'
], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

// Get a single conversation + its participants. Query: ?conversation_id=
$router->get('/messages/conversation', [
    MessagingController::class,
    'show'
], [
    AuthMiddleware::class
]);

// Get messages inside a conversation. Query: ?conversation_id=&limit=&offset=
$router->get('/messages/conversation/messages', [
    MessagingController::class,
    'messages'
], [
    AuthMiddleware::class
]);

// Send a message. Body: { conversation_id, body }
$router->post('/messages/conversation/messages', [
    MessagingController::class,
    'send'
], [
    AuthMiddleware::class
]);

// Mark a conversation as read. Body: { conversation_id }
$router->post('/messages/conversation/read', [
    MessagingController::class,
    'markRead'
], [
    AuthMiddleware::class
]);

// List a patient's recorded messages (patient dashboard widget). Query: ?patient_id=
$router->get('/messages/patient', [
    MessagingController::class,
    'patientMessages'
], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]
]);
