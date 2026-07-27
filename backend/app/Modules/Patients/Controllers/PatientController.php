<?php

namespace App\Modules\Patients\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Patients\Services\PatientService;
use App\Modules\Providers\Services\ProviderService;

class PatientController extends Controller
{
    private PatientService $patientService;
    private ProviderService $providerService;

    public function __construct()
    {
        $this->patientService = new PatientService();
        $this->providerService = new ProviderService();
    }

    /**
     * List patients. Doctors only see their own assigned patients.
     */
    public function index(): void
    {
        $user = Session::get('user');
        $providerId = null;

        if ($user['role'] === 'doctor') {
            $provider = $this->providerService->findByUserId((int) $user['id']);
            $providerId = $provider ? (int) $provider['id'] : 0;
        }

        $patients = $this->patientService->list($providerId);

        $this->success($patients, 'Patients retrieved successfully.');
    }

    /**
     * Soft-delete a patient (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->patientService->remove(
            $id,
            (int) $admin['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Update an existing patient's demographic record.
     */
    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $data = $request->only([
            'provider_id',
            'first_name',
            'middle_name',
            'last_name',
            'suffix',
            'sex',
            'birthdate',
            'civil_status',
            'blood_type',
            'race',
            'ethnicity',
            'religion',
            'language',
            'allow_sms',
            'allow_voice_calls',
            'allow_email',
            'allow_hie',
            'height',
            'weight',
            'address_line',
            'city',
            'province',
            'zip_code',
            'home_phone',
            'mobile_phone',
            'work_phone',
            'contact_email',
            'date_deceased',
            'reason_deceased',
            'employer_occupation',
            'employer_name',
            'employer_address_line',
            'employer_address_line2',
            'employer_city',
            'employer_state',
            'employer_postal_code',
            'employer_country',
            'employer_industry',
            'employer_employment_start_date',
            'employer_employment_end_date',
            'guardian_name',
            'guardian_relationship',
            'guardian_sex',
            'guardian_address',
            'guardian_city',
            'guardian_state',
            'guardian_postal_code',
            'guardian_country',
            'guardian_phone',
            'guardian_work_phone',
            'guardian_email'
        ]);

        $result = $this->patientService->update(
            $id,
            $data,
            (int) $user['id']
        );

        if (!$result['success']) {
            $status = isset($result['errors']) ? 422 : 404;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Register a new patient account (receptionist-only).
     */
    public function register(): void
    {
        $receptionist = Session::get('user');
        $request = new Request();

        $data = $request->only([
            'username',
            'password',
            'provider_id',
            'first_name',
            'middle_name',
            'last_name',
            'suffix',
            'sex',
            'birthdate',
            'civil_status',
            'blood_type',
            'race',
            'ethnicity',
            'religion',
            'language',
            'allow_sms',
            'allow_voice_calls',
            'allow_email',
            'allow_hie',
            'height',
            'weight',
            'address_line',
            'city',
            'province',
            'zip_code',
            'home_phone',
            'mobile_phone',
            'work_phone',
            'contact_email',
            'employer_occupation',
            'employer_name',
            'employer_address_line',
            'employer_address_line2',
            'employer_city',
            'employer_state',
            'employer_postal_code',
            'employer_country',
            'employer_industry',
            'employer_employment_start_date',
            'employer_employment_end_date',
            'date_deceased',
            'reason_deceased',
            'guardian_name',
            'guardian_relationship',
            'guardian_sex',
            'guardian_address',
            'guardian_city',
            'guardian_state',
            'guardian_postal_code',
            'guardian_country',
            'guardian_phone',
            'guardian_work_phone',
            'guardian_email'
        ]);

        $result = $this->patientService->register(
            $data,
            (int) $receptionist['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }
}
