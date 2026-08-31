<?php

namespace App\Modules\PatientMerge\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientMerge\Services\PatientMergeService;

class PatientMergeController extends Controller
{
    private PatientMergeService $service;

    public function __construct()
    {
        $this->service = new PatientMergeService();
    }

    /**
     * GET /patient-merge/validate?target_patient_id=X&source_patient_id=Y
     * Checks the pair without merging anything -- used to enable/disable
     * the Merge buttons and show why a pair can't be merged.
     */
    public function validatePair(): void
    {
        $request = new Request();
        $targetId = (int) $request->input('target_patient_id');
        $sourceId = (int) $request->input('source_patient_id');

        $result = $this->service->validate($targetId, $sourceId);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    public function merge(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $targetId = (int) $request->input('target_patient_id');
        $sourceId = (int) $request->input('source_patient_id');
        $dedupe = (bool) $request->input('dedupe_encounters', false);

        $result = $this->service->merge($targetId, $sourceId, $dedupe, (int) $user['id']);

        if (!$result['success']) {
            $status = !empty($result['errors']) ? 422 : 500;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message']);
    }
}
