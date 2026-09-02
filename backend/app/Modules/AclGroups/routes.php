<?php

use App\Modules\AclGroups\Controllers\AclGroupController;

/** @var \App\Core\Router $router */

$router->get('/acl-groups/overview', [AclGroupController::class, 'overview'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/acl-groups/memberships', [AclGroupController::class, 'memberships'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/acl-groups/memberships/add', [AclGroupController::class, 'addMembership'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/acl-groups/memberships/remove', [AclGroupController::class, 'removeMembership'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);
