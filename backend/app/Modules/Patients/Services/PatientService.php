<?php

namespace App\Modules\Patients\Services;

use App\Core\Database;
use App\Core\FieldEncryption;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Models\PatientContact;
use App\Modules\Patients\Models\PatientEmployer;
use App\Modules\Patients\Models\PatientGuardian;
use App\Modules\Providers\Models\Provider;
use App\Modules\Users\Models\User;
use App\Core\AuditLogger;
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

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return FieldEncryption::decryptRows($rows, ['ssn', 'national_id']);
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
     * Flips a patient's `is_indigent` flag -- used by Reports > Insurance
     * > Indigents to mark/unmark who belongs on that report. Deliberately
     * separate from update() rather than folded into it: update() always
     * requires a full, valid demographics payload (name/sex/birthdate/
     * height/weight, etc.), and a screen whose whole job is toggling one
     * unrelated boolean shouldn't have to round-trip the patient's entire
     * record just to avoid failing that validation.
     */
    public function setIndigentStatus(int $id, bool $isIndigent, int $updatedBy): array
    {
        $patient = (new Patient())->where('id', $id)->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Patient not found.'];
        }

        (new Patient())->update([
            'is_indigent' => $isIndigent ? 1 : 0,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $updatedBy
        ], $id);

        return ['success' => true, 'message' => 'Updated successfully.'];
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
            'allow_voicemail'   => $this->normalizeYesNo($data['allow_voicemail'] ?? null),
            'allow_email'       => $this->normalizeYesNo($data['allow_email'] ?? null),
            'allow_hie'         => $this->normalizeYesNo($data['allow_hie'] ?? null),
            'allow_postcard'    => $this->normalizeYesNo($data['allow_postcard'] ?? null),
            'preferred_contact_method' => $this->normalizePreferredContact($data['preferred_contact_method'] ?? null),
            'confidential_address_line' => array_key_exists('confidential_address_line', $data) ? ($data['confidential_address_line'] ?: null) : ($patient['confidential_address_line'] ?? null),
            'confidential_city' => array_key_exists('confidential_city', $data) ? ($data['confidential_city'] ?: null) : ($patient['confidential_city'] ?? null),
            'confidential_state' => array_key_exists('confidential_state', $data) ? ($data['confidential_state'] ?: null) : ($patient['confidential_state'] ?? null),
            'confidential_postal_code' => array_key_exists('confidential_postal_code', $data) ? ($data['confidential_postal_code'] ?: null) : ($patient['confidential_postal_code'] ?? null),
            'confidential_phone' => array_key_exists('confidential_phone', $data) ? ($data['confidential_phone'] ?: null) : ($patient['confidential_phone'] ?? null),
            'confidential_email' => array_key_exists('confidential_email', $data) ? ($data['confidential_email'] ?: null) : ($patient['confidential_email'] ?? null),
            'communication_restrictions_notes' => array_key_exists('communication_restrictions_notes', $data) ? ($data['communication_restrictions_notes'] ?: null) : ($patient['communication_restrictions_notes'] ?? null),
            'has_confidential_restrictions' => $this->determineHasRestrictions($data, $patient),
            'height'       => $data['height'],
            'weight'       => $data['weight'],
            'ssn'          => array_key_exists('ssn', $data) ? ($data['ssn'] ?: null) : ($patient['ssn'] ?? null),
            'national_id'  => array_key_exists('national_id', $data) ? ($data['national_id'] ?: null) : ($patient['national_id'] ?? null),
            'date_deceased'   => $data['date_deceased'] ?? null,
            'reason_deceased' => $data['reason_deceased'] ?? null,
            'updated_at'   => date('Y-m-d H:i:s'),
            'updated_by'   => $updatedBy
        ], $id);

        $hasRestrictions = $this->determineHasRestrictions($data, $patient);
        $prevRestrictions = (bool) ($patient['has_confidential_restrictions'] ?? 0);
        $this->logConfidentialPreferencesChange($id, array_merge($patient, $data, ['has_confidential_restrictions' => $hasRestrictions]), $updatedBy);

        if ($hasRestrictions !== $prevRestrictions) {
            $action = $hasRestrictions ? AuditLogger::ACTION_CONFIDENTIAL_COMM_RESTRICTION_SET : AuditLogger::ACTION_CONFIDENTIAL_COMM_RESTRICTION_REMOVED;
            AuditLogger::log(
                AuditLogger::CATEGORY_COMMUNICATIONS,
                $action,
                "Demographic update modified 45 CFR § 164.522(b) confidential communications restrictions for patient ID {$id}: " . ($hasRestrictions ? 'RESTRICTIONS ACTIVE' : 'RESTRICTIONS CLEARED'),
                $id,
                $updatedBy
            );
        }

        $this->upsertContact($id, $data, $updatedBy);
        $this->upsertEmployer($id, $data, $updatedBy);
        $this->upsertGuardian($id, $data, $updatedBy);

        return [
            'success' => true,
            'message' => 'Patient updated successfully.'
        ];
    }

    /**
     * Upload/replace a patient's photo.
     */
    public function uploadPhoto(int $id, array $file, int $updatedBy): array
    {
        $patient = (new Patient())->where('id', $id)->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Patient not found.'
            ];
        }

        if (empty($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return [
                'success' => false,
                'message' => 'No image was uploaded.'
            ];
        }

        $allowedTypes = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            'image/gif'  => 'gif'
        ];

        $mimeType = mime_content_type($file['tmp_name']);

        if (!isset($allowedTypes[$mimeType])) {
            return [
                'success' => false,
                'message' => 'Only JPG, PNG, WEBP, or GIF images are allowed.'
            ];
        }

        if ($file['size'] > 2 * 1024 * 1024) {
            return [
                'success' => false,
                'message' => 'Image must be 2MB or smaller.'
            ];
        }

        $uploadDir = dirname(__DIR__, 4) . '/public/uploads/patient_photos';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filename = 'patient_' . $id . '_' . time() . '.' . $allowedTypes[$mimeType];
        $destination = $uploadDir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            return [
                'success' => false,
                'message' => 'Failed to save the uploaded image.'
            ];
        }

        if (!empty($patient['photo'])) {
            $oldPath = dirname(__DIR__, 4) . '/public' . $patient['photo'];

            if (is_file($oldPath)) {
                @unlink($oldPath);
            }
        }

        $photoPath = '/uploads/patient_photos/' . $filename;

        (new Patient())->update([
            'photo'      => $photoPath,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $updatedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Patient photo updated successfully.',
            'data' => [
                'photo' => $photoPath
            ]
        ];
    }

    /**
     * Remove a patient's photo, reverting to the initial-letter avatar.
     */
    public function removePhoto(int $id, int $updatedBy): array
    {
        $patient = (new Patient())->where('id', $id)->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Patient not found.'
            ];
        }

        if (!empty($patient['photo'])) {
            $path = dirname(__DIR__, 4) . '/public' . $patient['photo'];

            if (is_file($path)) {
                @unlink($path);
            }
        }

        (new Patient())->update([
            'photo'      => null,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $updatedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Patient photo removed successfully.'
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
        $maxAttempts = 5;

        for ($attempt = 1; $attempt <= $maxAttempts; $attempt++) {
            $db->beginTransaction();

            try {
                $userId = (new User())->create([
                    'username'             => $data['username'],
                    'password'             => User::hashPassword($data['password']),
                    'must_change_password' => 1,
                    'created_at'           => date('Y-m-d H:i:s'),
                    'created_by'           => $createdBy
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
                    'allow_voicemail'   => $this->normalizeYesNo($data['allow_voicemail'] ?? null),
                    'allow_email'       => $this->normalizeYesNo($data['allow_email'] ?? null),
                    'allow_hie'         => $this->normalizeYesNo($data['allow_hie'] ?? null),
                    'allow_postcard'    => $this->normalizeYesNo($data['allow_postcard'] ?? null),
                    'preferred_contact_method' => $this->normalizePreferredContact($data['preferred_contact_method'] ?? null),
                    'confidential_address_line' => !empty($data['confidential_address_line']) ? $data['confidential_address_line'] : null,
                    'confidential_city' => !empty($data['confidential_city']) ? $data['confidential_city'] : null,
                    'confidential_state' => !empty($data['confidential_state']) ? $data['confidential_state'] : null,
                    'confidential_postal_code' => !empty($data['confidential_postal_code']) ? $data['confidential_postal_code'] : null,
                    'confidential_phone' => !empty($data['confidential_phone']) ? $data['confidential_phone'] : null,
                    'confidential_email' => !empty($data['confidential_email']) ? $data['confidential_email'] : null,
                    'communication_restrictions_notes' => !empty($data['communication_restrictions_notes']) ? $data['communication_restrictions_notes'] : null,
                    'has_confidential_restrictions' => $this->determineHasRestrictions($data),
                    'height'       => $data['height'],
                    'weight'       => $data['weight'],
                    'ssn'          => !empty($data['ssn']) ? $data['ssn'] : null,
                    'national_id'  => !empty($data['national_id']) ? $data['national_id'] : null,
                    'date_deceased'   => $data['date_deceased'] ?? null,
                    'reason_deceased' => $data['reason_deceased'] ?? null,
                    'created_at'   => date('Y-m-d H:i:s'),
                    'created_by'   => $createdBy
                ]);

                if (!$patientId) {
                    throw new \RuntimeException('Failed to create patient record.');
                }

                $hasRestrictions = $this->determineHasRestrictions($data);
                $this->logConfidentialPreferencesChange($patientId, array_merge($data, ['has_confidential_restrictions' => $hasRestrictions]), $createdBy, 'INITIAL_PREFERENCES_RECORDED');

                if ($hasRestrictions) {
                    AuditLogger::log(
                        AuditLogger::CATEGORY_COMMUNICATIONS,
                        AuditLogger::ACTION_CONFIDENTIAL_COMM_RESTRICTION_SET,
                        "Initial registration established 45 CFR § 164.522(b) confidential communication restrictions for patient ID {$patientId}",
                        $patientId,
                        $createdBy
                    );
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

                $isPatientNoCollision = $e instanceof \PDOException
                    && ($e->errorInfo[1] ?? null) === 1062
                    && str_contains($e->getMessage(), 'patient_no');

                if ($isPatientNoCollision && $attempt < $maxAttempts) {
                    continue;
                }

                error_log('Patient registration failed: ' . $e->getMessage());

                return [
                    'success' => false,
                    'message' => 'Failed to register patient.'
                ];
            }
        }

        return [
            'success' => false,
            'message' => 'Failed to register patient.'
        ];
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
     *
     * Derived from the highest patient_no already in use (not a row COUNT),
     * so it stays correct even if past rows were removed and the count no
     * longer matches the highest number issued.
     */
    private function generatePatientNo(): string
    {
        $stmt = Database::connection()->query(
            "SELECT MAX(CAST(SUBSTRING(patient_no, 5) AS UNSIGNED)) AS max_no FROM patients"
        );

        $maxNo = (int) ($stmt->fetch(PDO::FETCH_ASSOC)['max_no'] ?? 0);

        return 'PAT-' . str_pad((string) ($maxNo + 1), 6, '0', STR_PAD_LEFT);
    }

    /**
     * Normalize preferred contact method to valid statutory enum or null.
     */
    private function normalizePreferredContact(?string $value): ?string
    {
        $allowed = ['mobile_phone', 'home_phone', 'work_phone', 'email', 'postal_mail', 'confidential_address'];
        return in_array($value, $allowed, true) ? $value : null;
    }

    /**
     * Evaluate whether active confidential communications restrictions are in effect (§ 164.522(b)).
     */
    private function determineHasRestrictions(array $data, ?array $existing = null): int
    {
        // Explicit boolean toggle takes priority if provided
        if (isset($data['has_confidential_restrictions'])) {
            return !empty($data['has_confidential_restrictions']) && $data['has_confidential_restrictions'] !== '0' ? 1 : 0;
        }

        // Otherwise auto-detect from binding preference values
        $allowVoicemail = array_key_exists('allow_voicemail', $data) ? $data['allow_voicemail'] : ($existing['allow_voicemail'] ?? null);
        $allowVoiceCalls = array_key_exists('allow_voice_calls', $data) ? $data['allow_voice_calls'] : ($existing['allow_voice_calls'] ?? null);
        $allowSms = array_key_exists('allow_sms', $data) ? $data['allow_sms'] : ($existing['allow_sms'] ?? null);
        $preferred = array_key_exists('preferred_contact_method', $data) ? $data['preferred_contact_method'] : ($existing['preferred_contact_method'] ?? null);
        
        $altAddressVal = array_key_exists('confidential_address_line', $data) ? $data['confidential_address_line'] : ($existing['confidential_address_line'] ?? null);
        $altAddress = !empty(trim((string) $altAddressVal));
        
        $altPhoneVal = array_key_exists('confidential_phone', $data) ? $data['confidential_phone'] : ($existing['confidential_phone'] ?? null);
        $altPhone = !empty(trim((string) $altPhoneVal));
        
        $notesVal = array_key_exists('communication_restrictions_notes', $data) ? $data['communication_restrictions_notes'] : ($existing['communication_restrictions_notes'] ?? null);
        $notes = !empty(trim((string) $notesVal));

        if ($allowVoicemail === 'no' || $allowVoiceCalls === 'no' || $allowSms === 'no' || $preferred === 'confidential_address' || $altAddress || $altPhone || $notes) {
            return 1;
        }

        return 0;
    }

    /**
     * Record change in hipaa_confidential_communications_log table.
     */
    private function logConfidentialPreferencesChange(int $patientId, array $data, int $operatorId, string $action = 'PREFERENCES_UPDATED'): void
    {
        try {
            $db = Database::connection();
            $stmt = $db->prepare("
                INSERT INTO hipaa_confidential_communications_log
                    (patient_id, operator_id, allow_voicemail, allow_sms, allow_voice_calls, allow_email, allow_postcard,
                     preferred_contact_method, confidential_address, confidential_phone, confidential_email,
                     restriction_notes, has_restrictions, action, created_at)
                VALUES
                    (:patient_id, :operator_id, :allow_voicemail, :allow_sms, :allow_voice_calls, :allow_email, :allow_postcard,
                     :preferred_contact_method, :confidential_address, :confidential_phone, :confidential_email,
                     :restriction_notes, :has_restrictions, :action, :created_at)
            ");

            $confAddress = trim(implode(', ', array_filter([
                $data['confidential_address_line'] ?? null,
                $data['confidential_city'] ?? null,
                $data['confidential_state'] ?? null,
                $data['confidential_postal_code'] ?? null
            ])));

            $stmt->execute([
                'patient_id' => $patientId,
                'operator_id' => $operatorId,
                'allow_voicemail' => $data['allow_voicemail'] ?? null,
                'allow_sms' => $data['allow_sms'] ?? null,
                'allow_voice_calls' => $data['allow_voice_calls'] ?? null,
                'allow_email' => $data['allow_email'] ?? null,
                'allow_postcard' => $data['allow_postcard'] ?? null,
                'preferred_contact_method' => $data['preferred_contact_method'] ?? null,
                'confidential_address' => $confAddress ?: null,
                'confidential_phone' => $data['confidential_phone'] ?? null,
                'confidential_email' => $data['confidential_email'] ?? null,
                'restriction_notes' => $data['communication_restrictions_notes'] ?? null,
                'has_restrictions' => (int) ($data['has_confidential_restrictions'] ?? 0),
                'action' => $action,
                'created_at' => date('Y-m-d H:i:s')
            ]);
        } catch (\Throwable $e) {
            error_log('Failed to log confidential communications change: ' . $e->getMessage());
        }
    }

    /**
     * Get a patient's confidential communications preference profile (§ 164.522(b)).
     */
    public function getConfidentialPreferences(int $patientId): array
    {
        $patient = (new Patient())->where('id', $patientId)->first();
        if (!$patient || $patient['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Patient not found.'];
        }

        $hasRestrictions = (bool) ($patient['has_confidential_restrictions'] ?? 0);
        
        // Build concise human-readable warnings for banner/tooltip
        $warnings = [];
        if (($patient['allow_voicemail'] ?? null) === 'no') {
            $warnings[] = 'VOICEMAIL PROHIBITED: Do not leave clinical or appointment messages on voicemail.';
        }
        if (($patient['allow_voice_calls'] ?? null) === 'no') {
            $warnings[] = 'VOICE CALLS PROHIBITED: Do not contact via standard voice telephone.';
        }
        if (($patient['allow_sms'] ?? null) === 'no') {
            $warnings[] = 'SMS PROHIBITED: Do not send text messages or SMS reminders.';
        }
        if (!empty($patient['preferred_contact_method'])) {
            $labels = [
                'mobile_phone' => 'Mobile Phone Only',
                'home_phone' => 'Home Phone Only',
                'work_phone' => 'Work Phone Only',
                'email' => 'Email Only',
                'postal_mail' => 'Postal Mail Only',
                'confidential_address' => 'Confidential Address / P.O. Box Only'
            ];
            $warnings[] = 'PREFERRED CONTACT: ' . ($labels[$patient['preferred_contact_method']] ?? $patient['preferred_contact_method']);
        }
        if (!empty($patient['confidential_address_line'])) {
            $addr = $patient['confidential_address_line'];
            if (!empty($patient['confidential_city'])) $addr .= ', ' . $patient['confidential_city'];
            if (!empty($patient['confidential_state'])) $addr .= ', ' . $patient['confidential_state'];
            if (!empty($patient['confidential_postal_code'])) $addr .= ' ' . $patient['confidential_postal_code'];
            $warnings[] = 'CONFIDENTIAL MAILING ADDRESS: ' . $addr;
        }
        if (!empty($patient['confidential_phone'])) {
            $warnings[] = 'CONFIDENTIAL ALTERNATIVE PHONE: ' . $patient['confidential_phone'];
        }
        if (!empty($patient['communication_restrictions_notes'])) {
            $warnings[] = 'RESTRICTION INSTRUCTIONS: ' . $patient['communication_restrictions_notes'];
        }

        return [
            'success' => true,
            'statutory_citation' => '45 CFR § 164.522(b)',
            'data' => [
                'patient_id' => $patientId,
                'patient_no' => $patient['patient_no'],
                'patient_name' => trim("{$patient['first_name']} {$patient['last_name']}"),
                'has_confidential_restrictions' => $hasRestrictions,
                'allow_voicemail' => $patient['allow_voicemail'],
                'allow_sms' => $patient['allow_sms'],
                'allow_voice_calls' => $patient['allow_voice_calls'],
                'allow_email' => $patient['allow_email'],
                'allow_postcard' => $patient['allow_postcard'],
                'preferred_contact_method' => $patient['preferred_contact_method'],
                'confidential_address_line' => $patient['confidential_address_line'],
                'confidential_city' => $patient['confidential_city'],
                'confidential_state' => $patient['confidential_state'],
                'confidential_postal_code' => $patient['confidential_postal_code'],
                'confidential_phone' => $patient['confidential_phone'],
                'confidential_email' => $patient['confidential_email'],
                'communication_restrictions_notes' => $patient['communication_restrictions_notes'],
                'warnings' => $warnings,
                'summary_text' => !empty($warnings) ? implode(' | ', $warnings) : 'No confidential communication restrictions in effect.'
            ]
        ];
    }

    /**
     * Direct update of confidential communication preferences (§ 164.522(b)).
     */
    public function setConfidentialPreferences(int $patientId, array $data, int $updatedBy): array
    {
        $patient = (new Patient())->where('id', $patientId)->first();
        if (!$patient || $patient['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Patient not found.'];
        }

        $allowVoicemail = isset($data['allow_voicemail']) ? $this->normalizeYesNo($data['allow_voicemail']) : $patient['allow_voicemail'];
        $allowSms = isset($data['allow_sms']) ? $this->normalizeYesNo($data['allow_sms']) : $patient['allow_sms'];
        $allowVoiceCalls = isset($data['allow_voice_calls']) ? $this->normalizeYesNo($data['allow_voice_calls']) : $patient['allow_voice_calls'];
        $allowEmail = isset($data['allow_email']) ? $this->normalizeYesNo($data['allow_email']) : $patient['allow_email'];
        $allowPostcard = isset($data['allow_postcard']) ? $this->normalizeYesNo($data['allow_postcard']) : $patient['allow_postcard'];
        $preferred = isset($data['preferred_contact_method']) ? $this->normalizePreferredContact($data['preferred_contact_method']) : $patient['preferred_contact_method'];
        $confAddressLine = array_key_exists('confidential_address_line', $data) ? ($data['confidential_address_line'] ?: null) : $patient['confidential_address_line'];
        $confCity = array_key_exists('confidential_city', $data) ? ($data['confidential_city'] ?: null) : $patient['confidential_city'];
        $confState = array_key_exists('confidential_state', $data) ? ($data['confidential_state'] ?: null) : $patient['confidential_state'];
        $confPostalCode = array_key_exists('confidential_postal_code', $data) ? ($data['confidential_postal_code'] ?: null) : $patient['confidential_postal_code'];
        $confPhone = array_key_exists('confidential_phone', $data) ? ($data['confidential_phone'] ?: null) : $patient['confidential_phone'];
        $confEmail = array_key_exists('confidential_email', $data) ? ($data['confidential_email'] ?: null) : $patient['confidential_email'];
        $notes = array_key_exists('communication_restrictions_notes', $data) ? ($data['communication_restrictions_notes'] ?: null) : $patient['communication_restrictions_notes'];

        $mergedData = [
            'allow_voicemail' => $allowVoicemail,
            'allow_sms' => $allowSms,
            'allow_voice_calls' => $allowVoiceCalls,
            'allow_email' => $allowEmail,
            'allow_postcard' => $allowPostcard,
            'preferred_contact_method' => $preferred,
            'confidential_address_line' => $confAddressLine,
            'confidential_city' => $confCity,
            'confidential_state' => $confState,
            'confidential_postal_code' => $confPostalCode,
            'confidential_phone' => $confPhone,
            'confidential_email' => $confEmail,
            'communication_restrictions_notes' => $notes,
        ];
        if (isset($data['has_confidential_restrictions'])) {
            $mergedData['has_confidential_restrictions'] = $data['has_confidential_restrictions'];
        }

        $hasRestrictions = $this->determineHasRestrictions($mergedData, $patient);
        $mergedData['has_confidential_restrictions'] = $hasRestrictions;

        (new Patient())->update([
            'allow_voicemail' => $allowVoicemail,
            'allow_sms' => $allowSms,
            'allow_voice_calls' => $allowVoiceCalls,
            'allow_email' => $allowEmail,
            'allow_postcard' => $allowPostcard,
            'preferred_contact_method' => $preferred,
            'confidential_address_line' => $confAddressLine,
            'confidential_city' => $confCity,
            'confidential_state' => $confState,
            'confidential_postal_code' => $confPostalCode,
            'confidential_phone' => $confPhone,
            'confidential_email' => $confEmail,
            'communication_restrictions_notes' => $notes,
            'has_confidential_restrictions' => $hasRestrictions,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $updatedBy
        ], $patientId);

        $action = $hasRestrictions ? AuditLogger::ACTION_CONFIDENTIAL_COMM_RESTRICTION_SET : AuditLogger::ACTION_CONFIDENTIAL_COMM_RESTRICTION_REMOVED;
        $this->logConfidentialPreferencesChange($patientId, $mergedData, $updatedBy, $action);

        AuditLogger::log(
            AuditLogger::CATEGORY_COMMUNICATIONS,
            $action,
            "Updated 45 CFR § 164.522(b) confidential communications preferences for patient ID {$patientId}: " . ($hasRestrictions ? 'RESTRICTIONS ACTIVE' : 'RESTRICTIONS CLEARED'),
            $patientId,
            $updatedBy
        );

        return $this->getConfidentialPreferences($patientId);
    }

    /**
     * Export active confidential communications registry to RFC 4180 CSV (§ 164.522(b)).
     */
    public function exportConfidentialRegistryCsv(): string
    {
        $db = Database::connection();
        $stmt = $db->query("
            SELECT p.id, p.patient_no, p.first_name, p.last_name, p.birthdate,
                   p.allow_voicemail, p.allow_sms, p.allow_voice_calls, p.allow_email, p.allow_postcard,
                   p.preferred_contact_method, p.confidential_address_line, p.confidential_city,
                   p.confidential_state, p.confidential_postal_code, p.confidential_phone, p.confidential_email,
                   p.communication_restrictions_notes, p.has_confidential_restrictions, p.updated_at
            FROM patients p
            WHERE p.deleted_at IS NULL AND p.has_confidential_restrictions = 1
            ORDER BY p.last_name, p.first_name
        ");
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $output = fopen('php://temp', 'r+');
        fputcsv($output, ['# USIntellix Healthcare System - HIPAA Confidential Communications Registry']);
        fputcsv($output, ['# Statutory Citation: 45 CFR § 164.522(b) (Patient Right to Request Confidential Communications)']);
        fputcsv($output, ['# Generated: ' . date('Y-m-d H:i:s') . ' UTC']);
        fputcsv($output, ['# Total Active Restrictions: ' . count($rows)]);
        fputcsv($output, []);
        fputcsv($output, [
            'Patient ID', 'Patient No', 'Patient Name', 'Birthdate', 'Restrictions Enforced',
            'Allow Voicemail', 'Allow SMS', 'Allow Voice Calls', 'Allow Email', 'Allow Postcard',
            'Preferred Contact Method', 'Confidential Address Line', 'Confidential City',
            'Confidential State', 'Confidential Postal Code', 'Confidential Phone', 'Confidential Email',
            'Restriction Instructions / Notes', 'Last Updated'
        ]);

        foreach ($rows as $r) {
            fputcsv($output, [
                $r['id'],
                $r['patient_no'],
                trim("{$r['first_name']} {$r['last_name']}"),
                $r['birthdate'],
                $r['has_confidential_restrictions'] ? 'YES' : 'NO',
                $r['allow_voicemail'] ?? 'Unassigned',
                $r['allow_sms'] ?? 'Unassigned',
                $r['allow_voice_calls'] ?? 'Unassigned',
                $r['allow_email'] ?? 'Unassigned',
                $r['allow_postcard'] ?? 'Unassigned',
                $r['preferred_contact_method'] ?? 'None Specified',
                $r['confidential_address_line'] ?? '',
                $r['confidential_city'] ?? '',
                $r['confidential_state'] ?? '',
                $r['confidential_postal_code'] ?? '',
                $r['confidential_phone'] ?? '',
                $r['confidential_email'] ?? '',
                $r['communication_restrictions_notes'] ?? '',
                $r['updated_at'] ?? ''
            ]);
        }

        rewind($output);
        $csv = stream_get_contents($output);
        fclose($output);

        AuditLogger::log(
            AuditLogger::CATEGORY_COMMUNICATIONS,
            AuditLogger::ACTION_CONFIDENTIAL_COMM_EXPORT,
            "Exported 45 CFR § 164.522(b) confidential communications registry to CSV (" . count($rows) . " records)"
        );

        return $csv;
    }
}

