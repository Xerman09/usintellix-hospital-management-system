<?php

use App\Modules\VisitorManagement\Controllers\VisitorPassController;

/** @var \App\Core\Router $router */

// 1. Visitor Passes Listing & Search
$router->get('/visitor-passes', [VisitorPassController::class, 'index'], [
    AuthMiddleware::class
]);

// 2. Active Visitors Live Feed for Security Console
$router->get('/visitor-passes/active', [VisitorPassController::class, 'active'], [
    AuthMiddleware::class
]);

// 3. Visitor Management Dashboard Stats & Ward Distribution
$router->get('/visitor-passes/stats', [VisitorPassController::class, 'stats'], [
    AuthMiddleware::class
]);

// 4. Inpatient Admissions Dropdown Options (with quota usage)
$router->get('/visitor-passes/admissions-options', [VisitorPassController::class, 'admissionsOptions'], [
    AuthMiddleware::class
]);

// 5. Issue New Visitor Pass
$router->post('/visitor-passes/issue', [VisitorPassController::class, 'issue'], [
    AuthMiddleware::class
]);

// 6. Check-Out Visitor Pass
$router->post('/visitor-passes/check-out', [VisitorPassController::class, 'checkOut'], [
    AuthMiddleware::class
]);

// 7. Security Checkpoint Barcode Scan Verification
$router->post('/visitor-passes/verify', [VisitorPassController::class, 'verify'], [
    AuthMiddleware::class
]);

// 8. Revoke Visitor Pass (Security Intervention)
$router->post('/visitor-passes/revoke', [VisitorPassController::class, 'revoke'], [
    AuthMiddleware::class
]);

// 9. Printable Thermal Visitor Badge
$router->get('/visitor-passes/badge', [VisitorPassController::class, 'badge'], [
    AuthMiddleware::class
]);
