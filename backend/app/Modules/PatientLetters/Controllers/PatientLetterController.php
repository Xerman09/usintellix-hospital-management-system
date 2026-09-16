<?php

namespace App\Modules\PatientLetters\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Patients\Models\Patient;
use App\Modules\PatientLetters\Services\PatientLetterService;
use App\Modules\Providers\Services\ProviderService;

class PatientLetterController extends Controller
{
    private PatientLetterService $patientLetterService;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->patientLetterService = new PatientLetterService();
        $this->providerService = new ProviderService();
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

        $result = $this->patientLetterService->create(
            $patientId,
            $request->only(['from_employee_id', 'from_name', 'to_employee_id', 'to_name', 'specialty', 'template_filename', 'print_format', 'letter_date', 'body']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->patientLetterService->find($id);

        if (!$record || $record['deleted_at'] !== null || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Letter not found.', 404);
            return;
        }

        $result = $this->patientLetterService->update(
            $id,
            $request->only(['from_employee_id', 'from_name', 'to_employee_id', 'to_name', 'specialty', 'template_filename', 'print_format', 'letter_date', 'body']),
            (int) $user['id']
        );

        $this->success($result['data'], $result['message']);
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
