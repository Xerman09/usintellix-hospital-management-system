<?php

namespace App\Modules\BillingManager\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Encounters\Services\EncounterService;
use App\Modules\Providers\Services\ProviderService;
use App\Modules\Facilities\Services\FacilityService;
use App\Modules\Insurances\Services\InsuranceService;

class BillingManagerController extends Controller
{
    private EncounterService $encounterService;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->encounterService = new EncounterService();
        $this->providerService = new ProviderService();
    }

    /**
     * Practice-wide billing worklist, grouped by patient then encounter
     * (admin, receptionist, or doctor -- doctors only see their own
     * assigned patients' encounters, same scoping rule used everywhere
     * else in the Encounters module). Body/query: { criteria: [...] }
     * where each entry is { type, value } or { type, from, to } for the
     * two date criteria -- see EncounterService::BILLING_CRITERIA_TYPES.
     */
    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $providerId = null;

        if (($user['role'] ?? '') === 'doctor') {
            $provider = $this->providerService->findByUserId((int) $user['id']);
            $providerId = $provider ? (int) $provider['id'] : 0;
        }

        $criteriaRaw = $request->input('criteria', '[]');
        $criteria = is_array($criteriaRaw) ? $criteriaRaw : (json_decode((string) $criteriaRaw, true) ?: []);

        $result = $this->encounterService->listBillableGrouped($criteria, $providerId);

        $this->success($result, 'Billing worklist retrieved successfully.');
    }

    /**
     * Bundled catalogs for the "Choose Criteria" value pickers (Provider,
     * Facility, Insurance Company) -- reachable by all three Billing
     * Manager roles including doctor, unlike /insurances directly which
     * is admin/receptionist only.
     */
    public function criteriaOptions(): void
    {
        $result = [
            'providers' => [],
            'facilities' => [],
            'insurances' => []
        ];

        try {
            $result['providers'] = $this->providerService->list();
        } catch (\Throwable $e) {
            error_log('billing-manager criteriaOptions: providers failed: ' . $e->getMessage());
        }

        try {
            $result['facilities'] = (new FacilityService())->list();
        } catch (\Throwable $e) {
            error_log('billing-manager criteriaOptions: facilities failed: ' . $e->getMessage());
        }

        try {
            $result['insurances'] = (new InsuranceService())->list();
        } catch (\Throwable $e) {
            error_log('billing-manager criteriaOptions: insurances failed: ' . $e->getMessage());
        }

        $this->success($result, 'Criteria options retrieved successfully.');
    }

    /**
     * "Mark as Cleared" -- bulk-sets bill_status = cleared for the given
     * encounter ids. Body: { encounter_ids: [...] }
     */
    public function markCleared(): void
    {
        $this->bulkSetBillStatus('cleared');
    }

    /**
     * "Re-Open" -- bulk-sets bill_status back to unassigned.
     * Body: { encounter_ids: [...] }
     */
    public function reopen(): void
    {
        $this->bulkSetBillStatus('unassigned');
    }

    private function bulkSetBillStatus(string $status): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterIds = (array) $request->input('encounter_ids', []);

        $result = $this->encounterService->setBillStatus($encounterIds, $status, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Sets the manually-tracked X12 status label for one encounter/claim.
     * Body: { encounter_id, x12_status }
     */
    public function updateX12Status(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $encounterId = (int) $request->input('encounter_id');

        if (!$encounterId) {
            $this->error('Encounter is required.', 422);
            return;
        }

        $result = $this->encounterService->setX12Status(
            $encounterId,
            (string) $request->input('x12_status', 'unassigned'),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }
}
