<?php

namespace App\Modules\Auth\Services;

use App\Core\AuditLogger;
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
use App\Core\PasswordSecurity;
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
     * Minimum wait between issuing codes for the same pending login, so
     * the resend button can't be used to spam the user's inbox.
     */
    private const RESEND_COOLDOWN_SECONDS = 60;

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

        $now = time();

        // Check account lifecycle status (HIPAA § 164.312(a)(2)(i))
        if ($user) {
            $userStatus = $user['status'] ?? 'active';

            if ($userStatus === 'suspended') {
                $reasonText = !empty($user['status_reason']) ? " Reason: {$user['status_reason']}." : "";
                AuditLogger::log(
                    AuditLogger::CATEGORY_SECURITY,
                    AuditLogger::ACTION_LOGIN_FAILED,
                    "Authentication rejected: account '{$username}' is suspended.{$reasonText}",
                    null,
                    (int) $user['id'],
                    $user['role_id'] ? 'user' : 'patient'
                );

                return [
                    'success' => false,
                    'suspended' => true,
                    'message' => "Your account has been temporarily suspended by Hospital Administration.{$reasonText} Please contact HR or IT.",
                    'errors' => [
                        'username' => "Account suspended.{$reasonText}"
                    ]
                ];
            }

            if ($userStatus === 'decommissioned') {
                AuditLogger::log(
                    AuditLogger::CATEGORY_SECURITY,
                    AuditLogger::ACTION_LOGIN_FAILED,
                    "Authentication rejected: account '{$username}' is decommissioned.",
                    null,
                    (int) $user['id'],
                    $user['role_id'] ? 'user' : 'patient'
                );

                return [
                    'success' => false,
                    'decommissioned' => true,
                    'message' => "This account has been decommissioned and is no longer authorized for hospital system access.",
                    'errors' => [
                        'username' => "Account decommissioned."
                    ]
                ];
            }

            $isLocked = !empty($user['is_locked']) || $userStatus === 'locked';
            $lockedUntil = !empty($user['locked_until']) ? strtotime($user['locked_until']) : null;

            if ($isLocked && $lockedUntil !== null && $lockedUntil > $now) {
                $remainingMinutes = (int) ceil(($lockedUntil - $now) / 60);
                AuditLogger::log(
                    AuditLogger::CATEGORY_SECURITY,
                    AuditLogger::ACTION_LOGIN_FAILED,
                    "Authentication rejected: account '{$username}' is currently locked until {$user['locked_until']} (HIPAA § 164.312(a)(2)(i)).",
                    null,
                    (int) $user['id'],
                    $user['role_id'] ? 'user' : 'patient'
                );

                return [
                    'success' => false,
                    'locked' => true,
                    'remaining_minutes' => $remainingMinutes,
                    'message' => "Account is temporarily locked due to 5 consecutive failed login attempts. Please wait {$remainingMinutes} minute(s) or contact an administrator to unlock your account.",
                    'errors' => [
                        'username' => "Account locked. Cooldown remaining: {$remainingMinutes} minute(s)."
                    ]
                ];
            }

            // Administrative manual lock without automatic timeout
            if ($isLocked && $lockedUntil === null) {
                AuditLogger::log(
                    AuditLogger::CATEGORY_SECURITY,
                    AuditLogger::ACTION_LOGIN_FAILED,
                    "Authentication rejected: account '{$username}' is administratively locked.",
                    null,
                    (int) $user['id'],
                    $user['role_id'] ? 'user' : 'patient'
                );

                return [
                    'success' => false,
                    'locked' => true,
                    'message' => "Account is administratively locked. Please contact your system administrator to restore access.",
                    'errors' => [
                        'username' => "Account locked administratively."
                    ]
                ];
            }

            // If the 30-minute lockout cooldown has elapsed, auto-unlock
            if ($lockedUntil !== null && $lockedUntil <= $now) {
                (new User())->update([
                    'is_locked' => 0,
                    'status' => 'active',
                    'locked_until' => null,
                    'failed_login_attempts' => 0,
                    'last_failed_login_at' => null
                ], (int) $user['id']);
                $user['is_locked'] = 0;
                $user['status'] = 'active';
                $user['locked_until'] = null;
                $user['failed_login_attempts'] = 0;
            }
        }

        if (!$user || !password_verify($password, $user['password'])) {
            $warningMessage = 'Invalid username or password.';
            $isNowLocked = false;
            $remainingMinutes = 0;

            if ($user) {
                $lastFailedAt = !empty($user['last_failed_login_at']) ? strtotime($user['last_failed_login_at']) : null;

                // Reset attempts to 1 if last failure was > 15 minutes ago (rolling window)
                if ($lastFailedAt === null || ($now - $lastFailedAt) > 900) {
                    $attempts = 1;
                } else {
                    $attempts = ((int) $user['failed_login_attempts']) + 1;
                }

                if ($attempts >= 5) {
                    $lockoutUntilStr = date('Y-m-d H:i:s', $now + (30 * 60));
                    (new User())->update([
                        'is_locked' => 1,
                        'locked_until' => $lockoutUntilStr,
                        'failed_login_attempts' => $attempts,
                        'last_failed_login_at' => date('Y-m-d H:i:s', $now)
                    ], (int) $user['id']);

                    AuditLogger::log(
                        AuditLogger::CATEGORY_SECURITY,
                        AuditLogger::ACTION_ACCOUNT_LOCKED,
                        "Account '{$username}' (ID: {$user['id']}) automatically locked for 30 minutes following 5 consecutive failed login attempts.",
                        null,
                        (int) $user['id'],
                        $user['role_id'] ? 'user' : 'patient'
                    );

                    $isNowLocked = true;
                    $remainingMinutes = 30;
                    $warningMessage = 'Account has been temporarily locked for 30 minutes due to 5 consecutive failed login attempts in accordance with HIPAA § 164.312(a)(2)(i). Please wait 30 minutes or contact an administrator.';
                } else {
                    (new User())->update([
                        'failed_login_attempts' => $attempts,
                        'last_failed_login_at' => date('Y-m-d H:i:s', $now)
                    ], (int) $user['id']);

                    $remainingAttempts = 5 - $attempts;
                    $warningMessage = "Invalid username or password. Warning: {$remainingAttempts} attempt(s) remaining before account lockout.";

                    AuditLogger::log(
                        AuditLogger::CATEGORY_AUTH,
                        AuditLogger::ACTION_LOGIN_FAILED,
                        "Authentication failure: invalid credentials for username '{$username}' (Attempt {$attempts} of 5)."
                    );
                }
            } else {
                AuditLogger::log(
                    AuditLogger::CATEGORY_AUTH,
                    AuditLogger::ACTION_LOGIN_FAILED,
                    "Authentication failure: invalid credentials for non-existent username '{$username}'."
                );
            }

            return [
                'success' => false,
                'locked' => $isNowLocked,
                'remaining_minutes' => $remainingMinutes,
                'message' => $warningMessage,
                'errors' => [
                    'username' => $warningMessage,
                    'password' => 'Invalid username or password.'
                ]
            ];
        }

        // On successful credential match, reset any failed attempt counters
        if (!empty($user['failed_login_attempts']) || !empty($user['locked_until']) || !empty($user['is_locked'])) {
            (new User())->update([
                'failed_login_attempts' => 0,
                'last_failed_login_at' => null,
                'locked_until' => null,
                'is_locked' => 0
            ], (int) $user['id']);
        }

        // Check if the user's password has appeared in known data breaches (NIST SP 800-63B / HIBP)
        $breachCheck = PasswordSecurity::checkBreached($password);
        if ($breachCheck['breached'] || !empty($user['password_breached'])) {
            $breachCount = $breachCheck['count'] > 0 ? $breachCheck['count'] : 1;
            (new User())->update([
                'password_breached'    => 1,
                'must_change_password' => 1
            ], (int) $user['id']);

            AuditLogger::log(
                AuditLogger::CATEGORY_SECURITY,
                'PASSWORD_BREACH_DETECTED',
                "Compromised password detected on login for user '{$username}' (ID: {$user['id']}). Password matched known breach list ({$breachCount} occurrences). Immediate credential change required (§ 164.308).",
                null,
                (int) $user['id'],
                $user['role_id'] ? 'user' : 'patient'
            );

            return [
                'success'           => false,
                'password_breached' => true,
                'user_id'           => (int) $user['id'],
                'username'          => $user['username'],
                'breach_count'      => $breachCount,
                'message'           => "SECURITY WARNING: Your current password was found in a list of known data breaches (" . number_format($breachCount) . " occurrences). For your security and HIPAA compliance, you must change your password right away to continue."
            ];
        }

        // Check 90-day password expiration (HIPAA § 164.308(a)(5)(ii)(D))
        $expStatus = PasswordSecurity::checkExpirationStatus($user);
        if ($expStatus['expired']) {
            return [
                'success'          => false,
                'password_expired' => true,
                'user_id'          => (int) $user['id'],
                'username'         => $user['username'],
                'days_old'         => $expStatus['days_old'],
                'message'          => "Your password has expired after 90 days in accordance with HIPAA Security Rule § 164.308(a)(5)(ii)(D). Please create a new password to continue."
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
     * Issue a fresh code for the pending login, replacing the previous
     * one. Only allowed once the resend cooldown has elapsed.
     */
    public function resendTwoFactor(): array
    {
        $userId = (int) Session::get('pending_2fa_user_id');

        if (!$userId) {
            return [
                'success' => false,
                'message' => 'No pending verification. Please log in again.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "SELECT created_at FROM two_factor_codes
             WHERE user_id = :user_id
             ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute(['user_id' => $userId]);
        $lastCreatedAt = $stmt->fetchColumn();

        if ($lastCreatedAt) {
            $wait = strtotime($lastCreatedAt) + self::RESEND_COOLDOWN_SECONDS - time();

            if ($wait > 0) {
                return [
                    'success' => false,
                    'message' => "Please wait {$wait} second(s) before requesting a new code.",
                    'errors' => ['resend_in' => $wait]
                ];
            }
        }

        $user = (new User())->where('id', $userId)->first();

        if (!$user) {
            Session::forget('pending_2fa_user_id');
            return [
                'success' => false,
                'message' => 'No pending verification. Please log in again.'
            ];
        }

        $employee = (new Employee())->where('user_id', $user['id'])->first();
        $settings = (new GeneralSettingService())->get();

        $result = $this->beginTwoFactor($user, $employee, (string) $settings['two_factor_method']);
        $result['message'] = 'A new verification code has been sent.';

        return $result;
    }

    /**
     * Logout the current user.
     */
    public function logout(): void
    {
        $user = Session::get('user');
        if (is_array($user)) {
            AuditLogger::log(
                AuditLogger::CATEGORY_AUTH,
                AuditLogger::ACTION_LOGOUT,
                "User '{$user['username']}' ({$user['role']}) initiated session termination.",
                null,
                (int) $user['id'],
                $user['role']
            );

            // Mark session as inactive in user_session_histories
            $sessId = session_id();
            if (!empty($sessId)) {
                try {
                    $stmt = Database::connection()->prepare(
                        "UPDATE user_session_histories 
                         SET is_active = 0, logout_at = NOW() 
                         WHERE session_id = :session_id AND is_active = 1"
                    );
                    $stmt->execute(['session_id' => $sessId]);
                } catch (\Throwable $e) {
                    // Fail silently
                }
            }
        }

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

        $history = PasswordSecurity::checkHistory($userId, $newPassword);
        if (!$history['allowed']) {
            return [
                'success' => false,
                'message' => $history['message'],
                'errors' => ['new_password' => $history['message']]
            ];
        }

        (new User())->update([
            'username' => $newUsername
        ], $userId);

        PasswordSecurity::recordPasswordChange($userId, $newPassword, $userId, 'First-login credential setup');

        return [
            'success' => true,
            'message' => 'Credentials updated successfully.',
            'data' => [
                'username' => $newUsername
            ]
        ];
    }

    /**
     * Update an expired password per HIPAA 90-day expiration rule (§ 164.308(a)(5)(ii)(D)).
     */
    public function updateExpiredPassword(
        int $userId,
        string $currentPassword,
        string $newPassword,
        string $confirmPassword
    ): array {
        $errors = [];

        if (empty($currentPassword)) {
            $errors['current_password'] = 'Current password is required.';
        }

        if (empty($newPassword)) {
            $errors['new_password'] = 'New password is required.';
        }

        if (empty($confirmPassword)) {
            $errors['confirm_password'] = 'Password confirmation is required.';
        }

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Please fill in all required fields.',
                'errors' => $errors
            ];
        }

        if ($newPassword !== $confirmPassword) {
            return [
                'success' => false,
                'message' => 'Passwords do not match.',
                'errors' => ['confirm_password' => 'Passwords do not match.']
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

        $complexity = PasswordSecurity::validateComplexity($newPassword);
        if (!$complexity['valid']) {
            return [
                'success' => false,
                'message' => $complexity['message'],
                'errors' => ['new_password' => $complexity['message']]
            ];
        }

        $history = PasswordSecurity::checkHistory($userId, $newPassword);
        if (!$history['allowed']) {
            return [
                'success' => false,
                'message' => $history['message'],
                'errors' => ['new_password' => $history['message']]
            ];
        }

        PasswordSecurity::recordPasswordChange($userId, $newPassword, $userId, '90-day password expiration renewal');

        $updatedUser = (new User())->where('id', $userId)->first();
        $employee = (new Employee())->where('user_id', $userId)->first();

        Session::regenerate();
        return $this->grantSession($updatedUser, $employee);
    }

    /**
     * Update a compromised/breached password and complete login (HIPAA § 164.308 & NIST SP 800-63B).
     */
    public function updateBreachedPassword(
        int $userId,
        string $currentPassword,
        string $newPassword,
        string $confirmPassword
    ): array {
        $errors = [];

        if (empty($currentPassword)) {
            $errors['current_password'] = 'Current password is required.';
        }

        if (empty($newPassword)) {
            $errors['new_password'] = 'New password is required.';
        }

        if (empty($confirmPassword)) {
            $errors['confirm_password'] = 'Password confirmation is required.';
        }

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Please fill in all required fields.',
                'errors' => $errors
            ];
        }

        if ($newPassword !== $confirmPassword) {
            return [
                'success' => false,
                'message' => 'Passwords do not match.',
                'errors' => ['confirm_password' => 'Passwords do not match.']
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

        $complexity = PasswordSecurity::validateComplexity($newPassword, true);
        if (!$complexity['valid']) {
            return [
                'success' => false,
                'message' => $complexity['message'],
                'errors' => ['new_password' => $complexity['message']]
            ];
        }

        $history = PasswordSecurity::checkHistory($userId, $newPassword);
        if (!$history['allowed']) {
            return [
                'success' => false,
                'message' => $history['message'],
                'errors' => ['new_password' => $history['message']]
            ];
        }

        PasswordSecurity::recordPasswordChange($userId, $newPassword, $userId, 'Breached credential remediation');

        $updatedUser = (new User())->where('id', $userId)->first();
        $employee = (new Employee())->where('user_id', $userId)->first();

        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'PASSWORD_BREACH_REMEDIATED',
            "User '{$user['username']}' (ID: {$userId}) successfully replaced compromised password with secure credentials (§ 164.308).",
            null,
            $userId,
            $user['role_id'] ? 'user' : 'patient'
        );

        Session::regenerate();
        return $this->grantSession($updatedUser, $employee);
    }

    private function isStrongPassword(string $password): bool
    {
        return strlen($password) >= 8
            && preg_match('/[A-Z]/', $password) === 1
            && preg_match('/[a-z]/', $password) === 1
            && preg_match('/[0-9]/', $password) === 1;
    }

    /**
     * Resolves and returns a fully populated user array from the DB.
     * Ensures role and profile information are fresh and accurate.
     */
    public function getCurrentUser(int $userId): ?array
    {
        if ($userId <= 0) {
            return null;
        }

        $user = (new User())->where('id', $userId)->first();
        if (!$user) {
            return null;
        }

        $employee = (new Employee())->where('user_id', $user['id'])->first();
        $resolvedRole = $this->resolveRole($user, $employee);
        $name = $this->resolveName($user, $employee);
        $expStatus = PasswordSecurity::checkExpirationStatus($user);

        return [
            'id'                     => (int) $user['id'],
            'username'               => $user['username'],
            'role'                   => $resolvedRole,
            'first_name'             => $name['first_name'],
            'last_name'              => $name['last_name'],
            'avatar'                 => $this->resolveAvatar($user, $employee),
            'photo'                  => $this->resolveAvatar($user, $employee),
            'must_change_password'   => (bool) ($user['must_change_password'] ?? false),
            'password_changed_at'    => $user['password_changed_at'] ?? null,
            'password_expiring_soon' => $expStatus['expiring_soon'],
            'days_until_expiration'  => $expStatus['days_remaining'],
            'npp_acknowledged'       => (bool) ($user['npp_acknowledged'] ?? false),
            'npp_acknowledged_at'    => $user['npp_acknowledged_at'] ?? null,
            'npp_version'            => $user['npp_version'] ?? null,
        ];
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
        $expStatus = PasswordSecurity::checkExpirationStatus($user);

        Session::put('user', [
            'id'                     => $user['id'],
            'username'               => $user['username'],
            'role'                   => $resolvedRole,
            'first_name'             => $name['first_name'],
            'last_name'              => $name['last_name'],
            'avatar'                 => $this->resolveAvatar($user, $employee),
            'photo'                  => $this->resolveAvatar($user, $employee),
            'must_change_password'   => (bool) ($user['must_change_password'] ?? false),
            'password_breached'      => (bool) ($user['password_breached'] ?? false),
            'password_changed_at'    => $user['password_changed_at'] ?? null,
            'password_expiring_soon' => $expStatus['expiring_soon'],
            'days_until_expiration'  => $expStatus['days_remaining'],
            'npp_acknowledged'       => (bool) ($user['npp_acknowledged'] ?? false),
            'npp_acknowledged_at'    => $user['npp_acknowledged_at'] ?? null,
            'npp_version'            => $user['npp_version'] ?? null,
        ]);

        // Record active session history (IP, user agent, device type)
        $sessId = session_id();
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
        if (str_contains($ip, ',')) {
            $ip = trim(explode(',', $ip)[0]);
        }
        $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
        $deviceType = 'Desktop';
        if (preg_match('/(iPhone|iPad|iPod|Android|webOS|BlackBerry|Windows Phone)/i', $ua)) {
            $deviceType = preg_match('/(tablet|ipad)/i', $ua) ? 'Tablet' : 'Mobile';
        }

        try {
            $stmt = Database::connection()->prepare(
                "INSERT INTO user_session_histories 
                 (user_id, session_id, ip_address, user_agent, device_type, login_at, last_activity_at, is_active)
                 VALUES (:user_id, :session_id, :ip_address, :user_agent, :device_type, NOW(), NOW(), 1)"
            );
            $stmt->execute([
                'user_id'     => $user['id'],
                'session_id'  => $sessId,
                'ip_address'  => substr($ip, 0, 45),
                'user_agent'  => substr($ua, 0, 500),
                'device_type' => $deviceType,
            ]);
        } catch (\Throwable $e) {
            // Silently continue
        }

        AuditLogger::log(
            AuditLogger::CATEGORY_AUTH,
            AuditLogger::ACTION_LOGIN_SUCCESS,
            "User '{$user['username']}' ({$resolvedRole}) authenticated successfully.",
            null,
            (int) $user['id'],
            $resolvedRole
        );

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

        // Retire any still-open code so only the newest one can be used.
        Database::connection()->prepare(
            "UPDATE two_factor_codes SET expires_at = :now
             WHERE user_id = :user_id AND consumed_at IS NULL"
        )->execute(['now' => date('Y-m-d H:i:s'), 'user_id' => $user['id']]);

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
            'destination' => $this->maskDestination($method, $employee),
            'expires_in' => self::CODE_TTL_MINUTES * 60,
            'resend_in' => self::RESEND_COOLDOWN_SECONDS
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
        // If the user has a role_id, resolve it from the roles table regardless
        // of whether an employee record exists. Admin and other staff accounts
        // may not always have an employee row, but their role_id is the
        // authoritative source of truth for nav and access control.
        if (!empty($user['role_id'])) {
            $role = (new Role())
                ->where('id', $user['role_id'])
                ->first();

            if ($role) {
                return strtolower((string) $role['name']);
            }
        }

        // No role_id (or unknown role_id) → treat as patient (portal user)
        return 'patient';
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

    /**
     * Resolve the logged-in user's avatar image path from user or patient photo.
     */
    private function resolveAvatar(array $user, ?array $employee): ?string
    {
        if (!empty($user['avatar'])) {
            return $user['avatar'];
        }

        $patient = (new Patient())->where('user_id', $user['id'])->first();
        if ($patient && !empty($patient['photo'])) {
            return $patient['photo'];
        }

        return null;
    }

    /**
     * Record patient electronic acknowledgment of Notice of Privacy Practices (HIPAA § 164.520).
     */
    public function acknowledgeNpp(int $userId, array $data): array
    {
        $signatureData = trim((string) ($data['signature_data'] ?? ''));
        $signatureType = trim((string) ($data['signature_type'] ?? 'electronic'));
        $nppVersion = trim((string) ($data['npp_version'] ?? '2026-09'));
        $clientIp = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

        if (empty($signatureData)) {
            return [
                'success' => false,
                'message' => 'Your full legal name is required as an electronic signature.'
            ];
        }

        $userModel = new User();
        $user = $userModel->where('id', $userId)->first();
        if (!$user) {
            return [
                'success' => false,
                'message' => 'User account not found.'
            ];
        }

        $now = date('Y-m-d H:i:s');

        // Update user record
        $userModel->where('id', $userId)->update([
            'npp_acknowledged'    => 1,
            'npp_acknowledged_at' => $now,
            'npp_acknowledged_ip' => $clientIp,
            'npp_signature_type'  => $signatureType,
            'npp_signature_data'  => $signatureData,
            'npp_version'         => $nppVersion,
        ]);

        // Resolve patient ID if applicable
        $patient = (new Patient())->where('user_id', $userId)->first();
        $patientId = $patient ? (int) $patient['id'] : null;

        // Insert into immutable npp_consent_log
        $db = Database::connection();
        $stmt = $db->prepare("INSERT INTO npp_consent_log 
            (user_id, patient_id, acknowledged_at, acknowledged_ip, signature_type, signature_data, npp_version, captured_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([
            $userId,
            $patientId,
            $now,
            $clientIp,
            $signatureType,
            $signatureData,
            $nppVersion,
            null, // self-acknowledged
            $now
        ]);

        // Audit log HIPAA § 164.520 event
        AuditLogger::log(
            AuditLogger::CATEGORY_CONSENT,
            AuditLogger::ACTION_NPP_ACKNOWLEDGED,
            "Patient electronically signed and acknowledged HIPAA Notice of Privacy Practices (v{$nppVersion}) with legal signature '{$signatureData}'.",
            $patientId,
            $userId,
            'patient'
        );

        // Update active session if it matches this user
        $sessionUser = Session::get('user');
        if (is_array($sessionUser) && (int) ($sessionUser['id'] ?? 0) === $userId) {
            $sessionUser['npp_acknowledged'] = true;
            $sessionUser['npp_acknowledged_at'] = $now;
            $sessionUser['npp_version'] = $nppVersion;
            Session::put('user', $sessionUser);
        }

        $freshUser = $this->getCurrentUser($userId);

        return [
            'success' => true,
            'message' => 'Notice of Privacy Practices acknowledged successfully.',
            'data'    => [
                'user' => $freshUser
            ]
        ];
    }
}
