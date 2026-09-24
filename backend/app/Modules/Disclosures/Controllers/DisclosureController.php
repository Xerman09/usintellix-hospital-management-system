<?php

namespace App\Modules\Disclosures\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Disclosures\Services\DisclosureService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class DisclosureController extends Controller
{
    private DisclosureService $disclosureService;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->disclosureService = new DisclosureService();
        $this->providerService = new ProviderService();
    }

    /**
     * List recorded disclosures (global across patients or filtered by patient).
     */
    public function index(): void
    {
        $request = new Request();
        $patientId = $request->input('patient_id') ? (int) $request->input('patient_id') : null;

        $filters = [
            'from'            => $request->input('from'),
            'to'              => $request->input('to'),
            'legal_basis'     => $request->input('legal_basis'),
            'disclosure_type' => $request->input('disclosure_type'),
            'search'          => $request->input('search')
        ];

        $disclosures = $this->disclosureService->list($patientId, $filters);

        $this->success($disclosures, 'Disclosures retrieved successfully.');
    }

    /**
     * Get aggregate statistics for the Accounting of Disclosures console.
     */
    public function stats(): void
    {
        $request = new Request();
        $patientId = $request->input('patient_id') ? (int) $request->input('patient_id') : null;

        $stats = $this->disclosureService->stats(['patient_id' => $patientId]);

        $this->success($stats, 'Disclosure statistics retrieved.');
    }

    /**
     * Record a new disclosure for a patient.
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found or unauthorized.', 404);
            return;
        }

        $result = $this->disclosureService->store(
            $patientId,
            (int) $user['id'],
            $request->all(),
            $user
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing disclosure record.
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->disclosureService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Disclosure record not found.', 404);
            return;
        }

        $result = $this->disclosureService->update(
            $id,
            $request->all(),
            (int) $user['id'],
            $user
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Remove / soft-delete a recorded disclosure.
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->disclosureService->find($id);

        if (!$record || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Disclosure record not found.', 404);
            return;
        }

        $result = $this->disclosureService->remove($id, (int) $user['id'], $user);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Generate structured HIPAA § 164.528 Accounting of Disclosures Report
     * for delivery to a requesting patient or regulatory auditor.
     */
    public function report(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient ID is required for generating an Accounting of Disclosures report.', 422);
            return;
        }

        $from = $request->input('from');
        $to = $request->input('to');

        $result = $this->disclosureService->getReportData($patientId, $from, $to, $user);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success($result['data'], 'Accounting of Disclosures report compiled successfully.');
    }

    /**
     * Export disclosures as an RFC 4180 compliant CSV stream.
     */
    public function exportCsv(): void
    {
        $request = new Request();
        $patientId = $request->input('patient_id') ? (int) $request->input('patient_id') : null;

        $filters = [
            'from'            => $request->input('from'),
            'to'              => $request->input('to'),
            'legal_basis'     => $request->input('legal_basis'),
            'disclosure_type' => $request->input('disclosure_type'),
            'search'          => $request->input('search')
        ];

        $user = Session::get('user');
        $this->disclosureService->exportCsv($patientId, $filters, $user);
        exit;
    }

    /**
     * Access control helper: Confirm patient exists and belongs to provider if doctor.
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
