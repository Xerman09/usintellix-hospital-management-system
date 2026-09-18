<?php

namespace App\Modules\PatientPortalAccess\Services;

use App\Modules\Patients\Models\Patient;
use App\Modules\Users\Models\User;

class PatientPortalAccessService
{
    /**
     * Generates a fresh random password for the patient's portal login
     * account and stores it -- the "Credentials / Reset" action on the
     * Patient Portal / API Access widget. The new plaintext password is
     * returned once so staff can relay it to the patient; it is never
     * stored or logged in plaintext, only its hash.
     */
    public function resetPassword(int $patientId, int $actorUserId): array
    {
        $patient = (new Patient())->where('id', $patientId)->first();

        if (!$patient || $patient['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Patient not found.'];
        }

        $newPassword = $this->generatePassword();

        (new User())->update([
            'password' => User::hashPassword($newPassword),
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $actorUserId
        ], (int) $patient['user_id']);

        return [
            'success' => true,
            'message' => 'Portal password reset successfully.',
            'data' => ['password' => $newPassword]
        ];
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
