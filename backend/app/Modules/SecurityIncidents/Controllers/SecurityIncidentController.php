<?php

namespace App\Modules\SecurityIncidents\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\SecurityIncidents\Services\SecurityIncidentService;

class SecurityIncidentController extends Controller
{
    private SecurityIncidentService $service;

    public function __construct()
    {
        $this->service = new SecurityIncidentService();
    }

    /**
     * List all security incidents with optional filters.
     */
    public function index(): void
    {
        $request = new Request();
        $filters = [
            'status'               => $request->input('status'),
            'breach_determination' => $request->input('breach_determination'),
            'incident_type'        => $request->input('incident_type'),
            'search'               => $request->input('search'),
            'from'                 => $request->input('from'),
            'to'                   => $request->input('to')
        ];

        $incidents = $this->service->list($filters);

        $this->success($incidents, 'Security incidents retrieved successfully.');
    }

    /**
     * Get aggregate statistics and countdown metrics.
     */
    public function stats(): void
    {
        $stats = $this->service->stats();

        $this->success($stats, 'Security incident statistics retrieved.');
    }

    /**
     * View single incident details, risk assessment, and affected patients.
     */
    public function show(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Incident ID is required.', 422);
            return;
        }

        $incident = $this->service->find($id);

        if (!$incident) {
            $this->error('Incident record not found.', 404);
            return;
        }

        $this->success($incident, 'Incident details retrieved.');
    }

    /**
     * Record a new security incident.
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'email' => 'admin@uhms.org', 'name' => 'System Administrator'];

        $result = $this->service->create($request->all(), $user);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update incident details.
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'email' => 'admin@uhms.org', 'name' => 'System Administrator'];
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Incident ID is required.', 422);
            return;
        }

        $result = $this->service->update($id, $request->all(), $user);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Submit statutory 4-Factor Risk Assessment (§ 164.402).
     */
    public function assess(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'email' => 'admin@uhms.org', 'name' => 'System Administrator'];
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Incident ID is required.', 422);
            return;
        }

        $result = $this->service->submitRiskAssessment($id, $request->all(), $user);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Link an affected patient.
     */
    public function linkPatient(): void
    {
        $request = new Request();
        $incidentId = (int) $request->input('incident_id');
        $patientId = (int) $request->input('patient_id');

        if (!$incidentId || !$patientId) {
            $this->error('Both incident_id and patient_id are required.', 422);
            return;
        }

        $result = $this->service->linkPatient($incidentId, $patientId, $request->all());

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'] ?? null, $result['message']);
    }

    /**
     * Remove a linked patient.
     */
    public function removePatient(): void
    {
        $request = new Request();
        $incidentId = (int) $request->input('incident_id');
        $patientId = (int) $request->input('patient_id');

        if (!$incidentId || !$patientId) {
            $this->error('Both incident_id and patient_id are required.', 422);
            return;
        }

        $result = $this->service->removePatient($incidentId, $patientId);

        $this->success(null, $result['message']);
    }

    /**
     * Update individual patient notification status.
     */
    public function updatePatientNotification(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'email' => 'admin@uhms.org'];
        $incidentId = (int) $request->input('incident_id');
        $patientId = (int) $request->input('patient_id');

        if (!$incidentId || !$patientId) {
            $this->error('Both incident_id and patient_id are required.', 422);
            return;
        }

        $result = $this->service->updatePatientNotification($incidentId, $patientId, $request->all(), $user);

        $this->success(null, $result['message']);
    }

    /**
     * Generate formal Patient Breach Notification Letter (45 CFR § 164.404(c)).
     */
    public function letter(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'email' => 'admin@uhms.org'];
        $incidentId = (int) $request->input('incident_id');
        $patientId = (int) $request->input('patient_id');

        if (!$incidentId || !$patientId) {
            $this->error('Both incident_id and patient_id are required.', 422);
            return;
        }

        $result = $this->service->getBreachLetterData($incidentId, $patientId, $user);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success($result['data'], 'Breach notification letter generated successfully.');
    }

    /**
     * Generate HHS OCR Breach Portal JSON filing package (45 CFR § 164.408).
     */
    public function ocrExport(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'email' => 'admin@uhms.org'];
        $incidentId = (int) $request->input('incident_id');

        if (!$incidentId) {
            $this->error('incident_id is required.', 422);
            return;
        }

        $result = $this->service->getOcrExportData($incidentId, $user);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success($result['data'], 'HHS OCR Breach Portal export package generated.');
    }

    /**
     * Download RFC 4180 CSV export of security incidents for compliance auditors.
     */
    public function exportCsv(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'email' => 'admin@uhms.org'];

        $filters = [
            'status'               => $request->input('status'),
            'breach_determination' => $request->input('breach_determination'),
            'incident_type'        => $request->input('incident_type'),
            'search'               => $request->input('search'),
            'from'                 => $request->input('from'),
            'to'                   => $request->input('to')
        ];

        $this->service->exportCsv($filters, $user);
        exit;
    }

    /**
     * Soft delete an incident record.
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'email' => 'admin@uhms.org'];
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Incident ID is required.', 422);
            return;
        }

        $result = $this->service->delete($id, $user);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
