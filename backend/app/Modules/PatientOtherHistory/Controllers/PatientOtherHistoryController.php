<?php

namespace App\Modules\PatientOtherHistory\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientOtherHistory\Services\PatientOtherHistoryService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class PatientOtherHistoryController extends Controller
{
    private PatientOtherHistoryService $service;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->service = new PatientOtherHistoryService();
        $this->providerService = new ProviderService();
    }

    /**
     * Get a patient's Other tab data.
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

        $this->success($this->service->get($patientId), 'Other history retrieved successfully.');
    }

    /**
     * Save a patient's Other tab data.
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

        $data = $request->only(['name_1', 'value_1', 'name_2', 'value_2', 'additional_history']);

        $result = $this->service->save($patientId, $data, (int) $user['id']);

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
