<?php

namespace App\Modules\EncounterSoapNotes\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\EncounterSoapNotes\Services\EncounterSoapNoteService;
use App\Modules\Encounters\Models\Encounter;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;
use App\Core\PhiAccessGuard;

class EncounterSoapNoteController extends Controller
{
    private EncounterSoapNoteService $encounterSoapNoteService;
    private ProviderService $providerService;

    private const DETAIL_FIELDS = ['subjective', 'objective', 'assessment', 'plan'];

    public function __construct()
    {
        $this->encounterSoapNoteService = new EncounterSoapNoteService();
        $this->providerService = new ProviderService();
    }

    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');

        if (!$this->ownsEncounter($user, $encounterId)) {
            $this->error('Encounter not found.', 404);
            return;
        }

        $this->success($this->encounterSoapNoteService->list($encounterId), 'SOAP notes retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');

        if (!$this->ownsEncounter($user, $encounterId)) {
            $this->error('Encounter not found.', 404);
            return;
        }

        $result = $this->encounterSoapNoteService->store(
            $encounterId,
            $request->only(self::DETAIL_FIELDS),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $note = $this->encounterSoapNoteService->find($id);

        if (!$note || !$this->ownsEncounter($user, (int) $note['encounter_id'])) {
            $this->error('SOAP note not found.', 404);
            return;
        }

        $result = $this->encounterSoapNoteService->update(
            $id,
            $request->only(self::DETAIL_FIELDS),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $note = $this->encounterSoapNoteService->find($id);

        if (!$note || !$this->ownsEncounter($user, (int) $note['encounter_id'])) {
            $this->error('SOAP note not found.', 404);
            return;
        }

        $result = $this->encounterSoapNoteService->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function sign(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $note = $this->encounterSoapNoteService->find($id);

        if (!$note || !$this->ownsEncounter($user, (int) $note['encounter_id'])) {
            $this->error('SOAP note not found.', 404);
            return;
        }

        $result = $this->encounterSoapNoteService->sign(
            $id,
            (string) $request->input('password', ''),
            $request->input('amendment'),
            $user
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    private function ownsEncounter(array $user, int $encounterId): bool
    {
        PhiAccessGuard::assertClinicalAccess($user, 'SOAP notes');

        if (!$encounterId) {
            return false;
        }

        $encounter = (new Encounter())->where('id', $encounterId)->first();

        if (!$encounter || $encounter['deleted_at'] !== null) {
            return false;
        }

        $patientId = (int) $encounter['patient_id'];

        // Enforce patient assignment / break-glass and sensitivity
        PhiAccessGuard::assertPatientAccess($user, $patientId, true);
        PhiAccessGuard::assertSensitivityAccess($user, $encounter['sensitivity'] ?? null, $patientId);

        return true;
    }
}
