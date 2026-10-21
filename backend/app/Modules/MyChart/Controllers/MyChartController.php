<?php

namespace App\Modules\MyChart\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Messaging\Models\MessageType;
use App\Modules\Messaging\Services\MessagingService;
use App\Modules\MyChart\Services\PortalAudit;
use App\Modules\MyChart\Services\PortalGuard;
use App\Modules\MyChart\Services\PortalResultService;
use App\Modules\MyChart\Services\PortalExplanationService;
use App\Modules\MyChart\Services\PortalVisitService;

/**
 * My Chart, the patient's own view of their record.
 *
 * Every action starts at PortalGuard::enter(), which resolves which patient the
 * caller may act as (self or an active proxy grant), checks the capability, and
 * writes the portal audit row. No action reads patient_id from the request.
 */
class MyChartController extends Controller
{
    /** GET /mychart/results */
    public function results(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $patientId = PortalGuard::enter($user, 'Test Results Viewed', PortalGuard::CAP_RESULTS_VIEW);

        if ($patientId === null) {
            $this->error('Test results are not available for this account.', 403);
            return;
        }

        $data = PortalResultService::list($patientId, [
            'kind' => (string) $request->input('kind', ''),
            'from' => (string) $request->input('from', ''),
            'to' => (string) $request->input('to', ''),
            'q' => trim((string) $request->input('q', '')),
        ]);

        $this->success($data, 'Results retrieved successfully.');
    }

    /** GET /mychart/results/show?order_id= */
    public function result(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $orderId = (int) $request->input('order_id');

        $patientId = PortalGuard::enter($user, 'Test Result Opened', PortalGuard::CAP_RESULTS_VIEW);

        if ($patientId === null) {
            $this->error('Test results are not available for this account.', 403);
            return;
        }

        $result = $orderId ? PortalResultService::show($patientId, $orderId) : null;

        if ($result === null) {
            // Same answer whether the order belongs to someone else, does not exist, or
            // is being withheld -- a patient must not be able to tell those apart.
            $this->error('That result is not available.', 404);
            return;
        }

        $this->success($result, 'Result retrieved successfully.');
    }

    /** GET /mychart/results/trend?name=&code= -- one test's released values over time. */
    public function trend(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $patientId = PortalGuard::enter($user, 'Test Trend Viewed', PortalGuard::CAP_RESULTS_VIEW);

        if ($patientId === null) {
            $this->error('Test results are not available for this account.', 403);
            return;
        }

        $this->success(
            PortalResultService::trend($patientId, (string) $request->input('name', ''), (string) $request->input('code', '')),
            'Trend retrieved successfully.'
        );
    }

    /**
     * POST /mychart/results/ask -- ask the doctor about one result.
     * Body: order_id, test_name?, question. Goes to the doctor who ordered the test, or
     * to the patient's own provider when the order has none, through the existing
     * messaging system -- the same route a refill request takes.
     */
    public function askAboutResult(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $patientId = PortalGuard::enter($user, 'Result Question Sent', PortalGuard::CAP_RESULTS_VIEW);

        if ($patientId === null) {
            $this->error('Test results are not available for this account.', 403);
            return;
        }

        $question = trim((string) $request->input('question', ''));

        if ($question === '') {
            $this->error('Write your question first.', 422, ['question' => 'A question is required.']);
            return;
        }

        $orderId = (int) $request->input('order_id');
        $result = $orderId ? PortalResultService::show($patientId, $orderId) : null;

        if ($result === null) {
            $this->error('That result is not available.', 404);
            return;
        }

        $providerUserId = PortalResultService::doctorUserFor($orderId, $patientId);

        if (!$providerUserId) {
            $this->error('There is no doctor on this result to send your question to. Please use Messaging to contact the clinic.', 422);
            return;
        }

        $messaging = new MessagingService();
        $conversation = $messaging->createConversation((int) $user['id'], [$providerUserId], 'Question about a test result');

        if (empty($conversation['success'])) {
            $this->error($conversation['message'] ?? 'The question could not be sent.', 422);
            return;
        }

        $type = (new MessageType())->where('name', 'Result Question')->first();
        $sent = $messaging->sendMessage(
            (int) $conversation['data']['conversation_id'],
            (int) $user['id'],
            self::questionBody($result, $question),
            ['patient_id' => $patientId, 'type_id' => $type['id'] ?? null]
        );

        if (empty($sent['success'])) {
            $this->error($sent['message'] ?? 'The question could not be sent.', 422);
            return;
        }

        PortalAudit::action($user, $patientId, 'Result Question Sent', "Asked about {$result['test_name']} (order {$orderId}).");

        $this->success(
            ['conversation_id' => (int) $conversation['data']['conversation_id']],
            'Your question was sent to your doctor. The reply will appear in Messaging.'
        );
    }

