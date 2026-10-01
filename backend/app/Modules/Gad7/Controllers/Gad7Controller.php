<?php

namespace App\Modules\Gad7\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Gad7\Services\Gad7Service;
use App\Modules\Encounters\Models\Encounter;
use App\Core\PhiAccessGuard;

class Gad7Controller extends Controller
{
    private Gad7Service $gad7Service;

    public function __construct()
    {
        $this->gad7Service = new Gad7Service();
    }

    /**
     * Retrieve GAD-7 for an encounter.
     */
    public function show(): void
    {
        $request = new Request();
        $user = Session::get('user');
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

        $data = $this->gad7Service->getOrCreate($encounterId, (int) $encounter['patient_id']);

        $this->success($data, 'GAD-7 retrieved successfully.');
    }

    /**
     * Save GAD-7 for an encounter.
     */
    public function save(): void
    {
        $request = new Request();
        $user = Session::get('user');
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
        $result = $this->gad7Service->save(
            $encounterId,
            (int) $encounter['patient_id'],
            $payload,
            (int) ($user['id'] ?? 1)
        );

        if (!$result['success']) {
            $this->error($result['message'] ?? 'Failed to save GAD-7.', 400);
            return;
        }

        $this->success($result['data'], $result['message']);
    }
}
