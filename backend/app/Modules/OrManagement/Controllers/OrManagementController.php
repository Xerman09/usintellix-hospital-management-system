<?php

namespace App\Modules\OrManagement\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\OrManagement\Services\OrManagementService;

class OrManagementController extends Controller
{
    private OrManagementService $service;

    public function __construct()
    {
        $this->service = new OrManagementService();
    }

    /**
     * GET /or-management/schedule
     */
    public function schedule(): void
    {
        $request = new Request();
        $filters = [
            'date'      => $request->input('date'),
            'suite_id'  => $request->input('suite_id'),
            'specialty' => $request->input('specialty'),
            'stage'     => $request->input('stage'),
            'priority'  => $request->input('priority'),
            'surgeon'   => $request->input('surgeon'),
            'search'    => $request->input('search'),
        ];

        $data = $this->service->getSchedule($filters);
        $this->success($data, 'Operating Room schedule retrieved successfully.');
    }

    /**
     * GET /or-management/suites
     */
    public function suites(): void
    {
        $data = $this->service->getSuites();
        $this->success($data, 'OR Suites retrieved successfully.');
    }

    /**
     * GET /or-management/details?id={id}
     */
    public function details(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid Surgical Case ID is required.', 400);
            return;
        }

        $case = $this->service->getCaseDetails($id);
        if (!$case) {
            $this->error('Surgical Case not found.', 404);
            return;
        }

        $this->success($case, 'Surgical Case details retrieved successfully.');
    }

    /**
     * POST /or-management/cases
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = $user['id'] ?? null;

        $result = $this->service->scheduleCase($request->all(), $userId ? (int) $userId : null);

        if (!$result['success']) {
            $this->scheduleError($result);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /** Booking errors carry conflicts, or warnings to confirm (needs_ack). */
    private function scheduleError(array $result): void
    {
        $this->json([
            'success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null,
            'needs_ack' => !empty($result['needs_ack']), 'warnings' => $result['warnings'] ?? [], 'conflicts' => $result['conflicts'] ?? []
        ], !empty($result['not_found']) ? 404 : 422);
    }

    /**
     * GET /or-management/options -- specializations, surgery types and staff for booking.
     */
    public function options(): void
    {
        $this->success($this->service->options(), 'Options retrieved successfully.');
    }

    /**
     * POST /or-management/cases/update
     */
    public function update(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid Surgical Case ID is required.', 400);
            return;
        }

        $data = $request->all();
        $updated = $this->service->updateCase($id, $data);

        if (!$updated) {
            $this->error('Failed to update surgical case.', 404);
            return;
        }

        $this->success($updated, 'Surgical Case updated successfully.');
    }

    /**
     * POST /or-management/cases/stage
     */
    public function stage(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');
        $newStage = trim((string) $request->input('perioperative_stage'));

        if ($id <= 0 || empty($newStage)) {
            $this->error('Valid Case ID and Perioperative Stage are required.', 422);
            return;
        }

        $extra = [
            'pacu_bed_no'             => $request->input('pacu_bed_no'),
            'pacu_aldrete_score'      => $request->input('pacu_aldrete_score'),
            'postop_disposition'      => $request->input('postop_disposition'),
            'estimated_blood_loss_ml' => $request->input('estimated_blood_loss_ml'),
            'postop_diagnosis'        => $request->input('postop_diagnosis'),
            'cancellation_reason'     => $request->input('cancellation_reason'),
        ];

        $result = $this->service->transitionStage($id, $newStage, $extra, (int) (Session::get('user')['id'] ?? 0) ?: null);

        if (!$result['success']) {
            $this->scheduleError($result);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * POST /or-management/suites/status
     */
    public function suiteStatus(): void
    {
        $request = new Request();
        $suiteId = (int) $request->input('suite_id');
        $status = trim((string) $request->input('status'));

        if ($suiteId <= 0 || empty($status)) {
            $this->error('Suite ID and status are required.', 422);
            return;
        }

        $res = $this->service->updateSuiteStatus($suiteId, $status);
        if (!$res['success']) {
            $this->error($res['message'], 422);
            return;
        }
        $this->success($res['data'], "OR Suite status updated to '{$status}'.");
    }

    /**
     * POST /or-management/suites
     */
    public function createSuite(): void
    {
        $request = new Request();
        $data = $request->all();

        if (empty($data['suite_name'])) {
            $this->error('Suite Name is required.', 422);
            return;
        }

        $suite = $this->service->createSuite($data);
        $this->success($suite, 'OR Suite registered successfully.', 201);
    }

    /**
     * POST /or-management/suites/update
     */
    public function updateSuite(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if ($id <= 0) {
            $this->error('Valid Suite ID is required.', 400);
            return;
        }

        $data = $request->all();
        $suite = $this->service->updateSuite($id, $data);
        if (!$suite) {
            $this->error('OR Suite not found.', 404);
            return;
        }

        $this->success($suite, 'OR Suite configuration updated successfully.');
    }
}
