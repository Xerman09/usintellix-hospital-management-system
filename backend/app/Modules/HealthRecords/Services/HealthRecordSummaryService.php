<?php

namespace App\Modules\HealthRecords\Services;

use App\Core\Cache;
use App\Core\Database;
use App\Modules\Appointments\Services\AppointmentService;
use App\Modules\PatientAllergies\Services\PatientAllergyService;
use App\Modules\PatientImmunizations\Services\PatientImmunizationService;
use App\Modules\PatientMedicalProblems\Services\PatientMedicalProblemService;
use App\Modules\PatientMedications\Services\PatientMedicationService;
use App\Modules\PatientPrescriptions\Services\PatientPrescriptionService;
use PDO;

class HealthRecordSummaryService
{
    private AppointmentService $appointmentService;
    private PatientAllergyService $patientAllergyService;
    private PatientImmunizationService $patientImmunizationService;
    private PatientMedicalProblemService $patientMedicalProblemService;
    private PatientMedicationService $patientMedicationService;
    private PatientPrescriptionService $patientPrescriptionService;

    public function __construct()
    {
        $this->appointmentService = new AppointmentService();
        $this->patientAllergyService = new PatientAllergyService();
        $this->patientImmunizationService = new PatientImmunizationService();
        $this->patientMedicalProblemService = new PatientMedicalProblemService();
        $this->patientMedicationService = new PatientMedicationService();
        $this->patientPrescriptionService = new PatientPrescriptionService();
    }

    /**
     * Build a CCD-style health record summary for a single patient, cached
     * for up to a minute so repeatedly opening the same patient's summary
     * doesn't re-run the full set of section queries every time.
     */
    public function getSummary(int $patientId): ?array
    {
        return Cache::remember("health_summary:{$patientId}", 60, fn () => $this->buildSummary($patientId));
    }

    private function buildSummary(int $patientId): ?array
    {
        $patient = $this->fetchPatient($patientId);

        if (!$patient) {
            return null;
        }

        return [
            'demographics' => [
                'patient_no'   => $patient['patient_no'],
                'first_name'   => $patient['first_name'],
                'middle_name'  => $patient['middle_name'],
                'last_name'    => $patient['last_name'],
                'suffix'       => $patient['suffix'],
                'sex'          => $patient['sex'],
                'birthdate'    => $patient['birthdate'],
                'civil_status' => $patient['civil_status'],
                'blood_type'   => $patient['blood_type'],
                'race'         => $patient['race'],
                'ethnicity'    => $patient['ethnicity'],
                'religion'     => $patient['religion'],
                'language'     => $patient['language'],
                'height'       => $patient['height'],
                'weight'       => $patient['weight'],
                'address_line' => $patient['contact_address_line'],
                'city'         => $patient['contact_city'],
                'province'     => $patient['contact_province'],
                'zip_code'     => $patient['contact_zip_code'],
                'home_phone'   => $patient['contact_home_phone'],
                'mobile_phone' => $patient['contact_mobile_phone'],
                'work_phone'   => $patient['contact_work_phone'],
                'email'        => $patient['contact_email']
            ],
            'care_provider' => $patient['provider_id'] ? [
                'first_name'      => $patient['provider_first_name'],
                'last_name'       => $patient['provider_last_name'],
                'specialty'       => $patient['provider_specialty'],
                'department_name' => $patient['provider_department_name'],
                'npi_number'      => $patient['provider_npi_number'],
                'license_number'  => $patient['provider_license_number'],
                'dea_number'      => $patient['provider_dea_number'],
                'phone'           => $patient['provider_phone'],
                'email'           => $patient['provider_email']
            ] : null,
            'allergies'            => $this->patientAllergyService->list($patientId),
            'medications'          => $this->patientMedicationService->list($patientId),
            'prescriptions'        => $this->patientPrescriptionService->list($patientId),
            'clinical_reminders'   => [],
            'problems'             => $this->patientMedicalProblemService->list($patientId),
            'procedures'           => [],
            'results'              => [],
            'advance_directives'   => [],
            'functional_status'    => [],
            'encounters'           => $this->appointmentService->list(null, $patientId),
            'immunizations'        => $this->patientImmunizationService->list($patientId),
            'payers'               => [],
            'assessments'          => [],
            'treatment_plan'       => [],
            'goals'                => [],
            'health_concerns'      => [],
            'reasons_for_referral' => [],
            'mental_status'        => [],
            'social_history'       => [],
            'vital_signs'          => [],
            'medical_equipment'    => []
        ];
    }

    /**
     * Fetch the patient record belonging to a logged-in patient user (self-view).
     */
    public function fetchPatientByUserId(int $userId): ?array
    {
        return $this->fetchPatientBy('p.user_id', $userId);
    }

    /**
     * Fetch a single patient with contact and care provider details.
     */
    public function fetchPatient(int $patientId): ?array
    {
        return $this->fetchPatientBy('p.id', $patientId);
    }

    private function fetchPatientBy(string $column, int $value): ?array
    {
        $stmt = Database::connection()->prepare(
            "SELECT p.*,
                    pe.first_name AS provider_first_name,
                    pe.last_name AS provider_last_name,
                    pe.email AS provider_email,
                    pe.phone AS provider_phone,
                    pr.specialty AS provider_specialty,
                    pr.npi_number AS provider_npi_number,
                    pr.license_number AS provider_license_number,
                    pr.dea_number AS provider_dea_number,
                    d.name AS provider_department_name,
                    pc.address_line AS contact_address_line,
                    pc.city AS contact_city,
                    pc.province AS contact_province,
                    pc.zip_code AS contact_zip_code,
                    pc.home_phone AS contact_home_phone,
                    pc.mobile_phone AS contact_mobile_phone,
                    pc.work_phone AS contact_work_phone,
                    pc.email AS contact_email
             FROM patients p
             LEFT JOIN providers pr ON pr.id = p.provider_id
             LEFT JOIN employees pe ON pe.id = pr.employee_id
             LEFT JOIN departments d ON d.id = pe.department_id
             LEFT JOIN patient_contacts pc ON pc.patient_id = p.id
             WHERE {$column} = :value AND p.deleted_at IS NULL"
        );

        $stmt->execute(['value' => $value]);

        $patient = $stmt->fetch(PDO::FETCH_ASSOC);

        return $patient ?: null;
    }
}
