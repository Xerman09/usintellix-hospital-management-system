<?php

namespace App\Modules\PatientPrescriptions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientPrescriptions\Services\PrescriptionService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Services\PatientAccessService;
use App\Modules\Providers\Services\ProviderService;

/** Prescription slips (one prescription, many medicines). */
class PrescriptionController extends Controller
{
    private PrescriptionService $service;

    public function __construct()
    {
        $this->service = new PrescriptionService();
    }

    /** Query: patient_id (staff). Patients see their own. */
    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user');

        if (($user['role'] ?? '') === 'patient') {
            $patient = (new PatientAccessService())->resolveEffectivePatient($user);
            if (!$patient) {
                $this->error('Patient record not found.', 404);
                return;
            }
            $patientId = (int) $patient['id'];
        } else {
            $patientId = (int) $request->input('patient_id');
            if (!$patientId) {
                $this->error('Patient is required.', 422);
                return;
            }
        }

        $this->success($this->service->list($patientId), 'Prescriptions retrieved successfully.');
    }

    /** Query: patient_id */
    public function formOptions(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $patientId = (int) $request->input('patient_id');

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $this->success($this->service->formOptions($patientId, $user), 'Options retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $data = $request->only(['patient_id', 'prescriber_user_id', 'encounter_id', 'prescribed_date', 'diagnosis', 'notes', 'items']);

        if (!$this->ownsPatient($user, (int) ($data['patient_id'] ?? 0))) {
            $this->error('Patient not found.', 404);
            return;
        }

        $this->respond($this->service->create($data, $user), 201);
    }

    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $id = (int) $request->input('id');
        $patientId = $this->service->patientIdOf($id);

        if (!$patientId || !$this->ownsPatient($user, $patientId)) {
            $this->error('Prescription not found.', 404);
            return;
        }

        $this->respond($this->service->update(
            $id,
            $request->only(['id', 'prescriber_user_id', 'encounter_id', 'prescribed_date', 'diagnosis', 'notes', 'items', 'version']),
            $user
        ));
    }

    /** Body: id, reason, version? */
    public function cancel(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $id = (int) $request->input('id');
        $patientId = $this->service->patientIdOf($id);

        if (!$patientId || !$this->ownsPatient($user, $patientId)) {
            $this->error('Prescription not found.', 404);
            return;
        }

        $version = $request->input('version');
        $this->respond($this->service->cancel($id, (string) $request->input('reason'), $version !== null ? (string) $version : null, $user));
    }

    private function respond(array $result, int $successStatus = 200): void
    {
        if (!$result['success']) {
            $status = !empty($result['not_found']) ? 404 : (!empty($result['stale']) ? 409 : 422);
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'] ?? null, $result['message'], $successStatus);
    }

    /** Same rule as single prescriptions: doctors only for their assigned patients. */
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

        $provider = (new ProviderService())->findByUserId((int) $user['id']);

        return (int) $patient['provider_id'] === ($provider ? (int) $provider['id'] : 0);
    }
}
