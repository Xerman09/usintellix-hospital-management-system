<?php

use App\Modules\Audit\Controllers\AuditController;
use App\Modules\Audit\Controllers\AuditDiffController;
use App\Middlewares\AuthMiddleware;
use App\Middlewares\RoleMiddleware;

/** @var \App\Core\Router $router */

$router->get('/hipaa-audit-logs', [AuditController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/hipaa-audit-logs/verify', [AuditController::class, 'verify'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/hipaa-audit-logs/retention-policy', [AuditController::class, 'retentionPolicy'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/hipaa-audit-logs/export-csv', [AuditController::class, 'exportCsv'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/hipaa-audit-logs/export-report', [AuditController::class, 'exportReportData'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

// Granular Entity Data Change History (audit_trail_diffs)
$router->get('/audit-diffs', [AuditDiffController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/audit-diffs/show', [AuditDiffController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/audit-diffs/tables', [AuditDiffController::class, 'tables'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->get('/audit-diffs/entity', [AuditDiffController::class, 'entityHistory'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

$router->post('/audit-diffs/record', [AuditDiffController::class, 'record'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['admin']]
]);

