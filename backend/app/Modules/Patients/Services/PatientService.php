<?php

namespace App\Modules\Patients\Services;

use App\Core\Database;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Models\PatientContact;
use App\Modules\Patients\Models\PatientEmployer;
use App\Modules\Patients\Models\PatientGuardian;
use App\Modules\Providers\Models\Provider;
use App\Modules\Users\Models\User;
use PDO;
use Throwable;

class PatientService
{
    /**
     * List all active (non-deleted) patients, with their assigned provider.
     * Pass $providerId to scope the list to a single provider (e.g. a doctor's own patients).
     */
    public function list(?int $providerId = null): array
    {
        $sql = "SELECT p.*,
                    pe.first_name AS provider_first_name,
                    pe.last_name AS provider_last_name,
                    pc.address_line AS contact_address_line,
                    pc.city AS contact_city,
                    pc.province AS contact_province,
                    pc.zip_code AS contact_zip_code,
                    pc.home_phone AS contact_home_phone,
                    pc.mobile_phone AS contact_mobile_phone,
                    pc.work_phone AS contact_work_phone,
                    pc.email AS contact_email,
                    pemp.occupation AS employer_occupation,
                    pemp.employer_name AS employer_name,
                    pemp.address_line AS employer_address_line,
                    pemp.address_line2 AS employer_address_line2,
                    pemp.city AS employer_city,
                    pemp.state AS employer_state,
                    pemp.postal_code AS employer_postal_code,
                    pemp.country AS employer_country,
                    pemp.industry AS employer_industry,
                    pemp.employment_start_date AS employer_employment_start_date,
                    pemp.employment_end_date AS employer_employment_end_date,
                    pg.guardian_name AS guardian_name,
                    pg.relationship AS guardian_relationship,
                    pg.sex AS guardian_sex,
                    pg.address AS guardian_address,
                    pg.city AS guardian_city,
                    pg.state AS guardian_state,
                    pg.postal_code AS guardian_postal_code,
                    pg.country AS guardian_country,
                    pg.phone AS guardian_phone,
                    pg.work_phone AS guardian_work_phone,
                    pg.email AS guardian_email
             FROM patients p
             LEFT JOIN providers pr ON pr.id = p.provider_id
             LEFT JOIN employees pe ON pe.id = pr.employee_id
             LEFT JOIN patient_contacts pc ON pc.patient_id = p.id
             LEFT JOIN patient_employers pemp ON pemp.patient_id = p.id
             LEFT JOIN patient_guardians pg ON pg.patient_id = p.id
             WHERE p.deleted_at IS NULL";

        $params = [];

        if ($providerId !== null) {
            $sql .= " AND p.provider_id = :provider_id";
            $params['provider_id'] = $providerId;
        }

        $sql .= " ORDER BY p.last_name, p.first_name";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Soft-delete a patient (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $patient = (new Patient())
            ->where('id', $id)
            ->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Patient not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE patients
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id'         => $id
        ]);

