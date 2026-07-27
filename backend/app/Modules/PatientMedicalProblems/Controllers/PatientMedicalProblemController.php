<?php

namespace App\Modules\PatientMedicalProblems\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientMedicalProblems\Services\PatientMedicalProblemService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class PatientMedicalProblemController extends Controller
{
    private PatientMedicalProblemService $patientMedicalProblemService;
    private ProviderService $providerService;

    private const DETAIL_FIELDS = [
        'title', 'begin_date', 'end_date', 'comments', 'coding',
        'occurrence', 'outcome', 'classification_type', 'verification_status',
        'referred_by', 'destination'
    ];

    public function __construct()
    {
        $this->patientMedicalProblemService = new PatientMedicalProblemService();
        $this->providerService = new ProviderService();
    }

    /**
     * List a patient's recorded medical problems.
     */
    public function index(): void
    {
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        $problems = $this->patientMedicalProblemService->list($patientId);

        $this->success($problems, 'Patient medical problems retrieved successfully.');
    }

    /**
     * Record a medical problem for a patient (admin, receptionist, or the assigned doctor).
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');
        $problemIdRaw = $request->input('problem_id');
        $problemId = ($problemIdRaw !== null && $problemIdRaw !== '') ? (int) $problemIdRaw : null;

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $result = $this->patientMedicalProblemService->store(
            $patientId,
            $problemId,
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
     * Update a recorded patient medical problem's details (admin, receptionist, or the assigned doctor).
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->patientMedicalProblemService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Problem record not found.', 404);
            return;
        }

        $result = $this->patientMedicalProblemService->update(
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
     * Remove a recorded patient medical problem (admin, receptionist, or the assigned doctor).
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');

        $record = $this->patientMedicalProblemService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Problem record not found.', 404);
            return;
        }

        $result = $this->patientMedicalProblemService->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Confirm the given patient exists and, for doctors, is assigned to them.
     * Admins and receptionists may manage any active patient's problems.
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
