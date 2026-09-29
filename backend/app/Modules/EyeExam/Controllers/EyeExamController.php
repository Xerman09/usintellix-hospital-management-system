<?php

namespace App\Modules\EyeExam\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\EyeExam\Services\EyeExamService;
use App\Modules\Encounters\Models\Encounter;
use App\Core\PhiAccessGuard;

class EyeExamController extends Controller
{
    private EyeExamService $eyeExamService;

    public function __construct()
    {
        $this->eyeExamService = new EyeExamService();
    }

    /**
     * Retrieve eye exam for an encounter.
     */
    public function show(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');
        if (!$encounterId) {
            $this->error('Encounter ID is required.', 422);
            return;
        }

        $encounter = (new Encounter())->where('id', $encounterId)->first();
        if (!$encounter) {
            $this->error('Encounter not found.', 404);
            return;
        }

        PhiAccessGuard::assertPatientAccess($user, (int) $encounter['patient_id'], false);

        $data = $this->eyeExamService->getOrCreate($encounterId, (int) $encounter['patient_id']);

        $this->success($data, 'Eye exam retrieved successfully.');
    }

    /**
     * Save eye exam for an encounter.
     */
    public function save(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');
        if (!$encounterId) {
            $this->error('Encounter ID is required.', 422);
            return;
        }

        $encounter = (new Encounter())->where('id', $encounterId)->first();
        if (!$encounter) {
            $this->error('Encounter not found.', 404);
            return;
        }

        PhiAccessGuard::assertPatientAccess($user, (int) $encounter['patient_id'], true);

        $payload = $request->all();
        $result = $this->eyeExamService->save(
            $encounterId,
            (int) $encounter['patient_id'],
            $payload,
            (int) ($user['id'] ?? 1)
        );

        if (!$result['success']) {
            $this->error($result['message'] ?? 'Failed to save eye exam.', 400);
            return;
        }

        $this->success($result['data'], $result['message']);
    }
}
