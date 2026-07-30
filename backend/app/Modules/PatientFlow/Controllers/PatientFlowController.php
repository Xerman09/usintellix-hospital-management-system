<?php

namespace App\Modules\PatientFlow\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientFlow\Services\PatientFlowService;

class PatientFlowController extends Controller
{
    private PatientFlowService $patientFlowService;

    public function __construct()
    {
        $this->patientFlowService = new PatientFlowService();
    }

    /**
     * List the flow board. Query: ?from=&to=&visit_category_id=&facility_id=&provider_id=&stage=&search=
     * Defaults to today only when no range is given.
     */
    public function index(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $filters = [
            'from' => $request->input('from'),
            'to' => $request->input('to'),
            'visit_category_id' => $request->input('visit_category_id'),
            'facility_id' => $request->input('facility_id'),
            'provider_id' => $request->input('provider_id'),
            'stage' => $request->input('stage'),
            'search' => $request->input('search')
        ];

        $flow = $this->patientFlowService->list($user, $filters);

        $this->success($flow, 'Patient flow retrieved successfully.');
    }

    /**
     * Check a scheduled patient in for today's visit.
     */
    public function checkIn(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $data = $request->only(['appointment_id']);

        $result = $this->patientFlowService->checkIn($data, $user);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Move a checked-in patient to a different stage and/or room.
     */
    public function updateStatusRoom(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $stage = (string) $request->input('stage');
        $roomId = $request->input('room_id') ? (int) $request->input('room_id') : null;

        $result = $this->patientFlowService->updateStatusRoom($id, $stage, $roomId, $user);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Toggle the drug-screen-completed checkbox.
     */
    public function updateDrugScreen(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $completed = (bool) $request->input('completed');

        $result = $this->patientFlowService->updateDrugScreen($id, $completed, $user);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Remove a patient from the board (undo check-in).
     */
    public function destroy(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->patientFlowService->remove($id, $user);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
