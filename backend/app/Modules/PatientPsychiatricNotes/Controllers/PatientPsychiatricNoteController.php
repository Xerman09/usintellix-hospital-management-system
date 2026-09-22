<?php

declare(strict_types=1);

namespace App\Modules\PatientPsychiatricNotes\Controllers;

use App\Core\AuditLogger;
use App\Core\Controller;
use App\Core\PhiAccessGuard;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientPsychiatricNotes\Services\PatientPsychiatricNoteService;
use App\Modules\Providers\Services\ProviderService;

class PatientPsychiatricNoteController extends Controller
{
    private PatientPsychiatricNoteService $service;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->service = new PatientPsychiatricNoteService();
        $this->providerService = new ProviderService();
    }

    /**
     * List psychiatric notes for a patient.
     * Enforces clinical role and patient assignment boundary.
     */
    public function index(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient ID is required.', 422);
            return;
        }

        // HIPAA § 164.502(b) & § 164.501: Non-clinical staff strictly prohibited from psychiatric notes
        PhiAccessGuard::assertClinicalAccess($user);

        // Doctors must be assigned or invoke emergency break-glass
        if (PhiAccessGuard::isDoctorRole($user['role'] ?? null)) {
            PhiAccessGuard::assertPatientAccess($user, $patientId, true);
        }

        AuditLogger::log(
            AuditLogger::CATEGORY_CHART,
            AuditLogger::ACTION_CHART_VIEW,
            "Viewed encrypted psychiatric evaluation notes for patient ID {$patientId}",
            $patientId
        );

        $notes = $this->service->list($patientId);

        $this->success($notes, 'Psychiatric notes retrieved successfully.');
    }

    /**
     * Retrieve a specific psychiatric note.
     */
    public function show(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Note ID is required.', 422);
            return;
        }

        PhiAccessGuard::assertClinicalAccess($user);

        $note = $this->service->find($id);
        if (!$note) {
            $this->error('Psychiatric note not found.', 404);
            return;
        }

        $patientId = (int) $note['patient_id'];
        if (PhiAccessGuard::isDoctorRole($user['role'] ?? null)) {
            PhiAccessGuard::assertPatientAccess($user, $patientId, true);
        }

        AuditLogger::log(
            AuditLogger::CATEGORY_CHART,
            AuditLogger::ACTION_CHART_VIEW,
            "Viewed specific psychiatric note ID {$id}",
            $patientId
        );

        $this->success($note, 'Psychiatric note retrieved successfully.');
    }

    /**
     * Create a new psychiatric note.
     */
    public function store(): void
    {
        $user = Session::get('user');
        $request = new Request();

        PhiAccessGuard::assertClinicalAccess($user);

        $data = $request->only([
            'patient_id',
            'encounter_id',
            'session_date',
            'diagnosis_code',
            'symptoms',
            'psychiatric_notes',
            'treatment_plan',
            'confidential_remarks'
        ]);

        $patientId = (int) ($data['patient_id'] ?? 0);
        if (!$patientId) {
            $this->error('Patient ID is required.', 422);
            return;
        }

        if (PhiAccessGuard::isDoctorRole($user['role'] ?? null)) {
            PhiAccessGuard::assertPatientAccess($user, $patientId, true);
        }

        // Auto-assign provider from doctor session if not explicitly provided
        if (empty($data['provider_id'])) {
            $provider = $this->providerService->findByUserId((int) $user['id']);
            $data['provider_id'] = $provider ? (int) $provider['id'] : 1;
        }

        $result = $this->service->store($data, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        AuditLogger::log(
            AuditLogger::CATEGORY_CHART,
            AuditLogger::ACTION_CHART_UPDATE,
            "Recorded AES-256-GCM encrypted psychiatric note for patient ID {$patientId}",
            $patientId
        );

        $this->success($result['data'] ?? null, $result['message'], 201);
    }

    /**
     * Update an existing psychiatric note.
     */
    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Note ID is required.', 422);
            return;
        }

        PhiAccessGuard::assertClinicalAccess($user);

        $existing = $this->service->find($id);
        if (!$existing) {
            $this->error('Psychiatric note not found.', 404);
            return;
        }

        $patientId = (int) $existing['patient_id'];
        if (PhiAccessGuard::isDoctorRole($user['role'] ?? null)) {
            PhiAccessGuard::assertPatientAccess($user, $patientId, true);
        }

        $data = $request->only([
            'session_date',
            'diagnosis_code',
            'symptoms',
            'psychiatric_notes',
            'treatment_plan',
            'confidential_remarks'
        ]);

        $result = $this->service->update($id, $data, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        AuditLogger::log(
            AuditLogger::CATEGORY_CHART,
            AuditLogger::ACTION_CHART_UPDATE,
            "Updated encrypted psychiatric note ID {$id}",
            $patientId
        );

        $this->success(null, $result['message']);
    }

    /**
     * Remove / soft-delete a psychiatric note.
     */
    public function destroy(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Note ID is required.', 422);
            return;
        }

        PhiAccessGuard::assertClinicalAccess($user);

        $existing = $this->service->find($id);
        if (!$existing) {
            $this->error('Psychiatric note not found.', 404);
            return;
        }

        $patientId = (int) $existing['patient_id'];
        if (PhiAccessGuard::isDoctorRole($user['role'] ?? null)) {
            PhiAccessGuard::assertPatientAccess($user, $patientId, true);
        }

        $result = $this->service->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        AuditLogger::log(
            AuditLogger::CATEGORY_CHART,
            AuditLogger::ACTION_PATIENT_DELETE,
            "Deleted psychiatric note ID {$id}",
            $patientId
        );

        $this->success(null, $result['message']);
    }
}
