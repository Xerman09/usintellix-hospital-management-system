<?php

namespace App\Modules\PatientPortalAccess\Services;

use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Models\PatientContact;
use App\Modules\Users\Models\User;

class PatientPortalAccessService
{
    /**
     * The "Generate Username And Password For {name}" modal's opening
     * state -- the patient's real current login username (editable, not
     * silently replaced -- every patient already has a real login row
     * via patients.user_id), a freshly generated password ready to save
     * or regenerate again, and their on-file contact email (real,
     * possibly absent -- shown honestly as null rather than a fake
     * placeholder).
     */
    public function previewCredentials(int $patientId): array
    {
        $patient = (new Patient())->where('id', $patientId)->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Patient not found.'];
        }

        $user = (new User())->where('id', (int) $patient['user_id'])->first();
        $contact = (new PatientContact())->where('patient_id', $patientId)->first();

        return [
            'success' => true,
            'message' => 'Credentials retrieved successfully.',
            'data' => [
                'username' => $user['username'] ?? '',
                'password' => $this->generatePassword(),
                'trusted_email' => $contact['email'] ?? null
            ]
        ];
    }

    /**
     * Saves a (possibly renamed) username and a new password together --
     * the modal's Save action. Both are required every save, matching
     * the modal always proposing a freshly generated password rather
     * than an optional field.
     */
    public function saveCredentials(int $patientId, string $username, string $password, int $actorUserId): array
    {
        $patient = (new Patient())->where('id', $patientId)->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Patient not found.'];
        }

        $username = trim($username);
        $errors = [];

        if ($username === '') {
            $errors['username'] = 'Account Name is required.';
        }

        if (strlen($password) < 8) {
            $errors['password'] = 'Password must be at least 8 characters.';
        }

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $userId = (int) $patient['user_id'];

        $existing = (new User())->where('username', $username)->first();

        if ($existing && (int) $existing['id'] !== $userId) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => ['username' => 'That account name is already taken.']];
        }

        (new User())->update([
            'username' => $username,
            'password' => User::hashPassword($password),
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $actorUserId
        ], $userId);

        return ['success' => true, 'message' => 'Credentials saved successfully.'];
    }

    /**
     * A 12-character password guaranteed to contain at least one
     * uppercase letter, lowercase letter, digit, and symbol. Visually
     * ambiguous characters (0/O, 1/l/I) are excluded since this password
     * has to be read aloud or retyped by front-desk staff and the patient.
     */
    private function generatePassword(int $length = 12): string
    {
        $upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
        $lower = 'abcdefghijkmnpqrstuvwxyz';
        $digits = '23456789';
        $symbols = '!@#$%*?';
        $all = $upper . $lower . $digits . $symbols;

        $chars = [
            $upper[random_int(0, strlen($upper) - 1)],
            $lower[random_int(0, strlen($lower) - 1)],
            $digits[random_int(0, strlen($digits) - 1)],
            $symbols[random_int(0, strlen($symbols) - 1)]
        ];

        for ($i = count($chars); $i < $length; $i++) {
            $chars[] = $all[random_int(0, strlen($all) - 1)];
        }

        shuffle($chars);

        return implode('', $chars);
    }
}
