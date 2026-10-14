<?php

namespace App\Core;

use App\Modules\Users\Models\User;
use PDO;

class PasswordSecurity
{
    public const MAX_AGE_DAYS = 90;
    public const WARNING_WINDOW_DAYS = 7;
    public const HISTORY_LIMIT = 5;

    /**
     * Common high-frequency breached passwords & patterns for immediate local offline detection.
     */
    private const COMMON_BREACHED_PASSWORDS = [
        'password', 'password1', 'password123', 'password123!', 'password1234', 'password@123',
        'p@ssword', 'p@ssword1', 'p@ssword123', 'p@ssword123!', 'p@ssw0rd', 'p@ssw0rd123', 'p@ssw0rd123!',
        'admin123', 'admin123!', 'admin@123', 'administrator1', 'administrator1!', 'admin2024!', 'admin2025!', 'admin2026!',
        'welcome1', 'welcome1!', 'welcome123', 'welcome123!', 'welcome@123', 'welcome2024!', 'welcome2025!', 'welcome2026!',
        'hospital1', 'hospital1!', 'hospital123', 'hospital123!', 'hospital@123', 'hospital2024!', 'hospital2025!',
        'healthcare1!', 'healthcare123!', 'clinic123!', 'medical123!', 'doctor123!', 'doctor2024!', 'nurse123!', 'nurse2024!',
        'patient1', 'patient1!', 'patient123!', 'patient2024!', 'intellix123!',
        'summer2023!', 'summer2024!', 'summer2025!', 'summer2026!', 'winter2023!', 'winter2024!', 'winter2025!', 'winter2026!',
        'spring2024!', 'spring2025!', 'spring2026!', 'autumn2024!', 'autumn2025!', 'fall2024!', 'fall2025!',
        'changeme1!', 'changeme123!', 'temppass123!', 'temppassword1!', 'qwerty123!', 'qwerty@123', 'qazwsx123!',
        '12345678', '123456789', '12345678!', '123456789!', 'iloveyou1!', 'monkey123!', 'dragon123!', 'football1!'
    ];

