<?php

use App\Modules\PatientPortalAccess\Controllers\PatientPortalAccessController;

/** @var \App\Core\Router $router */

$router->get('/patient-portal-access/credentials', [PatientPortalAccessController::class, 'credentials'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);

$router->post('/patient-portal-access/credentials', [PatientPortalAccessController::class, 'saveCredentials'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);
