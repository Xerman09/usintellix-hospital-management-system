<?php

namespace App\Modules\Patients\Services;

use App\Core\Database;
use App\Modules\Patients\Models\Patient;
use App\Modules\Users\Models\User;
use Throwable;

class PatientService
{
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

        $required = [
            'username', 'password', 'first_name', 'last_name', 'sex',
            'birthdate', 'civil_status', 'blood_type', 'height', 'weight'
        ];

        foreach ($required as $field) {
            if (empty($data[$field]) && $data[$field] !== '0') {
                $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
            }
        }

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

        if ((new User())->where('tenant_id', $tenantId)->where('username', $data['username'])->first()) {
            $errors['username'] = 'Username is already taken.';
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
