<?php

use App\Modules\MyChart\Controllers\MyChartController;
use App\Modules\MyChart\Services\PortalExplanationService;
use App\Modules\MyChart\Services\PortalCheckinService;
use App\Modules\MyChart\Services\PortalPaymentService;

/** @var \App\Core\Router $router */

// ---------------------------------------------------------------
// My Chart: the patient portal's own endpoints. Patient role only --
// staff read the same data through the chart and the results inbox.
// Each action resolves the patient through PortalGuard, so none of
// them takes a patient_id from the request.
// ---------------------------------------------------------------

$router->get('/mychart/results', [MyChartController::class, 'results'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/results/show', [MyChartController::class, 'result'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/results/trend', [MyChartController::class, 'trend'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/results/ask', [MyChartController::class, 'askAboutResult'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

// ---------------------------------------------------------------
// Visits: what is booked, what has happened, and the summary of each.
// ---------------------------------------------------------------

$router->get('/mychart/visits', [MyChartController::class, 'visits'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/visits/avs', [MyChartController::class, 'afterVisitSummary'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/visits/discharge-summary', [MyChartController::class, 'dischargeSummary'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

// ---------------------------------------------------------------
// Billing: the statement, paying, and the receipts.
// ---------------------------------------------------------------

$router->get('/mychart/billing', [MyChartController::class, 'billing'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/billing/history', [MyChartController::class, 'billingHistory'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/billing/receipt', [MyChartController::class, 'billingReceipt'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/billing/pay', [MyChartController::class, 'billingPay'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/billing/cancel', [MyChartController::class, 'billingCancel'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

// The desk confirms that a portal payment's money actually arrived. A payment
// gateway would call the same settle path from its callback instead.
$router->get('/portal-payments', [MyChartController::class, 'portalPayments'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalPaymentService::SETTLE_ROLES]
]);

$router->post('/portal-payments/settle', [MyChartController::class, 'portalPaymentSettle'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalPaymentService::SETTLE_ROLES]
]);

// ---------------------------------------------------------------
// To-Do and notifications: what is waiting, the bell, and what the
// patient wants to be told about.
// ---------------------------------------------------------------

$router->get('/mychart/todo', [MyChartController::class, 'todo'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/notifications', [MyChartController::class, 'notifications'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/notifications/read', [MyChartController::class, 'notificationRead'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/notification-preferences', [MyChartController::class, 'notificationPreferences'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/notification-preferences', [MyChartController::class, 'saveNotificationPreference'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

// ---------------------------------------------------------------
// e-Check-in: the paperwork done at home before a visit.
// ---------------------------------------------------------------

$router->get('/mychart/checkin', [MyChartController::class, 'checkinOpen'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/checkin/start', [MyChartController::class, 'checkinStart'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/checkin/step', [MyChartController::class, 'checkinStep'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/checkin/complete', [MyChartController::class, 'checkinComplete'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

// The desk: who has checked in online, what they answered, and arriving in one tap.
$router->get('/portal-checkins', [MyChartController::class, 'portalCheckins'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalCheckinService::DESK_ROLES]
]);

$router->get('/portal-checkins/response', [MyChartController::class, 'portalCheckinResponse'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalCheckinService::DESK_ROLES]
]);

$router->post('/portal-checkins/arrive', [MyChartController::class, 'portalCheckinArrive'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalCheckinService::DESK_ROLES]
]);

// ---------------------------------------------------------------
// The staff side of My Chart: the plain-language explanations a
// patient reads under a result, edited under Laboratory settings.
// ---------------------------------------------------------------

$router->get('/portal-explanations', [MyChartController::class, 'explanations'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalExplanationService::VIEW_ROLES]
]);

$router->post('/portal-explanations', [MyChartController::class, 'saveExplanation'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalExplanationService::EDIT_ROLES]
]);
