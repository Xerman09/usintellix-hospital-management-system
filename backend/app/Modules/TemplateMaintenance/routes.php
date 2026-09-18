<?php

use App\Modules\TemplateMaintenance\Controllers\TemplateMaintenanceController;

/** @var \App\Core\Router $router */

$staffRoles = [AuthMiddleware::class, [RoleMiddleware::class, ['admin', 'receptionist', 'doctor']]];

// Categories
$router->get('/template-categories', [TemplateMaintenanceController::class, 'categoriesIndex'], $staffRoles);
$router->post('/template-categories', [TemplateMaintenanceController::class, 'categoriesStore'], $staffRoles);
$router->put('/template-categories', [TemplateMaintenanceController::class, 'categoriesUpdate'], $staffRoles);
$router->delete('/template-categories', [TemplateMaintenanceController::class, 'categoriesDestroy'], $staffRoles);

// Groups
$router->get('/template-groups', [TemplateMaintenanceController::class, 'groupsIndex'], $staffRoles);
$router->post('/template-groups', [TemplateMaintenanceController::class, 'groupsStore'], $staffRoles);
$router->put('/template-groups', [TemplateMaintenanceController::class, 'groupsUpdate'], $staffRoles);
$router->delete('/template-groups', [TemplateMaintenanceController::class, 'groupsDestroy'], $staffRoles);

// Profiles
$router->get('/template-profiles', [TemplateMaintenanceController::class, 'profilesIndex'], $staffRoles);
$router->post('/template-profiles', [TemplateMaintenanceController::class, 'profilesStore'], $staffRoles);
$router->put('/template-profiles', [TemplateMaintenanceController::class, 'profilesUpdate'], $staffRoles);
$router->put('/template-profiles/active', [TemplateMaintenanceController::class, 'profilesSetActive'], $staffRoles);
$router->delete('/template-profiles', [TemplateMaintenanceController::class, 'profilesDestroy'], $staffRoles);

// Patient template assignments (Default Patient Templates / Patient Assigned Templates)
$router->get('/patient-template-assignments', [TemplateMaintenanceController::class, 'assignmentsIndex'], $staffRoles);
$router->post('/patient-template-assignments', [TemplateMaintenanceController::class, 'assignmentsStore'], $staffRoles);
$router->delete('/patient-template-assignments', [TemplateMaintenanceController::class, 'assignmentsDestroy'], $staffRoles);
