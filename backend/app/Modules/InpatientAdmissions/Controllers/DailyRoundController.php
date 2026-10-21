<?php

namespace App\Modules\InpatientAdmissions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\InpatientAdmissions\Services\DailyRoundService;
use Exception;

class DailyRoundController extends Controller
{
    private DailyRoundService $service;

    public function __construct()
    {
        $this->service = new DailyRoundService();
    }

    /**
     * GET /inpatient-admissions/daily-rounds
     * List all daily ward rounds for a specific admission.
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
            $rounds = $this->service->listByAdmission($admissionId);
            $options = $this->service->options();
            $this->success([
                'rounds' => $rounds,
                'options' => $options,
            ], 'Daily rounds retrieved successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /inpatient-admissions/daily-rounds/show
     * Get single round details.
     */
    public function show(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid Round ID is required.', 422);
            return;
        }

        try {
            $round = $this->service->get($id);
            if (!$round) {
                $this->error('Daily ward round not found.', 404);
                return;
            }
            $this->success($round, 'Daily round retrieved successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * GET /inpatient-admissions/daily-rounds/options
     * Return available clinical trajectories, diet orders, and activity orders.
     */
    public function options(): void
    {
        try {
            $options = $this->service->options();
            $this->success($options, 'Daily round options retrieved successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 500);
        }
    }

    /**
     * POST /inpatient-admissions/daily-rounds
     * Create a new daily ward round clinical record.
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $data = $request->all();

        try {
            $result = $this->service->store($data, $userId, $user);
            $this->success($result, 'Daily ward round documented successfully.', 201);
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/daily-rounds/update
     * Update an existing daily ward round.
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $data = $request->all();

        $id = (int) ($data['id'] ?? $request->input('id'));
        if ($id <= 0) {
            $this->error('Valid Round ID is required.', 422);
            return;
        }

        try {
            $this->service->update($id, $data, $userId);
            $this->success(['id' => $id], 'Daily ward round updated successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }

    /**
     * POST /inpatient-admissions/daily-rounds/delete
     * Soft delete a daily ward round.
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? [];
        $userId = !empty($user['id']) ? (int) $user['id'] : null;
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid Round ID is required.', 422);
            return;
        }

        try {
            $this->service->delete($id, $userId);
            $this->success(['id' => $id], 'Daily ward round removed successfully.');
        } catch (Exception $e) {
            $this->error($e->getMessage(), 422);
        }
    }
}
