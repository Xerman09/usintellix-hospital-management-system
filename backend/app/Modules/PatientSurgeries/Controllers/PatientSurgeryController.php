<?php

namespace App\Modules\PatientSurgeries\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientSurgeries\Services\PatientSurgeryService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class PatientSurgeryController extends Controller
{
    private PatientSurgeryService $patientSurgeryService;
    private ProviderService $providerService;

    private const DETAIL_FIELDS = [
        'title', 'begin_date', 'end_date', 'comments', 'coding',
        'occurrence', 'outcome', 'classification_type', 'verification_status',
        'referred_by', 'destination'
    ];

    public function __construct()
    {
        $this->patientSurgeryService = new PatientSurgeryService();
        $this->providerService = new ProviderService();
    }

    /**
     * List a patient's recorded surgeries.
     */
    public function index(): void
    {
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        $surgeries = $this->patientSurgeryService->list($patientId);

        $this->success($surgeries, 'Patient surgeries retrieved successfully.');
    }

    /**
     * Record a surgery for a patient (admin, receptionist, or the assigned doctor).
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');
        $surgeryIdRaw = $request->input('surgery_id');
        $surgeryId = ($surgeryIdRaw !== null && $surgeryIdRaw !== '') ? (int) $surgeryIdRaw : null;

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $result = $this->patientSurgeryService->store(
            $patientId,
            $surgeryId,
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
     * Update a recorded patient surgery's details (admin, receptionist, or the assigned doctor).
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->patientSurgeryService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Surgery record not found.', 404);
            return;
        }

        $result = $this->patientSurgeryService->update(
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
     * Remove a recorded patient surgery (admin, receptionist, or the assigned doctor).
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');

        $record = $this->patientSurgeryService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Surgery record not found.', 404);
            return;
        }

        $result = $this->patientSurgeryService->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Confirm the given patient exists and, for doctors, is assigned to them.
     * Admins and receptionists may manage any active patient's surgeries.
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
