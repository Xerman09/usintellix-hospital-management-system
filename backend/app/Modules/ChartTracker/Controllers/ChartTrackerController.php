<?php

namespace App\Modules\ChartTracker\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\ChartTracker\Services\ChartTrackerService;

class ChartTrackerController extends Controller
{
    private ChartTrackerService $chartTrackerService;

    public function __construct()
    {
        $this->chartTrackerService = new ChartTrackerService();
    }

    /**
     * Look up a patient by ID/patient number and report their chart's
     * current location.
     */
    public function lookup(): void
    {
        $request = new Request();

        $result = $this->chartTrackerService->lookup((string) $request->input('patient_id', ''));

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success($result['data']);
    }

    /**
     * Check a patient's chart in to a new location.
     */
    public function checkIn(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $patientId = (int) $request->input('patient_id');
        $destination = (string) $request->input('destination', '');

        $result = $this->chartTrackerService->checkIn($patientId, $destination, $user['id'] ?? null);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }
}
