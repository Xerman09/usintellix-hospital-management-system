<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;

/**
 * The one writer for portal_audit_logs.
 *
 * Every My Chart page a patient opens, and every refusal, goes through here, so
 * "who has seen my record" (Phase 8) and the disclosure accounting can be built
 * from a single, complete table instead of per-module logging that each page
 * remembers to do differently.
 *
 * Writing the log must never break the page the patient asked for: a failure here
 * is swallowed, because an unavailable audit row is not a reason to deny someone
 * their own chart.
 */
class PortalAudit
{
    public const SUCCESS = 'Success';
    public const DENIED = 'Denied';

    /**
     * A patient opened a My Chart page. $event is the page in plain words
     * ("Health Summary Viewed"), matching the Title Case already in the table.
     */
    public static function view(?array $user, ?int $patientId, string $event, string $description = ''): void
    {
        self::write($user, $patientId, $event, $description !== '' ? $description : $event, self::SUCCESS);
    }

    /** A patient did something that changed data (paid a bill, signed a consent). */
    public static function action(?array $user, ?int $patientId, string $event, string $description): void
    {
        self::write($user, $patientId, $event, $description, self::SUCCESS);
    }

    /** A request was refused -- no patient record, no proxy grant, or the capability is switched off. */
    public static function denied(?array $user, ?int $patientId, string $event, string $description): void
    {
        self::write($user, $patientId, $event, $description, self::DENIED);
    }

    private static function write(?array $user, ?int $patientId, string $event, string $description, string $status): void
    {
        try {
            $stmt = Database::connection()->prepare(
                "INSERT INTO portal_audit_logs
                    (patient_id, user_id, event_type, description, ip_address, status, created_at)
                 VALUES (:patient_id, :user_id, :event_type, :description, :ip, :status, NOW())"
            );

            $stmt->execute([
                'patient_id'  => $patientId ?: null,
                'user_id'     => isset($user['id']) ? (int) $user['id'] : null,
                'event_type'  => mb_substr($event, 0, 100),
                'description' => $description,
                'ip'          => mb_substr(self::ip(), 0, 45),
                'status'      => mb_substr($status, 0, 50),
            ]);
        } catch (\Throwable $e) {
            // Deliberately ignored -- see the class comment.
        }
    }

    /**
     * The caller's address. Proxy headers are read only when the app is behind one
     * (APP_TRUSTED_PROXY), since otherwise a client can put anything in them.
     */
    private static function ip(): string
    {
        $direct = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';

        if (empty($_ENV['APP_TRUSTED_PROXY']) && empty($_SERVER['APP_TRUSTED_PROXY'])) {
            return $direct;
        }

        $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';

        if ($forwarded === '') {
            return $direct;
        }

        $first = trim(explode(',', $forwarded)[0]);

        return $first !== '' ? $first : $direct;
    }
}
