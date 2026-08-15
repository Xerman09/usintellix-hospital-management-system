<?php

namespace App\Modules\EncounterCarePlanItems\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\EncounterCarePlanItems\Services\EncounterCarePlanItemService;
use App\Modules\Encounters\Models\Encounter;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class EncounterCarePlanItemController extends Controller
{
    private EncounterCarePlanItemService $encounterCarePlanItemService;
    private ProviderService $providerService;

    private const DETAIL_FIELDS = [
        'author_name', 'item_type', 'code', 'code_text', 'description', 'item_date',
        'target_date', 'end_date', 'status',
        'reason_code', 'reason_status', 'reason_recording_date', 'reason_end_date'
    ];

    public function __construct()
    {
        $this->encounterCarePlanItemService = new EncounterCarePlanItemService();
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

        $this->success($this->encounterCarePlanItemService->list($encounterId), 'Care plan items retrieved successfully.');
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

        $result = $this->encounterCarePlanItemService->store(
            $encounterId,
            $request->only(self::DETAIL_FIELDS),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->encounterCarePlanItemService->find($id);

        if (!$record || !$this->ownsEncounter($user, (int) $record['encounter_id'])) {
            $this->error('Care plan item not found.', 404);
            return;
        }

        $result = $this->encounterCarePlanItemService->update($id, $request->only(self::DETAIL_FIELDS));

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->encounterCarePlanItemService->find($id);

        if (!$record || !$this->ownsEncounter($user, (int) $record['encounter_id'])) {
            $this->error('Care plan item not found.', 404);
            return;
        }

        $result = $this->encounterCarePlanItemService->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    private function ownsEncounter(array $user, int $encounterId): bool
    {
        if (!$encounterId) {
            return false;
        }

        $encounter = (new Encounter())->where('id', $encounterId)->first();

        if (!$encounter || $encounter['deleted_at'] !== null) {
            return false;
        }

        $patient = (new Patient())->where('id', (int) $encounter['patient_id'])->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return false;
        }

        if (($user['role'] ?? '') !== 'doctor') {
            return true;
        }

        $provider = $this->providerService->findByUserId((int) $user['id']);
        $providerId = $provider ? (int) $provider['id'] : 0;

        return (int) $patient['provider_id'] === $providerId;
    }
}
