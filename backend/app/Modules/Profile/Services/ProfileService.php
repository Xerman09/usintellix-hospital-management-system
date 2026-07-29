<?php

namespace App\Modules\Profile\Services;

use App\Modules\Departments\Models\Department;
use App\Modules\Employees\Models\Employee;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Models\PatientContact;
use App\Modules\Users\Models\User;

class ProfileService
{
    /**
     * Get the logged-in user's own profile, resolved from whichever
     * record (employee or patient) is linked to their account.
     */
    public function get(int $userId, string $sessionRole): array
    {
        $user = (new User())->where('id', $userId)->first();
        $employee = (new Employee())->where('user_id', $userId)->first();

        if ($employee) {
            $department = $employee['department_id']
                ? (new Department())->where('id', $employee['department_id'])->first()
                : null;

            return [
                'kind'            => 'employee',
                'id'              => (int) $user['id'],
                'username'        => $user['username'],
                'role'            => $sessionRole,
                'avatar'          => $user['avatar'] ?? null,
                'employee_no'     => $employee['employee_no'],
                'first_name'      => $employee['first_name'],
                'middle_name'     => $employee['middle_name'],
                'last_name'       => $employee['last_name'],
                'suffix'          => $employee['suffix'],
                'sex'             => $employee['sex'],
                'birthdate'       => $employee['birthdate'],
                'email'           => $employee['email'],
                'phone'           => $employee['phone'],
                'department_name' => $department['name'] ?? null,
            ];
        }

        $patient = (new Patient())->where('user_id', $userId)->first();

        if ($patient) {
            $contact = (new PatientContact())->where('patient_id', $patient['id'])->first();

            return [
                'kind'          => 'patient',
                'id'            => (int) $user['id'],
                'username'      => $user['username'],
                'role'          => $sessionRole,
                'avatar'        => $user['avatar'] ?? null,
                'patient_no'    => $patient['patient_no'],
                'first_name'    => $patient['first_name'],
                'middle_name'   => $patient['middle_name'],
                'last_name'     => $patient['last_name'],
                'suffix'        => $patient['suffix'],
                'sex'           => $patient['sex'],
                'birthdate'     => $patient['birthdate'],
                'civil_status'  => $patient['civil_status'],
                'blood_type'    => $patient['blood_type'],
                'address_line'  => $contact['address_line'] ?? null,
                'city'          => $contact['city'] ?? null,
                'province'      => $contact['province'] ?? null,
                'zip_code'      => $contact['zip_code'] ?? null,
                'home_phone'    => $contact['home_phone'] ?? null,
                'mobile_phone'  => $contact['mobile_phone'] ?? null,
                'work_phone'    => $contact['work_phone'] ?? null,
                'contact_email' => $contact['email'] ?? null,
            ];
        }

        return [
            'kind'     => 'account',
            'id'       => (int) $user['id'],
            'username' => $user['username'],
            'role'     => $sessionRole,
            'avatar'   => $user['avatar'] ?? null,
        ];
    }

    /**
     * Update the logged-in user's own record. Only self-service fields
     * (name and contact info) are editable here -- demographic/clinical
     * fields and administrative fields (role, department, provider)
     * stay staff-managed elsewhere.
     */
    public function update(int $userId, array $data): array
    {
        $employee = (new Employee())->where('user_id', $userId)->first();

        if ($employee) {
            return $this->updateEmployee($employee, $data, $userId);
        }

        $patient = (new Patient())->where('user_id', $userId)->first();

        if ($patient) {
            return $this->updatePatient($patient, $data, $userId);
        }

        return [
            'success' => false,
            'message' => 'Profile not found.'
        ];
    }

    private function updateEmployee(array $employee, array $data, int $userId): array
    {
        $errors = [];

        foreach (['first_name', 'last_name', 'email', 'phone'] as $field) {
            if (empty($data[$field])) {
                $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
            }
        }

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Enter a valid email address.';
        }

        $emailTaken = (new Employee())->where('email', $data['email'])->first();

        if ($emailTaken && (int) $emailTaken['id'] !== (int) $employee['id']) {
            $errors['email'] = 'Email is already registered.';
        }

        $phoneTaken = (new Employee())->where('phone', $data['phone'])->first();

        if ($phoneTaken && (int) $phoneTaken['id'] !== (int) $employee['id']) {
            $errors['phone'] = 'Phone number is already registered.';
        }

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        (new Employee())->update([
            'first_name'  => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name'   => $data['last_name'],
            'suffix'      => $data['suffix'] ?? null,
            'email'       => $data['email'],
            'phone'       => $data['phone'],
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $userId
        ], $employee['id']);

