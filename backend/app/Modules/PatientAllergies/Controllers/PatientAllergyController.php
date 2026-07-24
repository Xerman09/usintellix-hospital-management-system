<?php

namespace App\Modules\PatientAllergies\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientAllergies\Services\PatientAllergyService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class PatientAllergyController extends Controller
{
    private PatientAllergyService $patientAllergyService;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->patientAllergyService = new PatientAllergyService();
        $this->providerService = new ProviderService();
    }

    /**
     * List a patient's recorded allergies.
     */
    public function index(): void
    {
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        $allergies = $this->patientAllergyService->list($patientId);

        $this->success($allergies, 'Patient allergies retrieved successfully.');
    }

    /**
     * Attach an allergy to a patient (doctor-only, own patients only).
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');
        $allergyId = (int) $request->input('allergy_id');

        if (!$patientId || !$allergyId) {
            $this->error('Patient and allergy are required.', 422);
            return;
        }

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $result = $this->patientAllergyService->store($patientId, $allergyId, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Remove a recorded patient allergy (doctor-only, own patients only).
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');

        $record = $this->patientAllergyService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Allergy record not found.', 404);
            return;
        }

        $result = $this->patientAllergyService->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Confirm the given patient is assigned to the logged-in doctor.
     */
    private function ownsPatient(array $user, int $patientId): bool
    {
        $provider = $this->providerService->findByUserId((int) $user['id']);
        $providerId = $provider ? (int) $provider['id'] : 0;

        $patient = (new Patient())->where('id', $patientId)->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return false;
        }

        return (int) $patient['provider_id'] === $providerId;
    }
}
