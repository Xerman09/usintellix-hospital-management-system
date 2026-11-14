<?php

use App\Modules\MyChart\Controllers\MyChartController;
use App\Modules\MyChart\Controllers\ProxyRequestController;
use App\Modules\MyChart\Controllers\RecordShareController;
use App\Modules\MyChart\Controllers\SelfReadingChartController;
use App\Modules\MyChart\Services\PortalProxyService;
use App\Modules\MyChart\Services\PortalExplanationService;
use App\Modules\MyChart\Services\PortalDiagnosisGuideService;
use App\Modules\MyChart\Services\PortalUploadService;
use App\Modules\MyChart\Services\PortalInsuranceService;
use App\Modules\MyChart\Services\PortalQuestionnaireService;
use App\Modules\MyChart\Services\PortalCheckinService;
use App\Modules\MyChart\Services\PortalPaymentService;
use App\Modules\MyChart\Services\PortalSelfReadingService;

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
// Account, proxy access and sharing: who can see my record, the
// links I have given out, and asking to see someone else's.
// ---------------------------------------------------------------

$router->get('/mychart/account', [MyChartController::class, 'account'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/access-log', [MyChartController::class, 'accessLog'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/record-pack', [MyChartController::class, 'recordPack'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/shares', [MyChartController::class, 'createShare'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/shares/revoke', [MyChartController::class, 'revokeShare'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/proxy-requests', [MyChartController::class, 'requestProxyAccess'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/proxy-access/revoke', [MyChartController::class, 'revokeProxyAccess'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

// The desk: requests to see someone else's record, and the decision.
$router->get('/proxy-requests', [ProxyRequestController::class, 'index'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalProxyService::REVIEW_ROLES]
]);

$router->post('/proxy-requests/decide', [ProxyRequestController::class, 'decide'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalProxyService::REVIEW_ROLES]
]);

// No login: the outside doctor opening a link the patient sent them. The token is
// the whole of the authorisation, and every hit on it is recorded.
$router->get('/record-share/open', [RecordShareController::class, 'open']);

// ---------------------------------------------------------------
// Track My Health: readings taken at home, their goal band, and the
// read-only panel the clinician sees in the chart.
// ---------------------------------------------------------------

$router->get('/mychart/readings', [MyChartController::class, 'readings'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/readings', [MyChartController::class, 'recordReading'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/readings/delete', [MyChartController::class, 'deleteReading'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/reading-goals', [MyChartController::class, 'saveReadingGoal'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/patient-self-readings', [SelfReadingChartController::class, 'show'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalSelfReadingService::CHART_ROLES]
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

// ---------------------------------------------------------------
// Appointment self-service (Phase M10): moving, cancelling and
// confirming one's own booking. Deliberately separate from the staff
// /appointments routes, whose PUT updates any field of any appointment
// and whose DELETE soft-deletes it.
// ---------------------------------------------------------------

$router->get('/mychart/appointments', [MyChartController::class, 'myAppointments'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/appointments/slots', [MyChartController::class, 'myAppointmentSlots'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/appointments/reschedule', [MyChartController::class, 'rescheduleMyAppointment'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/appointments/cancel', [MyChartController::class, 'cancelMyAppointment'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/appointments/confirm', [MyChartController::class, 'confirmMyAppointment'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

// ---------------------------------------------------------------
// Insurance (Phase M12): the cover the hospital holds, and asking for
// it to be added, corrected or removed. A request is a request --
// nothing here writes patient_insurances until the desk applies it.
// ---------------------------------------------------------------

$router->get('/mychart/insurance', [MyChartController::class, 'myInsurance'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/insurance/request', [MyChartController::class, 'requestInsuranceChange'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/insurance/withdraw', [MyChartController::class, 'withdrawInsuranceRequest'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

// The desk: the queue, and applying a request to the record.
$router->get('/portal-insurance-requests', [MyChartController::class, 'portalInsuranceRequests'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalInsuranceService::REVIEW_ROLES]
]);

$router->post('/portal-insurance-requests/review', [MyChartController::class, 'portalInsuranceReview'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalInsuranceService::DECIDE_ROLES]
]);

// ---------------------------------------------------------------
// Patient uploads (Phase M11): insurance cards, IDs, outside results,
// photographs. Everything lands pending and a staff member accepts it
// before it becomes part of the record. The files are never fetchable
// by URL -- both file routes re-check who is asking and stream the
// bytes themselves.
// ---------------------------------------------------------------

$router->get('/mychart/uploads', [MyChartController::class, 'myUploads'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/uploads', [MyChartController::class, 'storeMyUpload'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/uploads/withdraw', [MyChartController::class, 'withdrawMyUpload'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/uploads/file', [MyChartController::class, 'myUploadFile'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

// The desk: what patients have sent in, and the decision.
$router->get('/portal-uploads', [MyChartController::class, 'portalUploads'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalUploadService::REVIEW_ROLES]
]);

$router->get('/portal-uploads/file', [MyChartController::class, 'portalUploadFile'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalUploadService::REVIEW_ROLES]
]);

$router->post('/portal-uploads/review', [MyChartController::class, 'portalUploadReview'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalUploadService::DECIDE_ROLES]
]);

// ---------------------------------------------------------------
// Diagnosis guides: what a diagnosis means and what to do about it.
// The patient reads them under their own diagnoses; staff author them.
// ---------------------------------------------------------------

$router->post('/mychart/diagnosis-guides', [MyChartController::class, 'diagnosisGuides'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/portal-diagnosis-guides', [MyChartController::class, 'portalDiagnosisGuides'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalDiagnosisGuideService::VIEW_ROLES]
]);

$router->post('/portal-diagnosis-guides', [MyChartController::class, 'savePortalDiagnosisGuide'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalDiagnosisGuideService::EDIT_ROLES]
]);

// ---------------------------------------------------------------
// Questionnaires between visits (Phase M13). A clinician sends one
// with a due date, the patient answers it at home, and a scored
// answer that crosses the instrument's band reaches the care team
// as a real alert. The patient's three routes resolve the patient
// through PortalGuard; the clinic's routes are gated by role.
// ---------------------------------------------------------------

$router->get('/mychart/questionnaires', [MyChartController::class, 'myQuestionnaires'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->get('/mychart/questionnaires/form', [MyChartController::class, 'myQuestionnaireForm'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

$router->post('/mychart/questionnaires/submit', [MyChartController::class, 'submitMyQuestionnaire'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, ['patient']]
]);

// The clinic: the queue, what came back, and sending more out.
$router->get('/portal-questionnaires', [MyChartController::class, 'portalQuestionnaires'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalQuestionnaireService::REVIEW_ROLES]
]);

$router->get('/portal-questionnaires/show', [MyChartController::class, 'portalQuestionnaireShow'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalQuestionnaireService::REVIEW_ROLES]
]);

$router->get('/portal-questionnaires/history', [MyChartController::class, 'portalQuestionnaireHistory'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalQuestionnaireService::REVIEW_ROLES]
]);

$router->post('/portal-questionnaires/assign', [MyChartController::class, 'portalQuestionnaireAssign'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalQuestionnaireService::ASSIGN_ROLES]
]);

$router->post('/portal-questionnaires/cancel', [MyChartController::class, 'portalQuestionnaireCancel'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalQuestionnaireService::ASSIGN_ROLES]
]);

$router->post('/portal-questionnaires/reviewed', [MyChartController::class, 'portalQuestionnaireReviewed'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalQuestionnaireService::REVIEW_ROLES]
]);

$router->get('/portal-questionnaires/patients', [MyChartController::class, 'portalQuestionnairePatients'], [
    AuthMiddleware::class,
    [RoleMiddleware::class, PortalQuestionnaireService::ASSIGN_ROLES]
]);