    /**
     * Check if a password exists in known data breaches (HIBP / SecLists / NIST SP 800-63B).
     * Uses SHA-1 k-Anonymity (only the first 5 characters of the SHA-1 hash are ever transmitted).
     *
     * @param string $password Plaintext password to evaluate.
     * @return array{breached: bool, count: int, message: string}
     */
    public static function checkBreached(string $password): array
    {
        $trimmed = trim($password);
        if ($trimmed === '') {
            return [
                'breached' => false,
                'count'    => 0,
                'message'  => 'Password cannot be empty.'
            ];
        }

        $lower = strtolower($trimmed);

        // 1. Fast local dictionary check (O(1) lookup)
        if (in_array($lower, self::COMMON_BREACHED_PASSWORDS, true)) {
            return [
                'breached' => true,
                'count'    => 100000,
                'source'   => 'Local Common Breached Dictionary',
                'message'  => 'Security Alert: This password is on the known breached password list and is unsafe. You cannot use a compromised password. Please choose a unique, secure password.'
            ];
        }

        $sha1 = strtoupper(sha1($trimmed));
        $prefix = substr($sha1, 0, 5);
        $suffix = substr($sha1, 5);

        // 2. Database local cache check (table breached_passwords_list)
        try {
            $db = Database::connection();
            $stmt = $db->prepare("SELECT breach_count FROM breached_passwords_list WHERE sha1_hash = :hash LIMIT 1");
            $stmt->execute(['hash' => $sha1]);
            $cachedCount = $stmt->fetchColumn();

            if ($cachedCount !== false && (int) $cachedCount > 0) {
                $count = (int) $cachedCount;
                return [
                    'breached' => true,
                    'count'    => $count,
                    'source'   => 'Local Breached Database',
                    'message'  => "Security Alert: This password has appeared " . number_format($count) . " times in known data breaches (NIST SP 800-63B / HIBP). It is compromised and cannot be used. Please choose a different, secure password."
                ];
            }
        } catch (\Throwable $e) {
            // If table doesn't exist or query fails, proceed to HIBP lookup
        }

        // 3. Live HIBP k-Anonymity API lookup
        try {
            $context = stream_context_create([
                'http' => [
                    'method'        => 'GET',
                    'timeout'       => 1.8,
                    'user_agent'    => 'USIntellix-Hospital-EHR-BreachAudit/1.0',
                    'ignore_errors' => true
                ]
            ]);

            $url = 'https://api.pwnedpasswords.com/range/' . $prefix;
            $response = @file_get_contents($url, false, $context);

            if ($response !== false && strlen($response) > 0) {
                $lines = explode("\n", $response);
                foreach ($lines as $line) {
                    $parts = explode(':', trim($line));
                    if (strtoupper($parts[0]) === $suffix) {
                        $count = (int) ($parts[1] ?? 1);

                        // Save to local cache so subsequent checks don't hit the API
                        try {
                            $db = Database::connection();
                            $insertStmt = $db->prepare(
                                "INSERT IGNORE INTO breached_passwords_list (sha1_prefix, sha1_hash, breach_count, source)
                                 VALUES (:prefix, :hash, :cnt, 'HIBP k-Anonymity')"
                            );
                            $insertStmt->execute([
                                'prefix' => $prefix,
                                'hash'   => $sha1,
                                'cnt'    => $count
                            ]);
                        } catch (\Throwable $ex) {
                            // ignore cache write error
                        }

                        return [
                            'breached' => true,
                            'count'    => $count,
                            'source'   => 'Have I Been Pwned API',
                            'message'  => "Security Alert: This password has appeared " . number_format($count) . " times in known public data breaches (NIST SP 800-63B / HIBP). For HIPAA compliance, compromised passwords cannot be used. Please choose a different, secure password."
                        ];
                    }
                }
            }
        } catch (\Throwable $e) {
            // HIBP query timed out or offline, proceed safely
        }

        return [
            'breached' => false,
            'count'    => 0,
            'message'  => 'Password has not been found in known data breaches.'
        ];
    }

    /**
     * Validate that password conforms to HIPAA password complexity requirements (§ 164.308(a)(5)(ii)(D))
     * and is not on the breached/compromised password list (NIST SP 800-63B).
     */
    public static function validateComplexity(string $password, bool $checkBreach = true): array
    {
        if (strlen($password) < 8) {
            return [
                'valid' => false,
                'message' => 'Password must be at least 8 characters long.'
            ];
        }

        if (!preg_match('/[A-Z]/', $password)) {
            return [
                'valid' => false,
                'message' => 'Password must include at least one uppercase letter (A-Z).'
            ];
        }

        if (!preg_match('/[a-z]/', $password)) {
            return [
                'valid' => false,
                'message' => 'Password must include at least one lowercase letter (a-z).'
            ];
        }

        if (!preg_match('/[0-9]/', $password)) {
            return [
                'valid' => false,
                'message' => 'Password must include at least one number (0-9).'
            ];
        }

        if (!preg_match('/[^A-Za-z0-9]/', $password)) {
            return [
                'valid' => false,
                'message' => 'Password must include at least one special character (e.g. !@#$%^&*).'
            ];
        }

        if ($checkBreach) {
            $breach = self::checkBreached($password);
            if ($breach['breached']) {
                return [
                    'valid'        => false,
                    'breached'     => true,
                    'breach_count' => $breach['count'],
                    'message'      => $breach['message']
                ];
            }
        }

        return ['valid' => true];
    }

