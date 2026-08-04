<?php

namespace App\Modules\PatientImmunizations\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientImmunizations\Services\PatientImmunizationService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class PatientImmunizationController extends Controller
{
    private PatientImmunizationService $patientImmunizationService;
    private ProviderService $providerService;

    private const DETAIL_FIELDS = [
        'cvx_code', 'vaccine_name', 'administered_at', 'amount_administered', 'amount_unit',
        'expiration_date', 'manufacturer', 'lot_number', 'administered_by',
        'administered_by_provider_id', 'vis_date_given', 'vis_date_document',
        'route', 'administration_site', 'notes', 'information_source',
        'completion_status', 'refusal_reason', 'reason_code',
        'ordering_provider_id', 'encounter_id'
    ];

    public function __construct()
    {
        $this->patientImmunizationService = new PatientImmunizationService();
        $this->providerService = new ProviderService();
    }

    /**
     * List a patient's recorded immunizations.
     */
    public function index(): void
    {
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        $immunizations = $this->patientImmunizationService->list($patientId);

        $this->success($immunizations, 'Patient immunizations retrieved successfully.');
    }

    /**
     * Record an immunization for a patient (admin, receptionist, or the assigned doctor).
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');
        $cvxCodeIdRaw = $request->input('cvx_code_id');
        $cvxCodeId = ($cvxCodeIdRaw !== null && $cvxCodeIdRaw !== '') ? (int) $cvxCodeIdRaw : null;

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $result = $this->patientImmunizationService->store(
            $patientId,
            $cvxCodeId,
            (int) $user['id'],
            $request->only(self::DETAIL_FIELDS)
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update a recorded patient immunization's details (admin, receptionist, or the assigned doctor).
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->patientImmunizationService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Immunization record not found.', 404);
            return;
        }

        $result = $this->patientImmunizationService->update(
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

    /**
     * Remove a recorded patient immunization (admin, receptionist, or the assigned doctor).
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');

        $record = $this->patientImmunizationService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Immunization record not found.', 404);
            return;
        }

        $result = $this->patientImmunizationService->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Confirm the given patient exists and, for doctors, is assigned to them.
     * Admins and receptionists may manage any active patient's immunizations.
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
