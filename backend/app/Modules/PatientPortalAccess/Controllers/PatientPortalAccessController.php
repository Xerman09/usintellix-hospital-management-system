<?php

namespace App\Modules\PatientPortalAccess\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientPortalAccess\Services\PatientPortalAccessService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class PatientPortalAccessController extends Controller
{
    private PatientPortalAccessService $service;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->service = new PatientPortalAccessService();
        $this->providerService = new ProviderService();
    }

    public function credentials(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $result = $this->service->previewCredentials($patientId);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    public function saveCredentials(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $result = $this->service->saveCredentials(
            $patientId,
            (string) $request->input('username', ''),
            (string) $request->input('password', ''),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
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
