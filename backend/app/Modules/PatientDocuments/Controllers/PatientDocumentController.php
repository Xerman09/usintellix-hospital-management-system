<?php

namespace App\Modules\PatientDocuments\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientDocuments\Services\PatientDocumentService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class PatientDocumentController extends Controller
{
    private PatientDocumentService $patientDocumentService;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->patientDocumentService = new PatientDocumentService();
        $this->providerService = new ProviderService();
    }

    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = $this->resolvePatientId($user, $request);

        if (!$patientId) {
            $this->error('Patient not found.', 404);
            return;
        }

        $this->success($this->patientDocumentService->listForPatient($patientId), 'Documents retrieved successfully.');
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

        $result = $this->patientDocumentService->upload(
            $patientId,
            $files['file'] ?? [],
            $request->only(['category', 'description']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
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

        $result = $this->patientDocumentService->remove((int) $request->input('id'), $patientId, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Patients always view their own record (no patient_id needed from the
     * client); staff pass patient_id explicitly and are subject to the
     * same doctor-owns-this-patient restriction used across the app.
     */
    private function resolvePatientId(array $user, Request $request): ?int
    {
        if (($user['role'] ?? '') === 'patient') {
            $patient = (new Patient())->where('user_id', $user['id'])->first();

            return ($patient && $patient['deleted_at'] === null) ? (int) $patient['id'] : null;
        }

        $patientId = (int) $request->input('patient_id');

        return $this->ownsPatient($user, $patientId) ? $patientId : null;
    }

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
