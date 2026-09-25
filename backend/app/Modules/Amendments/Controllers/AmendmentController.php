<?php

namespace App\Modules\Amendments\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Amendments\Services\AmendmentService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class AmendmentController extends Controller
{
    private AmendmentService $amendmentService;
    private ProviderService $providerService;

    private const DETAIL_FIELDS = [
        'requested_date', 'requested_by', 'description', 'status', 'comments',
        'requester_type', 'requester_contact', 'target_record_type', 'target_record_id',
        'target_record_label', 'disputed_text', 'requested_amendment'
    ];

    public function __construct()
    {
        $this->amendmentService = new AmendmentService();
        $this->providerService = new ProviderService();
    }

    /**
     * List a patient's recorded amendment requests.
     */
    public function index(): void
    {
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        $amendments = $this->amendmentService->list($patientId);

        $this->success($amendments, 'Patient amendment requests retrieved successfully.');
    }

    /**
     * Administrative pipeline list across all patients with 60-day countdowns.
     */
    public function pipeline(): void
    {
        $request = new Request();
        $filters = [
            'status' => $request->input('status'),
            'search' => $request->input('search'),
            'target_record_type' => $request->input('target_record_type'),
            'urgency' => $request->input('urgency'),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to')
        ];

        $list = $this->amendmentService->pipelineList($filters);
        $this->success($list, 'PHI Amendment pipeline retrieved successfully.');
    }

    /**
     * Summary KPI stats for administrative pipeline.
     */
    public function stats(): void
    {
        $stats = $this->amendmentService->stats();
        $this->success($stats, 'Amendment pipeline statistics retrieved successfully.');
    }

    /**
     * Show single amendment details.
     */
    public function show(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Amendment ID is required.', 422);
            return;
        }

        $record = $this->amendmentService->get($id);
        if (!$record) {
            $this->error('Amendment record not found.', 404);
            return;
        }

