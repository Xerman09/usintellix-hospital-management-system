<?php

namespace App\Modules\Patients\Services;

use App\Core\Database;
use App\Modules\Patients\Models\Patient;
use App\Modules\Providers\Models\Provider;
use App\Modules\Users\Models\User;
use PDO;
use Throwable;

class PatientService
{
    /**
     * List all active (non-deleted) patients for a tenant, with their assigned provider.
     */
    public function list(int $tenantId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT p.*,
                    pr.first_name AS provider_first_name,
                    pr.last_name AS provider_last_name
             FROM patients p
             LEFT JOIN providers pr ON pr.id = p.provider_id
             WHERE p.tenant_id = :tenant_id AND p.deleted_at IS NULL
             ORDER BY p.last_name, p.first_name"
        );

        $stmt->execute(['tenant_id' => $tenantId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Soft-delete a patient (admin-only).
     */
    public function remove(int $id, int $tenantId, int $deletedBy): array
    {
        $patient = (new Patient())
            ->where('id', $id)
            ->where('tenant_id', $tenantId)
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
             WHERE id = :id AND tenant_id = :tenant_id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id'         => $id,
            'tenant_id'  => $tenantId
        ]);

        return [
            'success' => true,
            'message' => 'Patient deleted successfully.'
        ];
    }

    /**
     * Update an existing patient's demographic record.
     */
    public function update(int $id, array $data, int $tenantId, int $updatedBy): array
    {
        $patient = (new Patient())
            ->where('id', $id)
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Patient not found.'
            ];
        }

        $errors = $this->validateDemographics($data, $tenantId);

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
            'height'       => $data['height'],
            'weight'       => $data['weight'],
            'updated_at'   => date('Y-m-d H:i:s'),
            'updated_by'   => $updatedBy
        ], $id);

        return [
            'success' => true,
            'message' => 'Patient updated successfully.'
        ];
    }

    /**
     * Register a new patient account (receptionist-only).
     */
    public function register(array $data, int $tenantId, int $createdBy): array
    {
        $errors = $this->validate($data, $tenantId);

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
                'tenant_id'  => $tenantId,
                'username'   => $data['username'],
                'password'   => User::hashPassword($data['password']),
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $createdBy
            ]);

            if (!$userId) {
                throw new \RuntimeException('Failed to create user account.');
            }

            $patientNo = $this->generatePatientNo($tenantId);

            $patientId = (new Patient())->create([
                'tenant_id'    => $tenantId,
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
                'height'       => $data['height'],
                'weight'       => $data['weight'],
                'created_at'   => date('Y-m-d H:i:s'),
                'created_by'   => $createdBy
            ]);

            if (!$patientId) {
                throw new \RuntimeException('Failed to create patient record.');
            }

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
    private function validate(array $data, int $tenantId): array
    {
        $errors = [];

        if (empty($data['username'])) {
            $errors['username'] = 'Username is required.';
        }

        if (empty($data['password'])) {
            $errors['password'] = 'Password is required.';
        }

        $errors = array_merge($errors, $this->validateDemographics($data, $tenantId));

        if (!empty($errors)) {
            return $errors;
        }

        if ((new User())->where('tenant_id', $tenantId)->where('username', $data['username'])->first()) {
            $errors['username'] = 'Username is already taken.';
        }

        return $errors;
    }

    /**
     * Validate the demographic fields shared by registration and updates.
     */
    private function validateDemographics(array $data, int $tenantId): array
    {
        $errors = $this->missingDemographics($data);

        if (!empty($errors)) {
            return $errors;
        }

        if (!in_array($data['sex'], ['male', 'female'], true)) {
            $errors['sex'] = 'Sex must be male or female.';
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
                ->where('tenant_id', $tenantId)
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
     * Generate a tenant-scoped sequential patient number.
     */
    private function generatePatientNo(int $tenantId): string
    {
        $count = count((new Patient())->where('tenant_id', $tenantId)->get());

        return 'PAT-' . str_pad((string) ($count + 1), 6, '0', STR_PAD_LEFT);
    }
}
