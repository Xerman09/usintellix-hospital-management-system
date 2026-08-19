<?php

namespace App\Modules\Patients\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Patients\Services\PatientService;
use App\Modules\Providers\Services\ProviderService;
use App\Modules\PatientAllergies\Services\PatientAllergyService;
use App\Modules\PatientMedicalProblems\Services\PatientMedicalProblemService;
use App\Modules\PatientHealthConcerns\Services\PatientHealthConcernService;
use App\Modules\PatientMedications\Services\PatientMedicationService;
use App\Modules\PatientImmunizations\Services\PatientImmunizationService;
use App\Modules\PatientPrescriptions\Services\PatientPrescriptionService;
use App\Modules\RelatedPersons\Services\RelatedPersonService;
use App\Modules\Disclosures\Services\DisclosureService;
use App\Modules\Messaging\Services\MessagingService;
use App\Modules\Amendments\Services\AmendmentService;
use App\Modules\Encounters\Services\EncounterService;
use App\Modules\CareTeams\Services\CareTeamService;

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
     * Everything the patient dashboard's widget grid needs, gathered into
     * one response. Widgets used to each fire their own GET request; on a
     * remote database that meant paying a fresh connection round-trip
     * (network handshake + auth) eight-plus times per dashboard open,
     * serialized by PHP's single-threaded built-in dev server. Batching
     * them into one request pays that round-trip once.
     */
    public function dashboardSummary(): void
    {
        $request = new Request();
        $patientId = (int) $request->input('patient_id');

        if (!$patientId) {
            $this->error('Patient is required.', 422);
            return;
        }

        // Each section is fetched independently: a broken table or
        // failing query in any one section (e.g. a migration that hasn't
        // been run yet) shouldn't crash the whole response and blank out
        // every other widget on the dashboard, so failures here degrade
        // to an empty section rather than propagating.
        $sections = [
            'allergies' => fn () => (new PatientAllergyService())->list($patientId),
            'problems' => fn () => (new PatientMedicalProblemService())->list($patientId),
            'health_concerns' => fn () => (new PatientHealthConcernService())->list($patientId),
            'medications' => fn () => (new PatientMedicationService())->list($patientId),
            'immunizations' => fn () => (new PatientImmunizationService())->list($patientId),
            'prescriptions' => fn () => (new PatientPrescriptionService())->list($patientId),
            'related_persons' => fn () => (new RelatedPersonService())->list($patientId),
            'disclosures' => fn () => (new DisclosureService())->list($patientId),
            'messages' => fn () => (new MessagingService())->listPatientMessages($patientId),
            'amendments' => fn () => (new AmendmentService())->list($patientId),
            'encounters' => fn () => (new EncounterService())->list($patientId),
            'care_team' => fn () => (new CareTeamService())->show($patientId),
        ];

        $result = [];

        foreach ($sections as $key => $fetch) {
            try {
                $result[$key] = $fetch();
            } catch (\Throwable $e) {
                error_log("dashboardSummary: failed to load '{$key}' for patient {$patientId}: " . $e->getMessage());
                $result[$key] = [];
            }
        }

        $this->success($result, 'Patient dashboard summary retrieved successfully.');
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
            'allow_postcard',
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
     * Upload/replace a patient's photo.
     */
    public function uploadPhoto(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $files = $request->files();

        $result = $this->patientService->uploadPhoto($id, $files['photo'] ?? [], (int) $user['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Patient not found.' ? 404 : 422;
            $this->error($result['message'], $status);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Remove a patient's photo.
     */
    public function removePhoto(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->patientService->removePhoto($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
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
            'allow_postcard',
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
