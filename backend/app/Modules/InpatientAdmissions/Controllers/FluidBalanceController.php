<?php

namespace App\Modules\InpatientAdmissions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\InpatientAdmissions\Services\FluidBalanceService;
use Exception;

class FluidBalanceController extends Controller
{
    private FluidBalanceService $service;

    public function __construct()
    {
        $this->service = new FluidBalanceService();
    }

    /**
     * GET /inpatient-admissions/fluid-balance
     * List 24-hour fluid balance entries and running summary for an inpatient admission.
     */
    public function index(): void
    {
        $request = new Request();
        $admissionId = (int) $request->input('admission_id');

        if ($admissionId <= 0) {
            $this->error('Valid Admission ID is required.', 422);
            return;
        }

        try {
            $data = $this->service->listByAdmission($admissionId);
            $this->success($data, '24-hour fluid balance records retrieved successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /inpatient-admissions/fluid-balance/show
     * Get single fluid balance entry details.
     */
    public function show(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid Entry ID is required.', 422);
            return;
        }

        try {
            $entry = $this->service->get($id);
            if (!$entry) {
                $this->error('Fluid balance entry not found.', 404);
                return;
            }
            $this->success($entry, 'Fluid balance entry retrieved successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /inpatient-admissions/fluid-balance
     * Record a new Intake & Output (I&O) fluid balance entry.
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $data = $request->all();

        try {
            $result = $this->service->store($data, $userId, $user);
            $this->success($result, 'Fluid intake & output recorded successfully.', 201);
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/fluid-balance/update
     * Update an existing fluid balance entry.
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $data = $request->all();

        $id = (int) ($data['id'] ?? $request->input('id'));
        if ($id <= 0) {
            $this->error('Valid Entry ID is required.', 422);
            return;
        }

        try {
            $this->service->update($id, $data, $userId);
            $this->success(['id' => $id], 'Fluid balance entry updated successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/fluid-balance/delete
     * Soft delete a fluid balance entry.
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid Entry ID is required.', 422);
            return;
        }

        try {
            $this->service->delete($id, $userId);
            $this->success(['id' => $id], 'Fluid balance entry removed successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }
}
