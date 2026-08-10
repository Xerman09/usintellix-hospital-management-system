<?php

namespace App\Modules\EncounterSections\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\EncounterSections\Services\EncounterSectionService;
use App\Modules\Encounters\Models\Encounter;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class EncounterSectionController extends Controller
{
    private EncounterSectionService $encounterSectionService;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->encounterSectionService = new EncounterSectionService();
        $this->providerService = new ProviderService();
    }

    /**
     * List all 4 Encounter Summary sections for an encounter.
     */
    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');

        if (!$this->ownsEncounter($user, $encounterId)) {
            $this->error('Encounter not found.', 404);
            return;
        }

        $this->success($this->encounterSectionService->listForEncounter($encounterId), 'Encounter sections retrieved successfully.');
    }

    /**
     * Save a section's free-text content (Clinical Instructions).
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');
        $sectionType = (string) $request->input('section_type');

        if (!$this->ownsEncounter($user, $encounterId)) {
            $this->error('Encounter not found.', 404);
            return;
        }

        $result = $this->encounterSectionService->updateContent(
            $encounterId,
            $sectionType,
            $request->input('content'),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Electronically sign a section.
     */
    public function sign(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');
        $sectionType = (string) $request->input('section_type');

        if (!$this->ownsEncounter($user, $encounterId)) {
            $this->error('Encounter not found.', 404);
            return;
        }

        $result = $this->encounterSectionService->sign(
            $encounterId,
            $sectionType,
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

    /**
     * Delete a section (only permitted before it's ever been signed).
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');
        $sectionType = (string) $request->input('section_type');

        if (!$this->ownsEncounter($user, $encounterId)) {
            $this->error('Encounter not found.', 404);
            return;
        }

        $result = $this->encounterSectionService->remove($encounterId, $sectionType);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Confirm the given encounter exists and, for doctors, belongs to
     * one of their assigned patients.
     */
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
