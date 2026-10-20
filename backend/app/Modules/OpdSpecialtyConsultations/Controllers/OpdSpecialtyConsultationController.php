<?php

namespace App\Modules\OpdSpecialtyConsultations\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Core\PhiAccessGuard;
use App\Modules\Encounters\Models\Encounter;
use App\Modules\OpdSpecialtyConsultations\Services\OpdSpecialtyConsultationService;

class OpdSpecialtyConsultationController extends Controller
{
    private OpdSpecialtyConsultationService $service;

    public function __construct()
    {
        $this->service = new OpdSpecialtyConsultationService();
    }

    /**
     * Get active OPD consultation templates (OB/GYN, Pediatrics, Orthopedics, General).
     */
    public function templates(): void
    {
        $templates = $this->service->listTemplates();
        $this->success($templates, 'OPD consultation templates retrieved successfully.');
    }

    /**
     * Get specialty consultation data by encounter_id or soap_note_id.
     */
    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');
        $soapNoteId = (int) $request->input('soap_note_id');

        if ($soapNoteId > 0) {
            $record = $this->service->getBySoapNote($soapNoteId);
            $this->success($record, 'Specialty consultation data retrieved successfully.');
            return;
        }

        if (!$encounterId) {
            $this->error('Encounter ID is required.', 422);
            return;
        }

        $records = $this->service->getByEncounter($encounterId);
        $this->success($records, 'Specialty consultation data retrieved successfully.');
    }

    /**
     * Store specialty consultation data for an encounter.
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');
        $soapNoteId = $request->input('soap_note_id') ? (int) $request->input('soap_note_id') : null;

        if (!$encounterId) {
            $this->error('Encounter ID is required.', 422);
            return;
        }

        $encounter = (new Encounter())->where('id', $encounterId)->first();
        if (!$encounter || $encounter['deleted_at'] !== null) {
            $this->error('Encounter not found.', 404);
            return;
        }

        PhiAccessGuard::assertPatientAccess($user, (int) $encounter['patient_id'], true);

        $payload = $request->all();
        $result = $this->service->store($encounterId, $payload, (int) $user['id'], $soapNoteId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update specialty consultation data.
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        if (!$id) {
            $this->error('ID is required.', 422);
            return;
        }

        $existing = $this->service->find($id);
        if (!$existing) {
            $this->error('Specialty consultation record not found.', 404);
            return;
        }

        $encounter = (new Encounter())->where('id', (int) $existing['encounter_id'])->first();
        if ($encounter) {
            PhiAccessGuard::assertPatientAccess($user, (int) $encounter['patient_id'], true);
        }

        $payload = $request->all();
        $result = $this->service->update($id, $payload, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft delete specialty consultation data.
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        if (!$id) {
            $this->error('ID is required.', 422);
            return;
        }

        $result = $this->service->delete($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }
}
