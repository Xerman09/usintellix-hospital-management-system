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
     * Validate that password conforms to HIPAA password complexity requirements (§ 164.308(a)(5)(ii)(D)).
     */
    public static function validateComplexity(string $password): array
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