        return [
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => [
                'first_name' => $data['first_name'],
                'last_name'  => $data['last_name']
            ]
        ];
    }

    private function updatePatient(array $patient, array $data, int $userId): array
    {
        $errors = [];

        foreach (['first_name', 'last_name'] as $field) {
            if (empty($data[$field])) {
                $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
            }
        }

        if (!empty($data['contact_email']) && !filter_var($data['contact_email'], FILTER_VALIDATE_EMAIL)) {
            $errors['contact_email'] = 'Enter a valid email address.';
        }

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        (new Patient())->update([
            'first_name'  => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name'   => $data['last_name'],
            'suffix'      => $data['suffix'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $userId
        ], $patient['id']);

        $contactPayload = [
            'address_line' => $data['address_line'] ?? null,
            'city'         => $data['city'] ?? null,
            'province'     => $data['province'] ?? null,
            'zip_code'     => $data['zip_code'] ?? null,
            'home_phone'   => $data['home_phone'] ?? null,
            'mobile_phone' => $data['mobile_phone'] ?? null,
            'work_phone'   => $data['work_phone'] ?? null,
            'email'        => $data['contact_email'] ?? null
        ];

        $existingContact = (new PatientContact())->where('patient_id', $patient['id'])->first();

        if ($existingContact) {
            $contactPayload['updated_at'] = date('Y-m-d H:i:s');
            $contactPayload['updated_by'] = $userId;

            (new PatientContact())->where('patient_id', $patient['id'])->update($contactPayload);
        } else {
            $contactPayload['patient_id'] = $patient['id'];
            $contactPayload['created_at'] = date('Y-m-d H:i:s');
            $contactPayload['created_by'] = $userId;

            (new PatientContact())->create($contactPayload);
        }

        return [
            'success' => true,
            'message' => 'Profile updated successfully.',
            'data' => [
                'first_name' => $data['first_name'],
                'last_name'  => $data['last_name']
            ]
        ];
    }

    /**
     * Change the logged-in user's own password.
     */
    public function changePassword(int $userId, string $currentPassword, string $newPassword): array
    {
        if (empty($currentPassword) || empty($newPassword)) {
            return [
                'success' => false,
                'message' => 'Both current and new password are required.'
            ];
        }

        if (strlen($newPassword) < 8) {
            return [
                'success' => false,
                'message' => 'New password must be at least 8 characters.'
            ];
        }

        $user = (new User())->where('id', $userId)->first();

        if (!$user || !User::verifyPassword($currentPassword, $user['password'])) {
            return [
                'success' => false,
                'message' => 'Current password is incorrect.'
            ];
        }

        (new User())->update([
            'password'   => User::hashPassword($newPassword),
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $userId);

        return [
            'success' => true,
            'message' => 'Password changed successfully.'
        ];
    }

    /**
     * Upload/replace the logged-in user's profile photo.
     */
    public function uploadAvatar(int $userId, array $file): array
    {
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

        $user = (new User())->where('id', $userId)->first();

        if (!$user) {
            return [
                'success' => false,
                'message' => 'User not found.'
            ];
        }

        $uploadDir = dirname(__DIR__, 4) . '/public/uploads/avatars';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filename = 'user_' . $userId . '_' . time() . '.' . $allowedTypes[$mimeType];
        $destination = $uploadDir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            return [
                'success' => false,
                'message' => 'Failed to save the uploaded image.'
            ];
        }

        if (!empty($user['avatar'])) {
            $oldPath = dirname(__DIR__, 4) . '/public' . $user['avatar'];

            if (is_file($oldPath)) {
                @unlink($oldPath);
            }
        }

        $avatarPath = '/uploads/avatars/' . $filename;

        (new User())->update([
            'avatar'     => $avatarPath,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $userId);

        return [
            'success' => true,
            'message' => 'Profile photo updated successfully.',
            'data' => [
                'avatar' => $avatarPath
            ]
        ];
    }

    /**
     * Remove the logged-in user's profile photo, reverting to the
     * initial-letter avatar.
     */
    public function removeAvatar(int $userId): array
    {
        $user = (new User())->where('id', $userId)->first();

        if (!$user) {
            return [
                'success' => false,
                'message' => 'User not found.'
            ];
        }

        if (!empty($user['avatar'])) {
            $path = dirname(__DIR__, 4) . '/public' . $user['avatar'];

            if (is_file($path)) {
                @unlink($path);
            }
        }

        (new User())->update([
            'avatar'     => null,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $userId);

        return [
            'success' => true,
            'message' => 'Profile photo removed successfully.'
        ];
    }
}
