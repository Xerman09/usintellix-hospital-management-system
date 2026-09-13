<?php

use App\Modules\RelatedPersons\Controllers\RelatedPersonController;

/** @var \App\Core\Router $router */

$allowedRoles = ['admin', 'receptionist', 'doctor'];

$router->get('/related-persons', [RelatedPersonController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);

$router->post('/related-persons', [RelatedPersonController::class, 'store'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);

$router->put('/related-persons', [RelatedPersonController::class, 'update'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);

$router->delete('/related-persons', [RelatedPersonController::class, 'destroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);

$router->get('/related-persons/telecoms', [RelatedPersonController::class, 'telecomsIndex'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);

$router->post('/related-persons/telecoms', [RelatedPersonController::class, 'telecomsStore'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);

$router->put('/related-persons/telecoms', [RelatedPersonController::class, 'telecomsUpdate'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);

$router->delete('/related-persons/telecoms', [RelatedPersonController::class, 'telecomsDestroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);

$router->get('/related-persons/addresses', [RelatedPersonController::class, 'addressesIndex'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);

$router->post('/related-persons/addresses', [RelatedPersonController::class, 'addressesStore'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);

$router->put('/related-persons/addresses', [RelatedPersonController::class, 'addressesUpdate'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);

$router->delete('/related-persons/addresses', [RelatedPersonController::class, 'addressesDestroy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, $allowedRoles]
]);

// Proxy portal access -- linking/revoking is staff-only (admin/receptionist);
// doctors manage clinical data, not portal account access.
$router->get('/related-persons/proxy/candidates', [RelatedPersonController::class, 'proxyCandidates'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/related-persons/proxy/link', [RelatedPersonController::class, 'proxyLink'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/related-persons/proxy/revoke', [RelatedPersonController::class, 'proxyRevoke'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);
