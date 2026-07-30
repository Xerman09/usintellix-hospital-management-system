<?php

namespace App\Modules\CareTeams\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\CareTeams\Services\CareTeamService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Services\ProviderService;

class CareTeamController extends Controller
{
    private CareTeamService $careTeamService;
    private ProviderService $providerService;

    private const DETAIL_FIELDS = ['name', 'status'];

    public function __construct()
    {
        $this->careTeamService = new CareTeamService();
        $this->providerService = new ProviderService();
    }

    /**
     * The patient's care team (name/status) and its members.
     */
    public function index(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $patientId = (int) $request->input('patient_id');

        if (!$patientId || !$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $this->success($this->careTeamService->show($patientId), 'Care team retrieved successfully.');
    }

    /**
     * Reference data for the care team editor: user list, roles,
     * facilities, and this patient's related persons.
     */
    public function optionsIndex(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $patientId = (int) $request->input('patient_id');

        if (!$patientId || !$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $this->success($this->careTeamService->options($patientId), 'Care team options retrieved successfully.');
    }

    /**
     * Create or update a patient's care team and replace its member list
     * (admin, receptionist, or the assigned doctor).
     * Body: { patient_id, name, status, members: [{ member_type, user_id?, related_person_id?, role_id?, facility_id?, member_since?, status?, note? }] }
     */
    public function save(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        if (!$this->ownsPatient($user, $patientId)) {
            $this->error('Patient not found.', 404);
            return;
        }

        $result = $this->careTeamService->save(
            $patientId,
            (int) $user['id'],
            $request->only(self::DETAIL_FIELDS),
            (array) $request->input('members', [])
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Confirm the given patient exists and, for doctors, is assigned to them.
     * Admins and receptionists may manage any active patient's care team.
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