        $this->success($record, 'Amendment details retrieved.');
    }

    /**
     * Intake a formal Statutory PHI Amendment Request (§ 164.526).
     */
    public function storeStatutory(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);

        $data = [
            'patient_id' => (int) $request->input('patient_id'),
            'request_date' => $request->input('request_date'),
            'requester_type' => $request->input('requester_type') ?: 'patient',
            'requester_name' => $request->input('requester_name'),
            'requester_contact' => $request->input('requester_contact'),
            'target_record_type' => $request->input('target_record_type') ?: 'encounter_soap_note',
            'target_record_id' => $request->input('target_record_id'),
            'target_record_label' => $request->input('target_record_label'),
            'disputed_text' => $request->input('disputed_text'),
            'requested_amendment' => $request->input('requested_amendment'),
            'comments' => $request->input('comments')
        ];

        $result = $this->amendmentService->storeStatutory($data, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Grant single 30-day statutory extension (§ 164.526(b)(2)(ii)).
     */
    public function grantExtension(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);

        $id = (int) $request->input('id');
        if (!$id) {
            $this->error('Amendment ID is required.', 422);
            return;
        }

        $payload = [
            'extension_reason' => $request->input('extension_reason'),
            'extension_rationale' => $request->input('extension_rationale')
        ];

        try {
            $result = $this->amendmentService->grantExtension($id, $payload, $userId);

            if (!$result['success']) {
                $this->error($result['message'], 422);
                return;
            }

            $this->success($result['data'], $result['message']);
        } catch (\InvalidArgumentException $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Generate formal written 30-day extension notice letter data (§ 164.526(b)(2)(ii)).
     */
    public function extensionNotice(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Amendment ID is required.', 422);
            return;
        }

        $result = $this->amendmentService->getExtensionNoticeData($id);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], 'Extension notice data generated.');
    }

    /**
     * Accept amendment request (§ 164.526(c)).
     */
    public function accept(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);

        $id = (int) $request->input('id');
        if (!$id) {
            $this->error('Amendment ID is required.', 422);
            return;
        }

        $payload = [
            'acceptance_notes' => $request->input('acceptance_notes')
        ];

        try {
            $result = $this->amendmentService->acceptAmendment($id, $payload, $userId);

            if (!$result['success']) {
                $this->error($result['message'], 422);
                return;
            }

            $this->success($result['data'], $result['message']);
        } catch (\InvalidArgumentException $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Deny amendment request citing one of the 4 statutory grounds (§ 164.526(a)(2)).
     */
    public function deny(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);

        $id = (int) $request->input('id');
        if (!$id) {
            $this->error('Amendment ID is required.', 422);
            return;
        }

        $payload = [
            'denial_statutory_ground' => $request->input('denial_statutory_ground'),
            'denial_rationale' => $request->input('denial_rationale')
        ];

        try {
            $result = $this->amendmentService->denyAmendment($id, $payload, $userId);

            if (!$result['success']) {
                $this->error($result['message'], 422);
                return;
            }

            $this->success($result['data'], $result['message']);
        } catch (\InvalidArgumentException $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * Generate formal written denial notice letter data (§ 164.526(d)(1)).
     */
    public function denialNotice(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Amendment ID is required.', 422);
            return;
        }

        $result = $this->amendmentService->getDenialNoticeData($id);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], 'Denial notice letter data generated.');
    }

    /**
     * File a patient Statement of Disagreement (§ 164.526(d)(2)).
     */
    public function fileDisagreement(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);

        $id = (int) $request->input('id');
        if (!$id) {
            $this->error('Amendment ID is required.', 422);
            return;
        }

        $payload = [
            'statement_of_disagreement' => $request->input('statement_of_disagreement')
        ];

        $result = $this->amendmentService->fileStatementOfDisagreement($id, $payload, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * File a covered entity Statement of Rebuttal (§ 164.526(d)(3)).
     */
    public function fileRebuttal(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);

        $id = (int) $request->input('id');
        if (!$id) {
            $this->error('Amendment ID is required.', 422);
            return;
        }

        $payload = [
            'statement_of_rebuttal' => $request->input('statement_of_rebuttal')
        ];

        $result = $this->amendmentService->fileStatementOfRebuttal($id, $payload, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Export active PHI Amendments registry to RFC 4180 CSV for OCR audit review.
     */
    public function exportCsv(): void
    {
        $csv = $this->amendmentService->exportRegistryCsv();

        header('Content-Type: text/csv; charset=UTF-8');
        header('Content-Disposition: attachment; filename="HIPAA_PHI_Amendments_Registry_' . date('Ymd_His') . '.csv"');
        header('Pragma: no-cache');
        header('Expires: 0');

        echo $csv;
        exit;
    }

    /**
     * Legacy store method for basic amendment requests.
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $result = $this->amendmentService->store(
            $patientId,
            (int) ($user['id'] ?? 1),
            $request->only(self::DETAIL_FIELDS)
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update a recorded amendment request.
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->amendmentService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Amendment record not found.', 404);
            return;
        }

        $result = $this->amendmentService->update(
            $id,
            $request->only(self::DETAIL_FIELDS),
            (int) ($user['id'] ?? 1)
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Remove a recorded amendment request.
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->amendmentService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Amendment record not found.', 404);
            return;
        }

        $result = $this->amendmentService->remove($id, (int) ($user['id'] ?? 1));

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Confirm the given patient exists and, for doctors, is assigned to them.
     */
    private function ownsPatient(array $user, int $patientId): bool
    {
        $patient = (new Patient())->where('id', $patientId)->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return false;
        }

        if (($user['role'] ?? '') !== 'doctor') {
            return true;
        }

        $provider = $this->providerService->findByUserId((int) $user['id']);
        $providerId = $provider ? (int) $provider['id'] : 0;

        return (int) $patient['provider_id'] === $providerId;
    }
}
