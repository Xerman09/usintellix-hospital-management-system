<?php

use App\Modules\PatientPortalAccess\Controllers\PatientPortalAccessController;

/** @var \App\Core\Router $router */

$router->post('/patient-portal-access/reset-password', [PatientPortalAccessController::class, 'resetPassword'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin', 'receptionist']]
]);
