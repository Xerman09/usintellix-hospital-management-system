<?php

namespace App\Modules\InpatientAdmissions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\InpatientAdmissions\Services\ShiftHandoverService;
use Exception;

class ShiftHandoverController extends Controller
{
    private ShiftHandoverService $service;

    public function __construct()
    {
        $this->service = new ShiftHandoverService();
    }

    /**
     * GET /inpatient-admissions/shift-handovers
     * List SBAR nurse shift handovers and summary for an inpatient admission.
     */
    public function index(): void
    {
        $request = new Request();
        $admissionId = (int) $request->input('admission_id');
        $statusFilter = $request->input('status');

        if ($admissionId <= 0) {
            $this->error('Valid Admission ID is required.', 422);
            return;
        }

        try {
            $data = $this->service->getHandoversByAdmission($admissionId, $statusFilter);
            $this->success($data, 'SBAR shift handovers retrieved successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /inpatient-admissions/shift-handovers/show
     * Get single SBAR shift handover record.
     */
    public function show(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid Handover ID is required.', 422);
            return;
        }

        try {
            $handover = $this->service->getHandoverById($id);
            if (!$handover) {
                $this->error('Shift handover record not found.', 404);
                return;
            }
            $this->success($handover, 'Shift handover record retrieved successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /inpatient-admissions/shift-handovers
     * Create a new SBAR nurse shift handover with outgoing nurse sign-off (and optional immediate incoming dual sign-off).
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $data = $request->all();

        try {
            $record = $this->service->createHandover($data, $userId);
            $this->success($record, 'SBAR shift handover documented and signed successfully.', 201);
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/shift-handovers/update
     * Update an existing SBAR shift handover.
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $data = $request->all();

        $id = (int) ($data['id'] ?? $request->input('id'));
        if ($id <= 0) {
            $this->error('Valid Handover ID is required.', 422);
            return;
        }

        try {
            $record = $this->service->updateHandover($id, $data, $userId);
            $this->success($record, 'SBAR shift handover updated successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/shift-handovers/sign-incoming
     * Incoming nurse bedside digital sign-off (dual sign-off completion or clarification request).
     */
    public function signIncoming(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $data = $request->all();

        $id = (int) ($data['id'] ?? $request->input('id'));
        if ($id <= 0) {
            $this->error('Valid Handover ID is required.', 422);
            return;
        }

        try {
            $record = $this->service->signOffIncoming($id, $data, $userId);
            $this->success($record, 'Incoming nurse digital sign-off completed.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/shift-handovers/delete
     * Delete a shift handover record.
     */
    public function destroy(): void
    {
        $request = new Request();
        $data = $request->all();
        $id = (int) ($data['id'] ?? $request->input('id'));

        if ($id <= 0) {
            $this->error('Valid Handover ID is required.', 422);
            return;
        }

        try {
            $this->service->deleteHandover($id);
            $this->success(['id' => $id], 'Shift handover record deleted successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }
}
