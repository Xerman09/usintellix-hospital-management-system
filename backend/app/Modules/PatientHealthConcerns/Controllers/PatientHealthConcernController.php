<?php

namespace App\Modules\PatientHealthConcerns\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientHealthConcerns\Services\PatientHealthConcernService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class PatientHealthConcernController extends Controller
{
    private PatientHealthConcernService $patientHealthConcernService;
    private ProviderService $providerService;

    private const DETAIL_FIELDS = [
        'title', 'begin_date', 'end_date', 'comments', 'coding',
        'occurrence', 'outcome', 'classification_type', 'verification_status',
        'referred_by', 'destination'
    ];

    public function __construct()
    {
        $this->patientHealthConcernService = new PatientHealthConcernService();
        $this->providerService = new ProviderService();
    }

    /**
     * List a patient's recorded health concerns.
     */
    public function index(): void
    {
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        $concerns = $this->patientHealthConcernService->list($patientId);

        $this->success($concerns, 'Patient health concerns retrieved successfully.');
    }

    /**
     * Record a health concern for a patient (admin, receptionist, or the assigned doctor).
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

        $result = $this->patientHealthConcernService->store(
            $patientId,
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
     * Update a recorded patient health concern's details (admin, receptionist, or the assigned doctor).
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->patientHealthConcernService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Health concern record not found.', 404);
            return;
        }

        $result = $this->patientHealthConcernService->update(
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
     * Remove a recorded patient health concern (admin, receptionist, or the assigned doctor).
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');

        $record = $this->patientHealthConcernService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Health concern record not found.', 404);
            return;
        }

        $result = $this->patientHealthConcernService->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Confirm the given patient exists and, for doctors, is assigned to them.
     * Admins and receptionists may manage any active patient's health concerns.
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
