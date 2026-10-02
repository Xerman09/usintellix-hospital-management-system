<?php

namespace App\Modules\Phq9\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Phq9\Services\Phq9Service;
use App\Modules\Encounters\Models\Encounter;
use App\Core\PhiAccessGuard;

class Phq9Controller extends Controller
{
    private Phq9Service $phq9Service;

    public function __construct()
    {
        $this->phq9Service = new Phq9Service();
    }

    /**
     * Retrieve PHQ-9 for an encounter.
     */
    public function show(): void
    {
        $request = new Request();
        $user    = Session::get('user');
        if (!is_array($user)) {
            $user = [];
        }

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

        if (!empty($user)) {
            PhiAccessGuard::assertPatientAccess($user, (int) $encounter['patient_id'], false);
        }

        $data = $this->phq9Service->getOrCreate($encounterId, (int) $encounter['patient_id']);

        $this->success($data, 'PHQ-9 retrieved successfully.');
    }

    /**
     * Save PHQ-9 for an encounter.
     */
    public function save(): void
    {
        $request = new Request();
        $user    = Session::get('user');
        if (!is_array($user)) {
            $user = [];
        }

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

        if (!empty($user)) {
            PhiAccessGuard::assertPatientAccess($user, (int) $encounter['patient_id'], true);
        }

        $payload = $request->all();
        $result  = $this->phq9Service->save(
            $encounterId,
            (int) $encounter['patient_id'],
            $payload,
            (int) ($user['id'] ?? 1)
        );

        if (!$result['success']) {
            $this->error($result['message'] ?? 'Failed to save PHQ-9.', 400);
            return;
        }

        $this->success($result['data'], $result['message']);
    }
}
