<?php

namespace App\Modules\DrsRequests\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\DrsRequests\Services\DrsRequestService;

class DrsRequestController extends Controller
{
    private DrsRequestService $service;

    public function __construct()
    {
        $this->service = new DrsRequestService();
    }

    /**
     * List all Right of Access DRS requests with statutory countdown calculation.
     */
    public function index(): void
    {
        $request = new Request();
        $filters = [
            'status' => $request->input('status'),
            'patient_id' => $request->input('patient_id'),
            'format_requested' => $request->input('format_requested'),
            'search' => $request->input('search'),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
            'urgency' => $request->input('urgency')
        ];

        $requests = $this->service->list($filters);

        $this->success($requests, 'Right of Access requests retrieved successfully.');
    }

    /**
     * Get aggregate statistics, countdown badges, and compliance metrics.
     */
    public function stats(): void
    {
        $stats = $this->service->stats();

        $this->success($stats, 'Right of Access metrics retrieved.');
    }

    /**
     * View single request details with timeline and countdown.
     */
    public function show(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Request ID is required.', 422);
            return;
        }

        $row = $this->service->get($id);
        if (!$row) {
            $this->error('Right of Access request not found.', 404);
            return;
        }

        $this->success($row, 'Request details retrieved.');
    }

    /**
     * Log a new Right of Access Request (§ 164.524).
     */
    public function create(): void
    {
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);
        $request = new Request();

        $payload = [
            'patient_id' => $request->input('patient_id'),
            'request_date' => $request->input('request_date'),
            'requestor_type' => $request->input('requestor_type'),
            'requestor_name' => $request->input('requestor_name'),
            'requestor_contact' => $request->input('requestor_contact'),
            'request_channel' => $request->input('request_channel'),
            'format_requested' => $request->input('format_requested'),
            'delivery_method' => $request->input('delivery_method'),
            'records_scope' => $request->input('records_scope'),
            'scope_start_date' => $request->input('scope_start_date'),
            'scope_end_date' => $request->input('scope_end_date'),
            'custom_scope_notes' => $request->input('custom_scope_notes'),
            'fee_assessed' => $request->input('fee_assessed'),
            'fee_category' => $request->input('fee_category'),
            'fee_breakdown' => $request->input('fee_breakdown'),
            'notes' => $request->input('notes')
        ];

        $result = $this->service->create($payload, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Grant a single 30-day statutory extension (§ 164.524(b)(2)(ii)).
     */
    public function grantExtension(): void
    {
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Request ID is required.', 422);
            return;
        }

        $payload = [
            'extension_reason' => $request->input('extension_reason'),
            'extension_rationale' => $request->input('extension_rationale')
        ];

        $result = $this->service->grantExtension($id, $payload, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Generate formal written 30-day extension notice letter data (§ 164.524(b)(2)(ii)).
     */
    public function extensionNotice(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Request ID is required.', 422);
            return;
        }

        $result = $this->service->getExtensionNoticeData($id);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], 'Extension notice data generated.');
    }

    /**
     * Compile and export the complete Designated Record Set (DRS) bundle.
     */
    public function bundle(): void
    {
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient ID is required.', 422);
            return;
        }

        $scopeOptions = [
            'records_scope' => $request->input('records_scope'),
            'scope_start_date' => $request->input('scope_start_date'),
            'scope_end_date' => $request->input('scope_end_date')
        ];

        $result = $this->service->compileDrsBundle($patientId, $scopeOptions);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], 'Designated Record Set compiled successfully.');
    }

    /**
     * Fulfill a Right of Access request.
     */
    public function fulfill(): void
    {
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Request ID is required.', 422);
            return;
        }

        $payload = [
            'fulfillment_date' => $request->input('fulfillment_date'),
            'notes' => $request->input('notes')
        ];

        $result = $this->service->fulfillRequest($id, $payload, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Deny a Right of Access request with statutory grounds (§ 164.524(a)).
     */
    public function deny(): void
    {
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Request ID is required.', 422);
            return;
        }

        $payload = [
            'denial_reason' => $request->input('denial_reason'),
            'denial_rationale' => $request->input('denial_rationale')
        ];

        $result = $this->service->denyRequest($id, $payload, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Export active DRS pipeline registry to RFC 4180 CSV for OCR audit review.
     */
    public function exportCsv(): void
    {
        $csv = $this->service->exportRegistryCsv();

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="HIPAA_DRS_Access_Registry_' . date('Ymd_His') . '.csv"');
        header('Pragma: no-cache');
        header('Expires: 0');

        echo $csv;
        exit;
    }
}
