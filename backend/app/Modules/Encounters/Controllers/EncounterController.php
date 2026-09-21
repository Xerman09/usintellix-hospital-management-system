<?php

namespace App\Modules\Encounters\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Encounters\Services\EncounterService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;
use App\Modules\VisitCategories\Services\VisitCategoryService;
use App\Modules\Classes\Services\ClassService;
use App\Modules\VisitTypes\Services\VisitTypeService;
use App\Modules\Facilities\Services\FacilityService;
use App\Modules\DischargeDispositions\Services\DischargeDispositionService;
use App\Core\PhiAccessGuard;

class EncounterController extends Controller
{
    private EncounterService $encounterService;
    private ProviderService $providerService;

    private const DETAIL_FIELDS = [
        'visit_category_id', 'class_id', 'visit_type_id', 'sensitivity',
        'encounter_provider_id', 'referring_provider_id', 'facility_id',
        'billing_facility_id', 'date_of_service', 'onset_date', 'in_collection',
        'discharge_disposition_id', 'reason_for_visit'
    ];

    public function __construct()
    {
        $this->encounterService = new EncounterService();
        $this->providerService = new ProviderService();
    }

    /**
     * List a patient's recorded encounters.
     */
    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        PhiAccessGuard::assertPatientAccess($user, $patientId, false);

        $encounters = $this->encounterService->list($patientId);

        // Under HIPAA § 164.502(b), non-clinical personnel cannot view sensitive psychiatric/clinical encounters
        if (!PhiAccessGuard::isClinicalRole($user['role'] ?? null)) {
            $encounters = array_values(array_filter($encounters, function ($enc) {
                $sens = strtolower(trim((string) ($enc['sensitivity'] ?? '')));
                return $sens !== 'sensitive' && $sens !== 'very sensitive';
            }));
        }

        $this->success($encounters, 'Patient encounters retrieved successfully.');
    }

    /**
     * Get a comprehensive transfer summary of patient encounters for hospital transfer.
     */
    public function transferSummary(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        PhiAccessGuard::assertClinicalAccess($user, 'clinical transfer summary');
        PhiAccessGuard::assertPatientAccess($user, $patientId, true);

        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        $encounterIdsRaw = $request->input('encounter_ids');

        $encounterIds = null;
        if (!empty($encounterIdsRaw)) {
            if (is_array($encounterIdsRaw)) {
                $encounterIds = array_map('intval', $encounterIdsRaw);
            } else {
                $encounterIds = array_map('intval', explode(',', (string) $encounterIdsRaw));
            }
            $encounterIds = array_values(array_filter($encounterIds, fn($id) => $id > 0));
        }

        $data = $this->encounterService->getTransferSummary(
            $patientId,
            $dateFrom ?: null,
            $dateTo ?: null,
            $encounterIds ?: null
        );

        $this->success($data, 'Encounter transfer summary retrieved successfully.');
    }

    /**
     * The patient's existing allergies/problems/medications/health
     * concerns, for the "Link Issues to This Visit" picker.
     */
    public function issuesIndex(): void
    {
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        $issues = $this->encounterService->listLinkableIssues($patientId);

        $this->success($issues, 'Linkable issues retrieved successfully.');
    }

    /**
     * Popups > Issues' click-to-relate action -- links one issue to one
     * encounter. See EncounterService::linkIssue() for why this is
     * separate from update()'s full issues/billing-codes resync.
     */
    public function linkIssue(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $result = $this->encounterService->linkIssue(
            (int) $request->input('encounter_id'),
            (string) $request->input('issue_type'),
            (int) $request->input('issue_id'),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function unlinkIssue(): void
    {
        $request = new Request();

        $result = $this->encounterService->unlinkIssue(
            (int) $request->input('encounter_id'),
            (string) $request->input('issue_type'),
            (int) $request->input('issue_id')
        );

        $this->success(null, $result['message']);
    }

    /**
     * Everything the "Create Visit" form's dropdowns and linked-issues
     * picker need, gathered into one response. These used to be 6
     * separate catalog requests plus the linkable-issues request, each
     * paying a fresh remote-DB connection round-trip on this app's setup
     * (see PatientController::dashboardSummary() for the same
     * reasoning). Batching them into one request pays that cost once.
     */
    public function formOptions(): void
    {
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        $sections = [
            'visit_categories' => fn () => (new VisitCategoryService())->list(),
            'classes' => fn () => (new ClassService())->list(),
            'visit_types' => fn () => (new VisitTypeService())->list(),
            'providers' => fn () => $this->providerService->list(),
            'facilities' => fn () => (new FacilityService())->list(),
            'discharge_dispositions' => fn () => (new DischargeDispositionService())->list(),
            'linkable_issues' => fn () => $this->encounterService->listLinkableIssues($patientId),
        ];

        $result = [];

        foreach ($sections as $key => $fetch) {
            try {
                $result[$key] = $fetch();
            } catch (\Throwable $e) {
                error_log("formOptions: failed to load '{$key}': " . $e->getMessage());
                $result[$key] = [];
            }
        }

        $this->success($result, 'Encounter form options retrieved successfully.');
    }

    /**
     * Record an encounter for a patient (admin, receptionist, or the assigned doctor).
     * Body: { patient_id, ...detail fields, issues?: [{ issue_type, issue_id }] }
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $sensitivity = (string) $request->input('sensitivity', 'normal');
        PhiAccessGuard::assertSensitivityAccess($user, $sensitivity, $patientId);

        $result = $this->encounterService->store(
            $patientId,
            (int) $user['id'],
            $request->only(self::DETAIL_FIELDS),
            (array) $request->input('issues', []),
            (array) $request->input('billing_codes', [])
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update a recorded encounter's details and linked issues (admin, receptionist, or the assigned doctor).
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->encounterService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Encounter record not found.', 404);
            return;
        }

        $sensitivity = (string) $request->input('sensitivity', $record['sensitivity'] ?? 'normal');
        PhiAccessGuard::assertSensitivityAccess($user, $sensitivity, (int) $record['patient_id']);

        $result = $this->encounterService->update(
            $id,
            $request->only(self::DETAIL_FIELDS),
            (int) $user['id'],
            (array) $request->input('issues', []),
            (array) $request->input('billing_codes', [])
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Save an encounter's billing note (admin, receptionist, or the assigned doctor).
     */
    public function updateBillingNote(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->encounterService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Encounter record not found.', 404);
            return;
        }

        $result = $this->encounterService->updateBillingNote(
            $id,
            $request->input('billing_note'),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Remove a recorded encounter (admin, receptionist, or the assigned doctor).
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');

        $record = $this->encounterService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Encounter record not found.', 404);
            return;
        }

        $result = $this->encounterService->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    private function ownsPatient(array $user, int $patientId): bool
    {
        PhiAccessGuard::assertPatientAccess($user, $patientId, false);

        return true;
    }
}
