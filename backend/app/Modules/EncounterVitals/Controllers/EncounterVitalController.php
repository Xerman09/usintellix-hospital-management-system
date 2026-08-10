<?php

namespace App\Modules\EncounterVitals\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\EncounterVitals\Services\EncounterVitalService;
use App\Modules\Encounters\Models\Encounter;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class EncounterVitalController extends Controller
{
    private EncounterVitalService $encounterVitalService;
    private ProviderService $providerService;

    private const DETAIL_FIELDS = [
        'height_cm', 'weight_kg', 'oxygen_saturation', 'oxygen_flow_rate', 'inhaled_oxygen_concentration'
    ];

    public function __construct()
    {
        $this->encounterVitalService = new EncounterVitalService();
        $this->providerService = new ProviderService();
    }

    public function show(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');

        if (!$this->ownsEncounter($user, $encounterId)) {
            $this->error('Encounter not found.', 404);
            return;
        }

        $this->success($this->encounterVitalService->find($encounterId), 'Vitals retrieved successfully.');
    }

    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');

        if (!$this->ownsEncounter($user, $encounterId)) {
            $this->error('Encounter not found.', 404);
            return;
        }

        $result = $this->encounterVitalService->save(
            $encounterId,
            $request->only(self::DETAIL_FIELDS),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
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
