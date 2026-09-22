<?php

namespace App\Core;

use PDO;
use Throwable;

class AuditLogger
{
    public const CATEGORY_AUTH = 'AUTHENTICATION';
    public const CATEGORY_CHART = 'CHART_ACCESS';
    public const CATEGORY_CLINICAL = 'CLINICAL_DATA';
    public const CATEGORY_EXPORT = 'EXPORT_PRINT';
    public const CATEGORY_DISCLOSURE = 'DISCLOSURE';
    public const CATEGORY_EMERGENCY = 'EMERGENCY_ACCESS';
    public const CATEGORY_SECURITY = 'ADMIN_SECURITY';
    public const CATEGORY_CONSENT = 'PATIENT_CONSENT';

    public const ACTION_LOGIN_SUCCESS = 'LOGIN_SUCCESS';
    public const ACTION_LOGIN_FAILED = 'LOGIN_FAILED';
    public const ACTION_LOGOUT = 'LOGOUT';
    public const ACTION_TIMEOUT = 'INACTIVITY_LOGOUT';
    public const ACTION_CHART_VIEW = 'VIEW_CHART';
    public const ACTION_CHART_EDIT = 'EDIT_CHART';
    public const ACTION_PATIENT_REGISTER = 'PATIENT_REGISTER';
    public const ACTION_PATIENT_UPDATE = 'PATIENT_UPDATE';
    public const ACTION_PATIENT_DELETE = 'PATIENT_DELETE';
    public const ACTION_PRINT_SUMMARY = 'PRINT_SUMMARY';
    public const ACTION_EXPORT_CCD = 'EXPORT_CCD';
    public const ACTION_BREAK_GLASS = 'BREAK_GLASS';
    public const ACTION_DISCLOSURE_RECORDED = 'RECORD_DISCLOSURE';
    public const ACTION_ACCOUNT_LOCKED = 'ACCOUNT_LOCKED';
    public const ACTION_ACCOUNT_UNLOCKED = 'ACCOUNT_UNLOCKED';
    public const ACTION_AUDIT_EXPORT_CSV = 'AUDIT_EXPORT_CSV';
    public const ACTION_AUDIT_EXPORT_PDF = 'AUDIT_EXPORT_PDF';
    public const ACTION_RETENTION_PURGE_BLOCKED = 'RETENTION_PURGE_BLOCKED';
    public const ACTION_RETENTION_VERIFIED = 'RETENTION_VERIFIED';
    public const ACTION_NPP_ACKNOWLEDGED = 'NPP_ACKNOWLEDGED';
    public const ACTION_NPP_ACKNOWLEDGED_IN_CLINIC = 'NPP_ACKNOWLEDGED_IN_CLINIC';

    private const GENESIS_SALT = 'GENESIS_HIPAA_INTEGRITY_SALT_USINTELLIX_2026';

    /**
     * Record a tamper-evident audit event per HIPAA Security Rule § 164.312(b).
     */
    public static function log(
        string $category,
        string $action,
        string $description,
        ?int $patientId = null,
        ?int $userId = null,
        ?string $userRole = null
    ): ?int {
        try {
            $db = Database::connection();

            // Resolve session user if not passed explicitly
            if ($userId === null || $userRole === null) {
                $sessionUser = Session::get('user');
                if (is_array($sessionUser)) {
                    $userId = $userId ?? (isset($sessionUser['id']) ? (int) $sessionUser['id'] : null);
                    $userRole = $userRole ?? ($sessionUser['role'] ?? null);
                }
            }

            $ip = self::resolveClientIp();
            $agent = substr($_SERVER['HTTP_USER_AGENT'] ?? 'CLI/Service', 0, 255);
            $now = date('Y-m-d H:i:s');

            // Fetch previous tamper hash for the blockchain-style cryptographic chain
            $stmtLast = $db->query("SELECT tamper_hash FROM hipaa_audit_logs ORDER BY id DESC LIMIT 1");
            $prevHash = $stmtLast->fetchColumn() ?: self::GENESIS_SALT;

            // Compute SHA-256 HMAC digest
            $payload = "{$prevHash}|{$userId}|{$userRole}|{$patientId}|{$category}|{$action}|{$description}|{$ip}|{$now}";
            $tamperHash = hash('sha256', $payload);

            $stmt = $db->prepare("
                INSERT INTO hipaa_audit_logs 
                    (user_id, user_role, patient_id, event_category, action, description, ip_address, user_agent, tamper_hash, created_at)
                VALUES 
                    (:user_id, :user_role, :patient_id, :category, :action, :description, :ip, :user_agent, :tamper_hash, :created_at)
            ");

            $stmt->execute([
                'user_id'     => $userId,
                'user_role'   => $userRole,
                'patient_id'  => $patientId,
                'category'    => $category,
                'action'      => $action,
                'description' => $description,
                'ip'          => $ip,
                'user_agent'  => $agent,
                'tamper_hash' => $tamperHash,
                'created_at'  => $now,
            ]);

            return (int) $db->lastInsertId();
        } catch (Throwable $e) {
            error_log("HIPAA AuditLogger failure: " . $e->getMessage());
            return null;
        }
    }

    /**
     * Verify the cryptographic tamper-evident integrity of the audit log chain (§ 164.312(c)(1)).
     */
    public static function verifyIntegrity(int $limit = 5000): array
    {
        try {
            $db = Database::connection();
            $rows = $db->query("SELECT id, user_id, user_role, patient_id, event_category, action, description, ip_address, tamper_hash, created_at FROM hipaa_audit_logs ORDER BY id ASC LIMIT {$limit}")->fetchAll(PDO::FETCH_ASSOC);

            if (empty($rows)) {
                return [
                    'valid' => true,
                    'total_verified' => 0,
                    'message' => 'Audit log is clean and empty.'
                ];
            }

            $prevHash = self::GENESIS_SALT;
            $verifiedCount = 0;

            foreach ($rows as $row) {
                $payload = "{$prevHash}|{$row['user_id']}|{$row['user_role']}|{$row['patient_id']}|{$row['event_category']}|{$row['action']}|{$row['description']}|{$row['ip_address']}|{$row['created_at']}";
                $expectedHash = hash('sha256', $payload);

                if ($row['tamper_hash'] !== $expectedHash) {
                    return [
                        'valid' => false,
                        'total_verified' => $verifiedCount,
                        'corrupted_id' => $row['id'],
                        'message' => "Cryptographic integrity failure detected at log ID #{$row['id']}. Record has been altered or tampered with."
                    ];
                }

                $prevHash = $row['tamper_hash'];
                $verifiedCount++;
            }

            return [
                'valid' => true,
                'total_verified' => $verifiedCount,
                'message' => "Cryptographic integrity verified: all {$verifiedCount} audit log entries match their sequential SHA-256 tamper-evident chain."
            ];
        } catch (Throwable $e) {
            return [
                'valid' => false,
                'message' => 'Error during integrity verification: ' . $e->getMessage()
            ];
        }
    }

    private static function resolveClientIp(): string
    {
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($parts[0]);
        }

        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }
}