    /**
     * Verify that new password does not match any of the last 5 passwords.
     */
    public static function checkHistory(int $userId, string $newPassword): array
    {
        $user = (new User())->where('id', $userId)->first();
        if (!$user) {
            return ['allowed' => false, 'message' => 'User not found.'];
        }

        // Check against current active password
        if (!empty($user['password']) && password_verify($newPassword, $user['password'])) {
            return [
                'allowed' => false,
                'message' => 'For HIPAA compliance (§ 164.308(a)(5)(ii)(D)), you cannot reuse your current password. Please choose a new password.'
            ];
        }

        // Check against previous history entries
        $db = Database::connection();
        $stmt = $db->prepare("SELECT password_hash FROM user_password_history WHERE user_id = :uid ORDER BY id DESC LIMIT :lim");
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':lim', self::HISTORY_LIMIT, PDO::PARAM_INT);
        $stmt->execute();
        $historyHashes = $stmt->fetchAll(PDO::FETCH_COLUMN);

        foreach ($historyHashes as $hash) {
            if (password_verify($newPassword, $hash)) {
                return [
                    'allowed' => false,
                    'message' => 'For HIPAA compliance (§ 164.308(a)(5)(ii)(D)), you cannot reuse any of your last 5 passwords. Please choose a new password.'
                ];
            }
        }

        return ['allowed' => true];
    }

    /**
     * Record a password change, update user record, archive into history, and log to HIPAA audit trail.
     */
    public static function recordPasswordChange(int $userId, string $newPassword, ?int $changedBy = null, string $reason = 'Password updated'): void
    {
        $newHash = password_hash($newPassword, PASSWORD_DEFAULT);
        $now = date('Y-m-d H:i:s');
        $db = Database::connection();

        // 1. Insert into history table
        $stmt = $db->prepare("INSERT INTO user_password_history (user_id, password_hash, created_at) VALUES (:uid, :hash, :created_at)");
        $stmt->execute([
            'uid' => $userId,
            'hash' => $newHash,
            'created_at' => $now
        ]);

        // 2. Prune history to keep only last HISTORY_LIMIT records
        $stmt = $db->prepare("SELECT id FROM user_password_history WHERE user_id = :uid ORDER BY id DESC LIMIT :lim");
        $stmt->bindValue(':uid', $userId, PDO::PARAM_INT);
        $stmt->bindValue(':lim', self::HISTORY_LIMIT, PDO::PARAM_INT);
        $stmt->execute();
        $keepIds = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($keepIds)) {
            $inClause = implode(',', array_map('intval', $keepIds));
            $db->exec("DELETE FROM user_password_history WHERE user_id = {$userId} AND id NOT IN ({$inClause})");
        }

        // 3. Update users table
        (new User())->update([
            'password'             => $newHash,
            'password_changed_at'  => $now,
            'must_change_password' => 0,
            'password_breached'    => 0,
            'failed_login_attempts'=> 0,
            'locked_until'         => null,
            'is_locked'            => 0,
            'updated_at'           => $now,
            'updated_by'           => $changedBy ?? $userId
        ], $userId);

        // 4. Log event into HIPAA audit trail
        $user = (new User())->where('id', $userId)->first();
        $username = $user['username'] ?? "ID {$userId}";
        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'PASSWORD_CHANGED',
            "Password changed for user '{$username}' (ID: {$userId}). Reason: {$reason}. Password history updated (§ 164.308).",
            null,
            $userId,
            !empty($user['role_id']) ? 'user' : 'patient'
        );
    }

    /**
     * Compute password expiration and reminder metadata for a user.
     */
    public static function checkExpirationStatus(array $user): array
    {
        $changedAt = $user['password_changed_at'] ?? $user['created_at'] ?? date('Y-m-d H:i:s');
        $timestamp = strtotime($changedAt);
        $daysOld = (int) floor((time() - $timestamp) / 86400);
        $daysRemaining = self::MAX_AGE_DAYS - $daysOld;

        return [
            'expired'        => $daysRemaining <= 0,
            'expiring_soon'  => $daysRemaining > 0 && $daysRemaining <= self::WARNING_WINDOW_DAYS,
            'days_old'       => $daysOld,
            'days_remaining' => max(0, $daysRemaining),
            'max_days'       => self::MAX_AGE_DAYS
        ];
    }
}
