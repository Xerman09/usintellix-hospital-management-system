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

        $data = $request->all();

        if (empty($data['procedure_name'])) {
            $this->error('Procedure Name is required.', 422);
            return;
        }
        if (empty($data['lead_surgeon'])) {
            $this->error('Lead Operating Surgeon is required.', 422);
            return;
        }
        if (empty($data['or_suite_id'])) {
            $this->error('OR Suite selection is required.', 422);
            return;
        }

        $newCase = $this->service->scheduleCase($data, $userId ? (int) $userId : null);
        $this->success($newCase, 'Surgical Case booked and scheduled successfully.', 201);
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

        $updated = $this->service->transitionStage($id, $newStage, $extra);

        if (!$updated) {
            $this->error('Failed to update case stage.', 404);
            return;
        }

        $this->success($updated, "Case transitioned to '{$newStage}' successfully.");
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
        $this->success($res, "OR Suite status updated to '{$status}'.");
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
