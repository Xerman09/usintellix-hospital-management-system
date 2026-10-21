<?php

namespace App\Modules\InpatientAdmissions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\InpatientAdmissions\Services\CarePlanService;
use Exception;

class CarePlanController extends Controller
{
    private CarePlanService $service;

    public function __construct()
    {
        $this->service = new CarePlanService();
    }

    /**
     * GET /inpatient-admissions/care-plans
     * List nursing care plans for a specific inpatient admission.
     */
    public function index(): void
    {
        $request = new Request();
        $admissionId = (int) $request->input('admission_id');
        $evalStatus = $request->input('evaluation_status');

        if ($admissionId <= 0) {
            $this->error('Valid Admission ID is required.', 422);
            return;
        }

        try {
            $plans = $this->service->listByAdmission($admissionId, $evalStatus);
            $options = $this->service->options();
            $this->success([
                'plans' => $plans,
                'options' => $options,
            ], 'Nursing care plans retrieved successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /inpatient-admissions/care-plans/show
     * Get single nursing care plan details.
     */
    public function show(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid Care Plan ID is required.', 422);
            return;
        }

        try {
            $plan = $this->service->get($id);
            if (!$plan) {
                $this->error('Nursing care plan not found.', 404);
                return;
            }
            $this->success($plan, 'Nursing care plan retrieved successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /inpatient-admissions/care-plans/options
     * Return NANDA templates, evaluation states, priority levels, and shift options.
     */
    public function options(): void
    {
        try {
            $options = $this->service->options();
            $this->success($options, 'Nursing care plan options retrieved successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /inpatient-admissions/care-plans
     * Create a new structured NANDA nursing care plan.
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $data = $request->all();

        try {
            $result = $this->service->store($data, $userId, $user);
            $this->success($result, 'Nursing care plan documented successfully.', 201);
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/care-plans/update
     * Update an existing nursing care plan.
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $data = $request->all();

        $id = (int) ($data['id'] ?? $request->input('id'));
        if ($id <= 0) {
            $this->error('Valid Care Plan ID is required.', 422);
            return;
        }

        try {
            $this->service->update($id, $data, $userId, $user);
            $this->success(['id' => $id], 'Nursing care plan updated successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/care-plans/evaluate
     * Record shift evaluation status (Goal Met, Partially Met, Unmet/Revised, In Progress) and evaluation notes.
     */
    public function evaluate(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $data = $request->all();

        $id = (int) ($data['id'] ?? $request->input('id'));
        if ($id <= 0) {
            $this->error('Valid Care Plan ID is required.', 422);
            return;
        }

        try {
            $this->service->evaluate($id, $data, $userId, $user);
            $this->success(['id' => $id, 'evaluation_status' => $data['evaluation_status'] ?? ''], 'Shift evaluation recorded successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/care-plans/delete
     * Soft delete a nursing care plan.
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid Care Plan ID is required.', 422);
            return;
        }

        try {
            $this->service->delete($id, $userId);
            $this->success(['id' => $id], 'Nursing care plan removed successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }
}
