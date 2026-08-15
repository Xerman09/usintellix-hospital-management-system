<?php

namespace App\Modules\EncounterMiscBillingOptions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\EncounterMiscBillingOptions\Services\EncounterMiscBillingOptionService;
use App\Modules\Encounters\Models\Encounter;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class EncounterMiscBillingOptionController extends Controller
{
    private EncounterMiscBillingOptionService $encounterMiscBillingOptionService;
    private ProviderService $providerService;

    private const DETAIL_FIELDS = [
        'employment_related', 'auto_accident', 'auto_accident_state', 'other_accident',
        'claim_codes', 'epsdt',
        'onset_date', 'onset_date_qualifier', 'other_date', 'other_date_qualifier',
        'unable_to_work_from', 'unable_to_work_to',
        'provider_id', 'provider_qualifier',
        'hospitalization_from', 'hospitalization_to',
        'outside_lab', 'outside_lab_charges',
        'resubmission_code', 'medicaid_original_ref_no', 'prior_authorization_no',
        'x12_replacement_claim', 'x12_claim_frequency', 'x12_icn_resubmission_no',
        'additional_notes'
    ];

    public function __construct()
    {
        $this->encounterMiscBillingOptionService = new EncounterMiscBillingOptionService();
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

        $this->success($this->encounterMiscBillingOptionService->find($encounterId), 'Misc Billing Options retrieved successfully.');
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

        $result = $this->encounterMiscBillingOptionService->save(
            $encounterId,
            $request->only(self::DETAIL_FIELDS),
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
