<?php

namespace App\Modules\HealthRecords\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\HealthRecords\Services\HealthRecordSummaryService;
use App\Modules\Patients\Services\PatientAccessService;
use App\Modules\Providers\Services\ProviderService;

class HealthRecordController extends Controller
{
    private HealthRecordSummaryService $summaryService;
    private ProviderService $providerService;
    private PatientAccessService $patientAccessService;

    public function __construct()
    {
        $this->summaryService = new HealthRecordSummaryService();
        $this->providerService = new ProviderService();
        $this->patientAccessService = new PatientAccessService();
    }

    /**
     * Retrieve the CCD-style health record summary for a patient.
     * Doctors may only view their own assigned patients.
     */
    public function summary(): void
    {
        $user = Session::get('user');
        $request = new Request();

        if ($user['role'] === 'patient') {
            $patient = $this->patientAccessService->resolveEffectivePatient($user);

            if (!$patient) {
                $this->error('Patient record not found.', 404);
                return;
            }
        } else {
            $patientId = (int) $request->input('patient_id');

            if (!$patientId) {
                $this->error('Patient is required.', 422);
                return;
            }

            $patient = $this->summaryService->fetchPatient($patientId);

            if (!$patient) {
                $this->error('Patient not found.', 404);
                return;
            }

            if ($user['role'] === 'doctor') {
                $provider = $this->providerService->findByUserId((int) $user['id']);
                $providerId = $provider ? (int) $provider['id'] : 0;

                if ((int) $patient['provider_id'] !== $providerId) {
                    $this->error('Patient not found.', 404);
                    return;
                }
            }
        }

        $summary = $this->summaryService->getSummary((int) $patient['id']);

        $this->success($summary, 'Health record summary retrieved successfully.');
    }
}
