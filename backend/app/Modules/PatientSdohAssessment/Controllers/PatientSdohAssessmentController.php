<?php

namespace App\Modules\PatientSdohAssessment\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientSdohAssessment\Services\PatientSdohAssessmentService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class PatientSdohAssessmentController extends Controller
{
    private PatientSdohAssessmentService $service;
    private ProviderService $providerService;

    private const DETAIL_FIELDS = [
        'assessment_date', 'screening_tool_id', 'assessor_provider_id',
        'food_insecurity_status', 'food_insecurity_notes', 'hvs_worried_food', 'hvs_food_didnt_last',
        'disability_overall_status', 'disability_notes',
        'disability_walking', 'disability_seeing', 'disability_hearing',
        'disability_concentrating', 'disability_dressing_bathing', 'disability_errands',
        'housing_status', 'housing_notes',
        'transportation_status', 'transportation_notes',
        'utilities_status', 'utilities_notes',
        'interpersonal_safety_status', 'interpersonal_safety_notes',
        'financial_strain_status', 'financial_strain_notes',
        'social_isolation_status', 'social_isolation_notes',
        'childcare_status', 'childcare_notes',
        'digital_access_status', 'digital_access_notes',
        'employment_status', 'education_level', 'caregiver_status', 'veteran_status',
        'pregnancy_status', 'estimated_due_date', 'postpartum_status', 'postpartum_end_date', 'pregnancy_intention',
        'additional_interventions'
    ];

    public function __construct()
    {
        $this->service = new PatientSdohAssessmentService();
        $this->providerService = new ProviderService();
    }

    /**
     * List a patient's full SDOH assessment history.
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

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $this->success($this->service->list($patientId), 'Patient SDOH assessments retrieved successfully.');
    }

    /**
     * Create a new SDOH assessment record for a patient.
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

        $result = $this->service->store($patientId, (int) $user['id'], $request->only(self::DETAIL_FIELDS));

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing SDOH assessment record.
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $id ? $this->service->find($id) : null;

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('SDOH Assessment not found.', 404);
            return;
        }

        $result = $this->service->update($id, $request->only(self::DETAIL_FIELDS), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Soft-delete an SDOH assessment record.
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $id ? $this->service->find($id) : null;

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('SDOH Assessment not found.', 404);
            return;
        }

        $result = $this->service->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Confirm the given patient exists and, for doctors, is assigned to them.
     * Admins and receptionists may manage any active patient's assessments.
     */
    private function ownsPatient(array $user, int $patientId): bool
    {
        $patient = (new Patient())->where('id', $patientId)->first();

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
