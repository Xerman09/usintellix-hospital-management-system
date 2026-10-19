<?php

namespace App\Modules\VisitorManagement\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\VisitorManagement\Services\VisitorPassService;

class VisitorPassController extends Controller
{
    private VisitorPassService $service;

    public function __construct()
    {
        $this->service = new VisitorPassService();
    }

    /**
     * List all visitor passes with optional filtering.
     */
    public function index(): void
    {
        $request = new Request();
        $filters = [
            'status'       => $request->input('status'),
            'ward_id'      => $request->input('ward_id'),
            'admission_id' => $request->input('admission_id'),
            'date'         => $request->input('date'),
            'search'       => $request->input('search')
        ];

        $passes = $this->service->listPasses($filters);
        $this->success($passes, 'Visitor passes retrieved successfully.');
    }

    /**
     * Get live active visitors for real-time security console.
     */
    public function active(): void
    {
        $request = new Request();
        $wardId = $request->input('ward_id') ? (int) $request->input('ward_id') : null;
        $search = $request->input('search');

        $active = $this->service->getActiveVisitors($wardId, $search);
        $this->success($active, 'Active visitors retrieved successfully.');
    }

    /**
     * Get visitor security dashboard KPIs & ward distribution.
     */
    public function stats(): void
    {
        $stats = $this->service->getDashboardStats();
        $this->success($stats, 'Visitor dashboard statistics retrieved successfully.');
    }

    /**
     * Get list of currently admitted inpatients for pass issuance modal.
     */
    public function admissionsOptions(): void
    {
        $request = new Request();
        $search = $request->input('search');

        $admissions = $this->service->getActiveAdmissionsForDropdown($search);
        $this->success($admissions, 'Active admissions retrieved successfully.');
    }

    /**
     * Issue a new hospital visitor pass.
     */
    public function issue(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'username' => 'security'];

        $data = [
            'visitor_name'            => $request->input('visitor_name'),
            'id_document_type'        => $request->input('id_document_type'),
            'id_document_number'      => $request->input('id_document_number'),
            'phone'                   => $request->input('phone'),
            'email'                   => $request->input('email'),
            'admission_id'            => $request->input('admission_id'),
            'relationship_to_patient' => $request->input('relationship_to_patient'),
            'duration_minutes'        => $request->input('duration_minutes'),
            'is_emergency_exception'  => $request->input('is_emergency_exception'),
            'notes'                   => $request->input('notes')
        ];

        $result = $this->service->issuePass($data, $user);

        if (!$result['success']) {
            $status = ($result['code'] ?? '') === 'BEDSIDE_QUOTA_EXCEEDED' ? 409 : 422;
            $this->error($result['message'], $status, $result);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Check out a visitor pass (by ID or barcode/pass number).
     */
    public function checkOut(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'username' => 'security'];

        $passId = $request->input('pass_id');
        $barcode = $request->input('barcode') ?: $request->input('pass_number');

        $identifier = $passId ?: $barcode;

        if (empty($identifier)) {
            $this->error('Pass ID or barcode / pass number is required.', 422);
            return;
        }

        $result = $this->service->checkOutPass($identifier, $user);

        if (!$result['success']) {
            $this->error($result['message'], 400);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Scan / verify barcode at security checkpoints.
     */
    public function verify(): void
    {
        $request = new Request();
        $barcode = $request->input('barcode') ?: $request->input('pass_number');

        if (empty($barcode)) {
            $this->error('Barcode or pass number is required for verification.', 422);
            return;
        }

        $result = $this->service->verifyPass(trim((string) $barcode));

        if (!$result['success']) {
            $this->error($result['message'], 404, $result);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Revoke a visitor pass.
     */
    public function revoke(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'username' => 'security'];

        $passId = (int) $request->input('pass_id');
        $reason = trim((string) $request->input('reason', 'Security Policy Violation'));

        if (!$passId) {
            $this->error('Pass ID is required.', 422);
            return;
        }

        $result = $this->service->revokePass($passId, $reason, $user);

        if (!$result['success']) {
            $this->error($result['message'], 400);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Render printable thermal visitor badge.
     */
    public function badge(): void
    {
        $request = new Request();
        $passId = (int) $request->input('pass_id');

        if (!$passId) {
            echo "Pass ID is required.";
            exit;
        }

        $html = $this->service->generateThermalBadgeHtml($passId);

        header('Content-Type: text/html; charset=utf-8');
        echo $html;
        exit;
    }
}
