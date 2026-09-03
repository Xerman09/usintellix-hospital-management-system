<?php

namespace App\Modules\Auth\Services;

use App\Core\Database;
use App\Core\Mailer;
use App\Core\Session;
use App\Modules\Auth\Models\TwoFactorCode;
use App\Modules\Employees\Models\Employee;
use App\Modules\GeneralSettings\Services\GeneralSettingService;
use App\Modules\Patients\Models\Patient;
use App\Modules\Patients\Models\PatientContact;
use App\Modules\Roles\Models\Role;
use App\Modules\Users\Models\User;
use PDO;

class AuthService
{
    /**
     * How long a verification code stays valid after it's issued.
     */
    private const CODE_TTL_MINUTES = 10;

    /**
     * How many wrong guesses a single code tolerates before it's dead.
     */
    private const MAX_ATTEMPTS = 5;

    /**
     * Authenticate a user.
     */
    public function login(string $username, string $password): array
    {
        // Basic validation
        $errors = [];

        if (empty($username)) {
            $errors['username'] = 'Username is required.';
        }

        if (empty($password)) {
            $errors['password'] = 'Password is required.';
        }

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Please fill in all required fields.',
                'errors' => $errors
            ];
        }

        // Username/password failures are kept as one generic error
        // (not split per field) to avoid leaking which usernames exist.
        $user = (new User())
            ->where('username', $username)
            ->first();

        if (!$user || !password_verify($password, $user['password'])) {
            return [
                'success' => false,
                'message' => 'Invalid username or password.',
                'errors' => [
                    'username' => 'Invalid username or password.',
                    'password' => 'Invalid username or password.'
                ]
            ];
        }

        // Regenerate session ID
        Session::regenerate();

        $employee = (new Employee())->where('user_id', $user['id'])->first();

        $settings = (new GeneralSettingService())->get();

        if (!empty($settings['two_factor_enabled']) && in_array((int) $user['role_id'], $settings['two_factor_role_ids'], true)) {
            return $this->beginTwoFactor($user, $employee, (string) $settings['two_factor_method']);
        }

        return $this->grantSession($user, $employee);
    }

    /**
     * Verify a pending login's one-time code and, if it checks out, grant
     * the session that login() would have granted directly had 2FA not
     * been required.
     */
    public function verifyTwoFactor(string $code): array
    {
        $userId = (int) Session::get('pending_2fa_user_id');

        if (!$userId) {
            return [
                'success' => false,
                'message' => 'No pending verification. Please log in again.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "SELECT * FROM two_factor_codes
             WHERE user_id = :user_id AND consumed_at IS NULL
             ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute(['user_id' => $userId]);
        $record = $stmt->fetch(PDO::FETCH_ASSOC);

        $invalid = [
            'success' => false,
            'message' => 'Invalid or expired code.'
        ];

        if (!$record || strtotime($record['expires_at']) < time() || (int) $record['attempts'] >= self::MAX_ATTEMPTS) {
            return $invalid;
        }

        if (!hash_equals($record['code'], $code)) {
            (new TwoFactorCode())->update(['attempts' => (int) $record['attempts'] + 1], $record['id']);
            return $invalid;
        }

        (new TwoFactorCode())->update(['consumed_at' => date('Y-m-d H:i:s')], $record['id']);
        Session::forget('pending_2fa_user_id');
        Session::regenerate();

        $user = (new User())->where('id', $userId)->first();

        if (!$user) {
            return $invalid;
        }

        $employee = (new Employee())->where('user_id', $user['id'])->first();

        return $this->grantSession($user, $employee);
    }

    /**
     * Logout the current user.
     */
    public function logout(): void
    {
        Session::destroy();
    }

    /**
     * Complete a patient's forced first-login credential reset: verify
     * their current (receptionist-assigned) password and the trusted
     * email on file, then let them pick a new username/password.
     */
    public function completeFirstLogin(
        int $userId,
        string $currentPassword,
        string $newUsername,
        string $newPassword,
        string $confirmPassword,
        string $confirmEmail
    ): array {
        $errors = [];
        $newUsername = trim($newUsername);

        if (empty($currentPassword)) {
            $errors['current_password'] = 'Current password is required.';
        }

        if (empty($newUsername)) {
            $errors['username'] = 'Username is required.';
        }

        if (!$this->isStrongPassword($newPassword)) {
            $errors['new_password'] = 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.';
        }

        if ($newPassword !== $confirmPassword) {
            $errors['confirm_password'] = 'Passwords do not match.';
        }

        if (empty($confirmEmail)) {
            $errors['confirm_email'] = 'Email confirmation is required.';
        }

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Please correct the errors below.',
                'errors' => $errors
            ];
        }

        $user = (new User())->where('id', $userId)->first();

        if (!$user || !User::verifyPassword($currentPassword, $user['password'])) {
            return [
                'success' => false,
                'message' => 'Current password is incorrect.',
                'errors' => ['current_password' => 'Current password is incorrect.']
            ];
        }

        if (strcasecmp($newUsername, $user['username']) !== 0
            && (new User())->where('username', $newUsername)->first()
        ) {
            return [
                'success' => false,
                'message' => 'That username is already taken.',
                'errors' => ['username' => 'That username is already taken.']
            ];
        }

        $patient = (new Patient())->where('user_id', $userId)->first();
        $contact = $patient ? (new PatientContact())->where('patient_id', $patient['id'])->first() : null;
        $onFileEmail = $contact['email'] ?? null;

        if (empty($onFileEmail) || strcasecmp(trim($confirmEmail), $onFileEmail) !== 0) {
            return [
                'success' => false,
                'message' => 'That email does not match the one on file.',
                'errors' => ['confirm_email' => 'That email does not match the one on file.']
            ];
        }

        (new User())->update([
            'username'              => $newUsername,
            'password'              => User::hashPassword($newPassword),
            'must_change_password'  => 0,
            'updated_at'            => date('Y-m-d H:i:s'),
            'updated_by'            => $userId
        ], $userId);

        return [
            'success' => true,
            'message' => 'Credentials updated successfully.',
            'data' => [
                'username' => $newUsername
            ]
        ];
    }

    private function isStrongPassword(string $password): bool
    {
        return strlen($password) >= 8
            && preg_match('/[A-Z]/', $password) === 1
            && preg_match('/[a-z]/', $password) === 1
            && preg_match('/[0-9]/', $password) === 1;
    }

    /**
     * Finish authenticating: resolve the display role/name and store the
     * logged-in user in the session. Shared by the direct-login path and
     * the post-2FA-verification path so both end up with an identical
     * session shape.
     */
    private function grantSession(array $user, ?array $employee): array
    {
        $resolvedRole = $this->resolveRole($user, $employee);
        $name = $this->resolveName($user, $employee);

        Session::put('user', [
            'id'                    => $user['id'],
            'username'              => $user['username'],
            'role'                  => $resolvedRole,
            'first_name'            => $name['first_name'],
            'last_name'             => $name['last_name'],
            'avatar'                => $user['avatar'] ?? null,
            'must_change_password'  => (bool) ($user['must_change_password'] ?? false)
        ]);

        return [
            'success' => true,
            'message' => 'Login successful.',
            'data' => [
                'user' => Session::get('user')
            ]
        ];
    }

    /**
     * Issue a one-time code for the pending login and record which user
     * it belongs to (a lightweight marker distinct from the 'user'
     * session key AuthMiddleware checks, so nothing is accessible until
     * the code is verified).
     */
    private function beginTwoFactor(array $user, ?array $employee, string $method): array
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        (new TwoFactorCode())->create([
            'user_id'    => $user['id'],
            'code'       => $code,
            'method'     => $method,
            'expires_at' => date('Y-m-d H:i:s', strtotime('+' . self::CODE_TTL_MINUTES . ' minutes')),
            'created_at' => date('Y-m-d H:i:s')
        ]);

        Session::put('pending_2fa_user_id', $user['id']);

        $emailSent = false;

        if ($method === 'email' && !empty($employee['email'])) {
            $emailSent = (new Mailer())->send(
                $employee['email'],
                'Your Intellix Hospital System verification code',
                "Your verification code is: {$code}\n\n"
                    . "This code expires in " . self::CODE_TTL_MINUTES . " minutes. "
                    . "If you didn't request this, you can ignore this email."
            );
        }

        $data = [
            'requires_2fa' => true,
            'method' => $method,
            'destination' => $this->maskDestination($method, $employee)
        ];

        // Mail isn't configured yet (or the send failed) -- fall back to
        // handing the code back in the response so login still works
        // while MAIL_PASSWORD is pending, instead of locking everyone out.
        if (!$emailSent) {
            $data['dev_mode'] = true;
            $data['dev_code'] = $code;
        }

        return [
            'success' => true,
            'message' => 'Verification code sent.',
            'data' => $data
        ];
    }

    /**
     * Partially mask where the code was "sent" for display on the
     * verification step.
     */
    private function maskDestination(string $method, ?array $employee): string
    {
        if ($method === 'email') {
            $email = $employee['email'] ?? '';
            [$local, $domain] = array_pad(explode('@', $email, 2), 2, '');

            if ($local === '') {
                return 'your email on file';
            }

            $maskedLocal = $local[0] . str_repeat('*', max(strlen($local) - 1, 1));

            return $domain !== '' ? "{$maskedLocal}@{$domain}" : $maskedLocal;
        }

        $phone = $employee['phone'] ?? '';
        $lastFour = substr($phone, -4);

        return $lastFour !== '' ? str_repeat('*', max(strlen($phone) - 4, 0)) . $lastFour : 'your phone on file';
    }

    private function resolveRole(array $user, ?array $employee): string
    {
        if (!$employee || empty($user['role_id'])) {
            return 'patient';
        }

        $role = (new Role())
            ->where('id', $user['role_id'])
            ->first();

        if (!$role) {
            return 'patient';
        }

        return strtolower((string) $role['name']);
    }

    /**
     * Resolve the logged-in user's display name from their employee
     * record, falling back to their patient record.
     */
    private function resolveName(array $user, ?array $employee): array
    {
        if ($employee) {
            return [
                'first_name' => $employee['first_name'],
                'last_name'  => $employee['last_name']
            ];
        }

        $patient = (new Patient())->where('user_id', $user['id'])->first();

        if ($patient) {
            return [
                'first_name' => $patient['first_name'],
                'last_name'  => $patient['last_name']
            ];
        }

        return [
            'first_name' => null,
            'last_name'  => null
        ];
    }
}
