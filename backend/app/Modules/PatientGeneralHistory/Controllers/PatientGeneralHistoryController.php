<?php

namespace App\Modules\PatientGeneralHistory\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientGeneralHistory\Services\PatientGeneralHistoryService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class PatientGeneralHistoryController extends Controller
{
    private PatientGeneralHistoryService $service;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->service = new PatientGeneralHistoryService();
        $this->providerService = new ProviderService();
    }

    /**
     * Get a patient's General tab data (risk factors + exams).
     */
    public function show(): void
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

        $this->success($this->service->get($patientId), 'General history retrieved successfully.');
    }

    /**
     * Save a patient's General tab data (risk factors + exams), replacing
     * the previously recorded set.
     */
    public function update(): void
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

        $riskFactors = (array) $request->input('risk_factors', []);
        $exams = (array) $request->input('exams', []);

        $result = $this->service->save($patientId, $riskFactors, $exams, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Confirm the given patient exists and, for doctors, is assigned to them.
     * Admins and receptionists may manage any active patient's history.
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