        return [
            'success' => true,
            'message' => 'Patient deleted successfully.'
        ];
    }

    /**
     * Update an existing patient's demographic record.
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $patient = (new Patient())
            ->where('id', $id)
            ->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Patient not found.'
            ];
        }

        $errors = $this->validateDemographics($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        (new Patient())->update([
            'provider_id'  => $data['provider_id'] ?? null,
            'first_name'   => $data['first_name'],
            'middle_name'  => $data['middle_name'] ?? null,
            'last_name'    => $data['last_name'],
            'suffix'       => $data['suffix'] ?? null,
            'sex'          => $data['sex'],
            'birthdate'    => $data['birthdate'],
            'civil_status' => $data['civil_status'],
            'blood_type'   => $data['blood_type'],
            'race'         => $data['race'] ?? null,
            'ethnicity'    => $data['ethnicity'] ?? null,
            'religion'     => $data['religion'] ?? null,
            'language'     => $data['language'] ?? null,
            'allow_sms'         => $this->normalizeYesNo($data['allow_sms'] ?? null),
            'allow_voice_calls' => $this->normalizeYesNo($data['allow_voice_calls'] ?? null),
            'allow_email'       => $this->normalizeYesNo($data['allow_email'] ?? null),
            'allow_hie'         => $this->normalizeYesNo($data['allow_hie'] ?? null),
            'height'       => $data['height'],
            'weight'       => $data['weight'],
            'date_deceased'   => $data['date_deceased'] ?? null,
            'reason_deceased' => $data['reason_deceased'] ?? null,
            'updated_at'   => date('Y-m-d H:i:s'),
            'updated_by'   => $updatedBy
        ], $id);

        $this->upsertContact($id, $data, $updatedBy);
        $this->upsertEmployer($id, $data, $updatedBy);
        $this->upsertGuardian($id, $data, $updatedBy);

        return [
            'success' => true,
            'message' => 'Patient updated successfully.'
        ];
    }

    /**
     * Create or update a patient's contact info record.
     */
    private function upsertContact(int $patientId, array $data, int $userId): void
    {
        $existing = (new PatientContact())->where('patient_id', $patientId)->first();

        $payload = [
            'address_line' => $data['address_line'] ?? null,
            'city'         => $data['city'] ?? null,
            'province'     => $data['province'] ?? null,
            'zip_code'     => $data['zip_code'] ?? null,
            'home_phone'   => $data['home_phone'] ?? null,
            'mobile_phone' => $data['mobile_phone'] ?? null,
            'work_phone'   => $data['work_phone'] ?? null,
            'email'        => $data['contact_email'] ?? null
        ];

        if ($existing) {
            $payload['updated_at'] = date('Y-m-d H:i:s');
            $payload['updated_by'] = $userId;

            (new PatientContact())->where('patient_id', $patientId)->update($payload);
            return;
        }

        $payload['patient_id'] = $patientId;
        $payload['created_at'] = date('Y-m-d H:i:s');
        $payload['created_by'] = $userId;

        (new PatientContact())->create($payload);
    }

    /**
     * Create or update a patient's employer info record.
     */
    private function upsertEmployer(int $patientId, array $data, int $userId): void
    {
        $existing = (new PatientEmployer())->where('patient_id', $patientId)->first();

        $payload = [
            'occupation'             => $data['employer_occupation'] ?? null,
            'employer_name'          => $data['employer_name'] ?? null,
            'address_line'           => $data['employer_address_line'] ?? null,
            'address_line2'          => $data['employer_address_line2'] ?? null,
            'city'                   => $data['employer_city'] ?? null,
            'state'                  => $data['employer_state'] ?? null,
            'postal_code'            => $data['employer_postal_code'] ?? null,
            'country'                => $data['employer_country'] ?? null,
            'industry'               => $data['employer_industry'] ?? null,
            'employment_start_date'  => $data['employer_employment_start_date'] ?? null,
            'employment_end_date'    => $data['employer_employment_end_date'] ?? null
        ];

        if ($existing) {
            $payload['updated_at'] = date('Y-m-d H:i:s');
            $payload['updated_by'] = $userId;

            (new PatientEmployer())->where('patient_id', $patientId)->update($payload);
            return;
        }

        $payload['patient_id'] = $patientId;
        $payload['created_at'] = date('Y-m-d H:i:s');
        $payload['created_by'] = $userId;

        (new PatientEmployer())->create($payload);
    }

    /**
     * Create or update a patient's guardian/related-person info record.
     */
    private function upsertGuardian(int $patientId, array $data, int $userId): void
    {
        $existing = (new PatientGuardian())->where('patient_id', $patientId)->first();

        $payload = [
            'guardian_name' => $data['guardian_name'] ?? null,
            'relationship'  => $data['guardian_relationship'] ?? null,
            'sex'           => (($data['guardian_sex'] ?? '') !== '') ? $data['guardian_sex'] : null,
            'address'       => $data['guardian_address'] ?? null,
            'city'          => $data['guardian_city'] ?? null,
            'state'         => $data['guardian_state'] ?? null,
            'postal_code'   => $data['guardian_postal_code'] ?? null,
            'country'       => $data['guardian_country'] ?? null,
            'phone'         => $data['guardian_phone'] ?? null,
            'work_phone'    => $data['guardian_work_phone'] ?? null,
            'email'         => $data['guardian_email'] ?? null
        ];

        if ($existing) {
            $payload['updated_at'] = date('Y-m-d H:i:s');
            $payload['updated_by'] = $userId;

            (new PatientGuardian())->where('patient_id', $patientId)->update($payload);
            return;
        }

        $payload['patient_id'] = $patientId;
        $payload['created_at'] = date('Y-m-d H:i:s');
        $payload['created_by'] = $userId;

        (new PatientGuardian())->create($payload);
    }

    /**
     * Register a new patient account (receptionist-only).
     */
    public function register(array $data, int $createdBy): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $db = Database::connection();
        $db->beginTransaction();

        try {
            $userId = (new User())->create([
                'username'   => $data['username'],
                'password'   => User::hashPassword($data['password']),
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $createdBy
            ]);

            if (!$userId) {
                throw new \RuntimeException('Failed to create user account.');
            }

            $patientNo = $this->generatePatientNo();

            $patientId = (new Patient())->create([
                'user_id'      => $userId,
                'provider_id'  => $data['provider_id'] ?? null,
                'patient_no'   => $patientNo,
                'first_name'   => $data['first_name'],
                'middle_name'  => $data['middle_name'] ?? null,
                'last_name'    => $data['last_name'],
                'suffix'       => $data['suffix'] ?? null,
                'sex'          => $data['sex'],
                'birthdate'    => $data['birthdate'],
                'civil_status' => $data['civil_status'],
                'blood_type'   => $data['blood_type'],
                'race'         => $data['race'] ?? null,
                'ethnicity'    => $data['ethnicity'] ?? null,
                'religion'     => $data['religion'] ?? null,
                'language'     => $data['language'] ?? null,
                'allow_sms'         => $this->normalizeYesNo($data['allow_sms'] ?? null),
                'allow_voice_calls' => $this->normalizeYesNo($data['allow_voice_calls'] ?? null),
                'allow_email'       => $this->normalizeYesNo($data['allow_email'] ?? null),
                'allow_hie'         => $this->normalizeYesNo($data['allow_hie'] ?? null),
                'height'       => $data['height'],
                'weight'       => $data['weight'],
                'date_deceased'   => $data['date_deceased'] ?? null,
                'reason_deceased' => $data['reason_deceased'] ?? null,
                'created_at'   => date('Y-m-d H:i:s'),
                'created_by'   => $createdBy
            ]);

            if (!$patientId) {
                throw new \RuntimeException('Failed to create patient record.');
            }

            $this->upsertContact($patientId, $data, $createdBy);
            $this->upsertEmployer($patientId, $data, $createdBy);
            $this->upsertGuardian($patientId, $data, $createdBy);

            $db->commit();

            return [
                'success' => true,
                'message' => 'Patient account created successfully.',
                'data' => [
                    'user_id'    => $userId,
                    'patient_id' => $patientId,
                    'patient_no' => $patientNo
                ]
            ];
        } catch (Throwable $e) {
            $db->rollBack();

            return [
                'success' => false,
                'message' => 'Failed to register patient.'
            ];
        }
    }

    /**
     * Validate registration input.
     */
    private function validate(array $data): array
    {
        $errors = [];

        if (empty($data['username'])) {
            $errors['username'] = 'Username is required.';
        }

        if (empty($data['password'])) {
            $errors['password'] = 'Password is required.';
        }

        $errors = array_merge($errors, $this->validateDemographics($data));

        if (!empty($errors)) {
            return $errors;
        }

        if ((new User())->where('username', $data['username'])->first()) {
            $errors['username'] = 'Username is already taken.';
        }

        return $errors;
    }

    /**
     * Validate the demographic fields shared by registration and updates.
     */
    private function validateDemographics(array $data): array
    {
        $errors = $this->missingDemographics($data);

        if (!empty($errors)) {
            return $errors;
        }

        if (!in_array($data['sex'], ['male', 'female'], true)) {
            $errors['sex'] = 'Sex must be male or female.';
        }

        if (strtotime($data['birthdate']) === false) {
            $errors['birthdate'] = 'Birthdate is not a valid date.';
        } elseif ($data['birthdate'] > date('Y-m-d')) {
            $errors['birthdate'] = 'Birthdate cannot be in the future.';
        }

        if (!is_numeric($data['height'])) {
            $errors['height'] = 'Height must be numeric.';
        }

        if (!is_numeric($data['weight'])) {
            $errors['weight'] = 'Weight must be numeric.';
        }

        if (!empty($data['provider_id'])) {
            $provider = (new Provider())
                ->where('id', (int) $data['provider_id'])
                ->first();

            if (!$provider || $provider['deleted_at'] !== null) {
                $errors['provider_id'] = 'Selected provider does not exist.';
            }
        }

        return $errors;
    }

    /**
     * Check required demographic fields are present.
     */
    private function missingDemographics(array $data): array
    {
        $errors = [];

        $required = [
            'first_name', 'last_name', 'sex',
            'birthdate', 'civil_status', 'blood_type', 'height', 'weight'
        ];

        foreach ($required as $field) {
            if (empty($data[$field]) && $data[$field] !== '0') {
                $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
            }
        }

        return $errors;
    }

    /**
     * Normalize a Choices dropdown value to 'yes', 'no', or null (unassigned).
     */
    private function normalizeYesNo(?string $value): ?string
    {
        return in_array($value, ['yes', 'no'], true) ? $value : null;
    }

    /**
     * Generate a sequential patient number.
     */
    private function generatePatientNo(): string
    {
        $count = count((new Patient())->get());

        return 'PAT-' . str_pad((string) ($count + 1), 6, '0', STR_PAD_LEFT);
    }
}