    /** GET /mychart/visits -- what is coming up, and what has already happened. */
    public function visits(): void
    {
        $user = Session::get('user');

        $patientId = PortalGuard::enter($user, 'Visits Viewed');

        if ($patientId === null) {
            $this->error('Visits are not available for this account.', 403);
            return;
        }

        $this->success(PortalVisitService::list($patientId), 'Visits retrieved successfully.');
    }

    /** GET /mychart/visits/avs?encounter_id= -- the after-visit summary of one clinic visit. */
    public function afterVisitSummary(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $patientId = PortalGuard::enter($user, 'After-Visit Summary Viewed');

        if ($patientId === null) {
            $this->error('Visits are not available for this account.', 403);
            return;
        }

        $encounterId = (int) $request->input('encounter_id');
        $avs = $encounterId ? PortalVisitService::avs($patientId, $encounterId) : null;

        if ($avs === null) {
            $this->error('That visit summary is not available.', 404);
            return;
        }

        $this->success($avs, 'Visit summary retrieved successfully.');
    }

    /**
     * GET /mychart/visits/discharge-summary?admission_id= -- the signed discharge summary
     * of one hospital stay. A summary still being written is not offered.
     */
    public function dischargeSummary(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $patientId = PortalGuard::enter($user, 'Discharge Summary Viewed');

        if ($patientId === null) {
            $this->error('Visits are not available for this account.', 403);
            return;
        }

        $admissionId = (int) $request->input('admission_id');
        $summary = $admissionId ? PortalVisitService::dischargeSummary($patientId, $admissionId) : null;

        if ($summary === null) {
            $this->error('That discharge summary is not available yet. It appears here once your doctor has signed it.', 404);
            return;
        }

        $this->success($summary, 'Discharge summary retrieved successfully.');
    }

    /**
     * GET /portal-explanations -- the staff screen under Laboratory settings: every
     * explanation a patient can read, plus the tests that still have none.
     */
    public function explanations(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->success(
            PortalExplanationService::listAll(trim((string) $request->input('q', ''))) + [
                'can_edit' => \App\Core\RoleAccess::inList((string) ($user['role'] ?? ''), PortalExplanationService::EDIT_ROLES),
            ],
            'Explanations retrieved successfully.'
        );
    }

    /** POST /portal-explanations -- add or reword one explanation (admin). */
    public function saveExplanation(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $this->respond(PortalExplanationService::save($request->all(), (int) ($user['id'] ?? 0)));
    }

    /** Service result -> JSON, with the status the failure implies (same helper the results inbox uses). */
    private function respond(array $result): void
    {
        if (empty($result['success'])) {
            $code = !empty($result['not_found']) ? 404 : (!empty($result['forbidden']) ? 403 : 422);
            $this->json(['success' => false, 'message' => $result['message'] ?? 'That did not work.', 'errors' => $result['errors'] ?? null], $code);
            return;
        }

        $this->success($result['data'] ?? null, $result['message'] ?? 'Done.');
    }

    /** The message the doctor receives: what was asked, and which result it is about. */
    private static function questionBody(array $result, string $question): string
    {
        $lines = ['Question about a test result from My Chart.', ''];
        $lines[] = 'Test: ' . $result['test_name'];

        if (!empty($result['resulted_at'])) {
            $lines[] = 'Resulted: ' . $result['resulted_at'];
        }

        foreach (array_slice($result['results'], 0, 12) as $r) {
            $value = trim(($r['value'] ?? '') . ' ' . ($r['units'] ?? ''));
            $range = $r['reference_range'] ? " (usual range {$r['reference_range']})" : '';
            $lines[] = '  - ' . $r['name'] . ': ' . ($value !== '' ? $value : '-') . $range . ($r['abnormal'] ? ' [outside the usual range]' : '');
        }

        $lines[] = '';
        $lines[] = 'Their question:';
        $lines[] = $question;

        return implode("\n", $lines);
    }
}
