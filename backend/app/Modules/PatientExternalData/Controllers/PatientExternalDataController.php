<?php

namespace App\Modules\PatientExternalData\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientExternalData\Services\PatientExternalDataService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class PatientExternalDataController extends Controller
{
    private PatientExternalDataService $patientExternalDataService;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->patientExternalDataService = new PatientExternalDataService();
        $this->providerService = new ProviderService();
    }

    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $this->success($this->patientExternalDataService->listForPatient($patientId), 'External data retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $files = $request->files();

        $result = $this->patientExternalDataService->upload(
            $patientId,
            $files['file'] ?? [],
            $request->only(['title', 'source_name', 'document_type', 'received_at', 'description']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $result = $this->patientExternalDataService->remove((int) $request->input('id'), $patientId, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Confirm the given patient exists and, for doctors, is assigned to
     * them. Admins and receptionists may manage any active patient's
     * external data records.
     */
    private function ownsPatient(array $user, int $patientId): bool
    {
        if (!$patientId) {
            return false;
        }

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
