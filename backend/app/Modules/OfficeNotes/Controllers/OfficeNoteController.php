<?php

namespace App\Modules\OfficeNotes\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\OfficeNotes\Services\OfficeNoteService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class OfficeNoteController extends Controller
{
    private OfficeNoteService $service;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->service = new OfficeNoteService();
        $this->providerService = new ProviderService();
    }

    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $patientId = (int) $request->input('patient_id');
        $patientNo = trim((string) $request->input('patient_no', ''));
        $search = trim((string) $request->input('search', ''));

        if (!$patientId && !empty($patientNo)) {
            $p = (new Patient())->where('patient_no', $patientNo)->first();
            if ($p) {
                $patientId = (int) $p['id'];
            }
        }

        if ($patientId > 0 && !$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $filter = (string) $request->input('filter', 'all');
        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 50);

        $patient = null;
        if ($patientId > 0) {
            $pRecord = (new Patient())->where('id', $patientId)->first();
            if ($pRecord) {
                $patient = [
                    'id' => $pRecord['id'],
                    'patient_no' => $pRecord['patient_no'],
                    'first_name' => $pRecord['first_name'],
                    'last_name' => $pRecord['last_name'],
                    'birthdate' => $pRecord['birthdate'],
                    'sex' => $pRecord['sex']
                ];
            }
        }

        $patients = \App\Core\Database::connection()->query("
            SELECT id, patient_no, CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, '')) AS name 
            FROM patients 
            WHERE deleted_at IS NULL 
            ORDER BY last_name ASC, first_name ASC 
            LIMIT 200
        ")->fetchAll(\PDO::FETCH_ASSOC);

        $data = $this->service->list($patientId, $filter, $page ?: 1, $perPage ?: 50, $search);
        $data['patient'] = $patient;
        $data['patients'] = $patients;

        $this->success(
            $data,
            'Office notes retrieved successfully.'
        );
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $patientId = (int) $request->input('patient_id');
        $patientNo = trim((string) $request->input('patient_no', ''));

        if (!$patientId && !empty($patientNo)) {
            $p = (new Patient())->where('patient_no', $patientNo)->first();
            if ($p) {
                $patientId = (int) $p['id'];
            }
        }

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $result = $this->service->create($patientId, $request->only(['note']), (int) ($user['id'] ?? 1));

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
        $record = $this->service->find($id);

        if (!$record || $record['deleted_at'] !== null || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Note not found.', 404);
            return;
        }

        $result = $this->service->update($id, $request->only(['note', 'active']), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $id = (int) $request->input('id');
        $record = $this->service->find($id);

        if (!$record || $record['deleted_at'] !== null || !$this->ownsPatient($user, (int) $record['patient_id'])) {
            $this->error('Note not found.', 404);
            return;
        }

        $result = $this->service->remove($id, (int) $user['id']);

        $this->success(null, $result['message']);
    }

    private function ownsPatient(?array $user, int $patientId): bool
    {
        if (!$patientId) {
            return true;
        }

        $patient = (new Patient())->where('id', $patientId)->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return false;
        }

        if (!$user || ($user['role'] ?? '') !== 'doctor') {
            return true;
        }

        $provider = $this->providerService->findByUserId((int) $user['id']);
        $providerId = $provider ? (int) $provider['id'] : 0;

        return (int) $patient['provider_id'] === $providerId;
    }
}
