<?php

namespace App\Modules\MyChart\Services;

use App\Core\Database;
use App\Core\Mailer;
use PDO;
use Throwable;

/**
 * Notifications for My Chart (Phase 6): the outbox, the in-app bell, and what the
 * patient wants to be told about.
 *
 * Two rules decide whether anything is sent at all, in this order:
 *
 *   1. the hospital's master switches in general_settings -- a channel switched off
 *      there is off for everyone, full stop;
 *   2. the patient's own preference, which can only narrow that, never widen it.
 *
 * Nothing clinical goes into a notification. It says a result is ready, never what the
 * result is: email and SMS are not safe places for that, and the patient reads the
 * detail after signing in.
 */
class PortalNotificationService
{
    public const CHANNELS = ['in_app', 'email', 'sms'];

    /** SMS has no gateway wired up here; a row queued for it is left for one to be added. */
    public const SENDABLE = ['email'];

    // ------------------------------------------------------------------
    // Settings
    // ------------------------------------------------------------------

    /** The hospital's master switches. A channel off here is off for everybody. */
    public static function masterSwitches(): array
    {
        try {
            $row = Database::connection()->query(
                "SELECT notification_email_enabled, notification_sms_enabled, notification_in_app_enabled,
                        email_gateway_provider, sms_gateway_provider
                 FROM general_settings LIMIT 1"
            )->fetch(PDO::FETCH_ASSOC) ?: [];
        } catch (Throwable $e) {
            $row = [];
        }

        return [
            'email' => (int) ($row['notification_email_enabled'] ?? 1) === 1,
            'sms' => (int) ($row['notification_sms_enabled'] ?? 1) === 1,
            'in_app' => (int) ($row['notification_in_app_enabled'] ?? 1) === 1,
            'email_provider' => $row['email_gateway_provider'] ?? 'SMTP',
            'sms_provider' => $row['sms_gateway_provider'] ?? null,
        ];
    }

    /** The event types a hospital may notify about, with their templates. */
    public static function types(): array
    {
        return Database::connection()->query(
            "SELECT event_type, label, description, title_template, body_template, link_tab,
                    default_email, default_sms, default_in_app
             FROM portal_notification_types WHERE is_active = 1 ORDER BY sequence, id"
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * What this patient will actually be told, per event and channel: the default from
     * the type, narrowed by the patient's own choice, and shown as unavailable where
     * the hospital has switched the channel off.
     */
    public static function preferences(int $patientId): array
    {
        $db = Database::connection();
        $master = self::masterSwitches();

        $stmt = $db->prepare("SELECT channel, event_type, is_enabled FROM patient_notification_preferences WHERE patient_id = :p");
        $stmt->execute(['p' => $patientId]);

        $chosen = [];
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $chosen[$r['event_type']][$r['channel']] = (int) $r['is_enabled'] === 1;
        }

        $items = [];
        foreach (self::types() as $t) {
            $row = ['event_type' => $t['event_type'], 'label' => $t['label'], 'description' => $t['description'], 'channels' => []];

            foreach (self::CHANNELS as $channel) {
                $default = (int) $t['default_' . $channel] === 1;
                $row['channels'][$channel] = [
                    'enabled' => $master[$channel] && ($chosen[$t['event_type']][$channel] ?? $default),
                    'chosen' => $chosen[$t['event_type']][$channel] ?? null,
                    'default' => $default,
                    'available' => $master[$channel],
                ];
            }

            $items[] = $row;
        }

        return ['items' => $items, 'master' => $master];
    }

    /** The patient turns one event and channel on or off. */
    public static function savePreference(int $patientId, string $eventType, string $channel, bool $enabled): array
    {
        if (!in_array($channel, self::CHANNELS, true)) {
            return ['success' => false, 'message' => 'That is not a way we can reach you.'];
        }

        $db = Database::connection();
        $known = $db->prepare("SELECT COUNT(*) FROM portal_notification_types WHERE event_type = :e AND is_active = 1");
        $known->execute(['e' => $eventType]);

        if ((int) $known->fetchColumn() === 0) {
            return ['success' => false, 'message' => 'That is not something we send about.'];
        }

        $db->prepare(
            "INSERT INTO patient_notification_preferences (patient_id, channel, event_type, is_enabled, created_at, updated_by)
             VALUES (:p, :c, :e, :on, NOW(), :u)
             ON DUPLICATE KEY UPDATE is_enabled = VALUES(is_enabled), updated_at = NOW(), updated_by = VALUES(updated_by)"
        )->execute(['p' => $patientId, 'c' => $channel, 'e' => $eventType, 'on' => $enabled ? 1 : 0, 'u' => $patientId]);

        return ['success' => true, 'message' => $enabled ? 'We will let you know.' : 'We will stop sending those.'];
    }

    /** Whether one channel is on for this patient and event. */
    public static function wants(int $patientId, string $eventType, string $channel): bool
    {
        $master = self::masterSwitches();

        if (empty($master[$channel])) {
            return false;
        }

        $db = Database::connection();
        $stmt = $db->prepare(
            "SELECT p.is_enabled, t.default_email, t.default_sms, t.default_in_app
             FROM portal_notification_types t
             LEFT JOIN patient_notification_preferences p ON p.event_type = t.event_type AND p.channel = :c AND p.patient_id = :p
             WHERE t.event_type = :e AND t.is_active = 1"
        );
        $stmt->execute(['c' => $channel, 'p' => $patientId, 'e' => $eventType]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return false;
        }

        return $row['is_enabled'] === null
            ? (int) $row['default_' . $channel] === 1
            : (int) $row['is_enabled'] === 1;
    }

    // ------------------------------------------------------------------
    // Queueing
    // ------------------------------------------------------------------

    /**
     * Queue a notification on every channel the patient allows.
     *
     * $vars fills the template ({name}, {date}, {time}, {amount}, {what}). $dedupeKey
     * makes the whole thing safe to call twice -- the same key is never queued twice on
     * the same channel, so a cron and an event hook can both ask without duplicating.
     *
     * @return int how many rows were queued
     */
    public static function queue(int $patientId, string $eventType, array $vars = [], ?string $dedupeKey = null, ?string $sendAfter = null): int
    {
        $db = Database::connection();
        $stmt = $db->prepare("SELECT * FROM portal_notification_types WHERE event_type = :e AND is_active = 1");
        $stmt->execute(['e' => $eventType]);
        $type = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$type) {
            return 0;
        }

        $title = self::fill($type['title_template'], $vars);
        $body = self::fill((string) $type['body_template'], $vars);
        $key = $dedupeKey ?: $eventType . ':' . $patientId . ':' . substr(md5($title . $body), 0, 12);
        $queued = 0;

        $insert = $db->prepare(
            "INSERT IGNORE INTO patient_notifications
                (patient_id, event_type, title, body, link_tab, link_id, channel, status, dedupe_key, send_after, created_at)
             VALUES (:p, :e, :title, :body, :tab, :link, :channel, 'queued', :key, :after, NOW())"
        );

        foreach (self::CHANNELS as $channel) {
            if (!self::wants($patientId, $eventType, $channel)) {
                continue;
            }

            $insert->execute([
                'p' => $patientId, 'e' => $eventType, 'title' => mb_substr($title, 0, 150), 'body' => mb_substr($body, 0, 500),
                'tab' => $type['link_tab'], 'link' => isset($vars['link_id']) ? (int) $vars['link_id'] : null,
                'channel' => $channel, 'key' => mb_substr($key, 0, 120), 'after' => $sendAfter,
            ]);
            $queued += $insert->rowCount();
        }

        return $queued;
    }

    private static function fill(string $template, array $vars): string
    {
        foreach ($vars as $k => $v) {
            $template = str_replace('{' . $k . '}', (string) $v, $template);
        }

        // Anything the caller did not supply is dropped rather than shown raw.
        return trim(preg_replace('/\s*\{[a-z_]+\}/', '', $template));
    }

    // ------------------------------------------------------------------
    // The bell
    // ------------------------------------------------------------------

    /** The patient's in-app notifications, newest first. */
    public static function listFor(int $patientId, bool $unreadOnly = false): array
    {
        $db = Database::connection();
        $where = $unreadOnly ? "AND n.read_at IS NULL" : '';

        $stmt = $db->prepare(
            "SELECT id, event_type, title, body, link_tab, link_id, status, read_at, created_at
             FROM patient_notifications n
             WHERE n.patient_id = :p AND n.channel = 'in_app' {$where}
             ORDER BY n.created_at DESC, n.id DESC
             LIMIT 100"
        );
        $stmt->execute(['p' => $patientId]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'items' => array_map(static fn(array $r) => [
                'id' => (int) $r['id'],
                'event_type' => $r['event_type'],
                'title' => $r['title'],
                'body' => $r['body'],
                'link_tab' => $r['link_tab'],
                'link_id' => $r['link_id'] !== null ? (int) $r['link_id'] : null,
                'read' => $r['read_at'] !== null,
                'at' => $r['created_at'],
            ], $items),
            'unread' => count(array_filter($items, static fn($r) => $r['read_at'] === null)),
        ];
    }

    /** Mark one notification, or all of them, as read. */
    public static function markRead(int $patientId, ?int $notificationId = null): array
    {
        $db = Database::connection();

        if ($notificationId) {
            $stmt = $db->prepare(
                "UPDATE patient_notifications SET read_at = NOW(), status = 'read'
                 WHERE id = :id AND patient_id = :p AND channel = 'in_app' AND read_at IS NULL"
            );
            $stmt->execute(['id' => $notificationId, 'p' => $patientId]);
        } else {
            $stmt = $db->prepare(
                "UPDATE patient_notifications SET read_at = NOW(), status = 'read'
                 WHERE patient_id = :p AND channel = 'in_app' AND read_at IS NULL"
            );
            $stmt->execute(['p' => $patientId]);
        }

        return ['success' => true, 'message' => 'Marked as read.', 'data' => ['marked' => $stmt->rowCount()]];
    }

    // ------------------------------------------------------------------
    // The outbox (the cron)
    // ------------------------------------------------------------------

    /**
     * Send what is waiting. In-app rows need no sending -- they are read in the portal --
     * so only the channels with a gateway are attempted. A row that fails keeps its
     * attempt count and the reason, and is tried again next time up to the limit.
     *
     * @return array{sent:int,failed:int,skipped:int}
     */
    public static function drain(int $limit = 100): array
    {
        $db = Database::connection();
        $master = self::masterSwitches();
        $sent = $failed = $skipped = 0;

        $stmt = $db->prepare(
            "SELECT n.id, n.patient_id, n.channel, n.title, n.body, n.attempts,
                    c.email AS contact_email,
                    TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))) AS patient_name
             FROM patient_notifications n
             JOIN patients p ON p.id = n.patient_id AND p.deleted_at IS NULL
             LEFT JOIN patient_contacts c ON c.patient_id = p.id AND c.deleted_at IS NULL
             WHERE n.status = 'queued' AND n.channel <> 'in_app' AND n.attempts < 5
               AND (n.send_after IS NULL OR n.send_after <= NOW())
             ORDER BY n.id
             LIMIT {$limit}"
        );
        $stmt->execute();

        $mailer = new Mailer();

        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
            $channel = $row['channel'];

            // The master switch may have been turned off after the row was queued.
            if (empty($master[$channel]) || !in_array($channel, self::SENDABLE, true)) {
                $db->prepare("UPDATE patient_notifications SET status = 'failed', last_error = :why WHERE id = :id")
                    ->execute(['why' => empty($master[$channel]) ? 'The hospital has this channel switched off.' : 'No gateway for this channel yet.', 'id' => $row['id']]);
                $skipped++;
                continue;
            }

            $to = trim((string) $row['contact_email']);

            if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
                $db->prepare("UPDATE patient_notifications SET status = 'failed', attempts = attempts + 1, last_error = 'No usable email address on file.' WHERE id = :id")
                    ->execute(['id' => $row['id']]);
                $failed++;
                continue;
            }

            $ok = false;
            try {
                $ok = $mailer->send($to, $row['title'], self::plain($row));
            } catch (Throwable $e) {
                $db->prepare("UPDATE patient_notifications SET attempts = attempts + 1, last_error = :err WHERE id = :id")
                    ->execute(['err' => mb_substr($e->getMessage(), 0, 255), 'id' => $row['id']]);
            }

            if ($ok) {
                $db->prepare("UPDATE patient_notifications SET status = 'sent', sent_at = NOW(), attempts = attempts + 1 WHERE id = :id")
                    ->execute(['id' => $row['id']]);
                $sent++;
            } else {
                $db->prepare("UPDATE patient_notifications SET attempts = attempts + 1, last_error = COALESCE(last_error, 'The message could not be sent.') WHERE id = :id")
                    ->execute(['id' => $row['id']]);
                $failed++;
            }
        }

        return ['sent' => $sent, 'failed' => $failed, 'skipped' => $skipped];
    }

    /** The body of an email: never the result itself, only that there is one. */
    private static function plain(array $row): string
    {
        $name = trim((string) $row['patient_name']);

        return trim(($name !== '' ? "Dear {$name},\n\n" : '') . $row['body']
            . "\n\nSign in to My Chart to see it. Please do not reply to this message."
            . "\n\nIf this is urgent, telephone the hospital.");
    }

    // ------------------------------------------------------------------
    // What the cron queues
    // ------------------------------------------------------------------

    /** Appointments a day away that nobody has been reminded about yet. */
    public static function queueAppointmentReminders(): int
    {
        $db = Database::connection();
        $stmt = $db->query(
            "SELECT a.id, a.patient_id, a.appointment_date, a.appointment_time
             FROM appointments a
             JOIN patients p ON p.id = a.patient_id AND p.deleted_at IS NULL
             WHERE a.deleted_at IS NULL AND a.is_provider_block = 0 AND a.status = 'scheduled'
               AND TIMESTAMP(a.appointment_date, COALESCE(a.appointment_time, '09:00:00'))
                   BETWEEN NOW() AND NOW() + INTERVAL 24 HOUR"
        );

        $queued = 0;
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $a) {
            $queued += self::queue((int) $a['patient_id'], 'appointment_reminder', [
                'date' => $a['appointment_date'],
                'time' => substr((string) $a['appointment_time'], 0, 5),
                'link_id' => (int) $a['id'],
            ], 'appointment_reminder:' . $a['id']);
        }

        return $queued;
    }

    /** Check-in that has just opened, for anyone who has not been told. */
    public static function queueCheckinOpen(): int
    {
        $db = Database::connection();
        $stmt = $db->query(
            "SELECT a.id, a.patient_id, a.appointment_date
             FROM appointments a
             JOIN patients p ON p.id = a.patient_id AND p.deleted_at IS NULL
             WHERE a.deleted_at IS NULL AND a.is_provider_block = 0 AND a.status = 'scheduled'
               AND TIMESTAMP(a.appointment_date, COALESCE(a.appointment_time, '09:00:00'))
                   BETWEEN NOW() + INTERVAL 24 HOUR AND NOW() + INTERVAL " . PortalCheckinService::OPENS_HOURS . " HOUR
               AND NOT EXISTS (SELECT 1 FROM portal_checkins c WHERE c.appointment_id = a.id AND c.status = 'completed')"
        );

        $queued = 0;
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $a) {
            $queued += self::queue((int) $a['patient_id'], 'checkin_open', [
                'date' => $a['appointment_date'], 'link_id' => (int) $a['id'],
            ], 'checkin_open:' . $a['id']);
        }

        return $queued;
    }

    /**
     * Patients with something to pay who have not been told this week. The amount is
     * formatted with the hospital's own currency settings, so the message reads properly.
     */
    public static function queueStatements(): int
    {
        $db = Database::connection();
        $money = PortalPaymentService::moneySettings();
        $stmt = $db->query(
            "SELECT DISTINCT p.id AS patient_id
             FROM patients p
             WHERE p.deleted_at IS NULL AND p.user_id IS NOT NULL
               AND (EXISTS (SELECT 1 FROM lab_charges c WHERE c.patient_id = p.id AND c.status = 'charged')
                 OR EXISTS (SELECT 1 FROM rad_charges c WHERE c.patient_id = p.id AND c.status = 'charged'))
               AND NOT EXISTS (
                   SELECT 1 FROM patient_notifications n
                   WHERE n.patient_id = p.id AND n.event_type = 'statement_ready'
                     AND n.created_at >= NOW() - INTERVAL 7 DAY)
             LIMIT 500"
        );

        $queued = 0;
        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $patientId) {
            $owed = PortalPaymentService::outstanding((int) $patientId);

            if ($owed['balance'] <= 0) {
                continue;
            }

            $amount = number_format($owed['balance'], (int) ($money['decimals'] ?? 2));
            $amount = ($money['position'] ?? 'prefix') === 'suffix'
                ? $amount . ($money['symbol'] ?? '')
                : ($money['symbol'] ?? '') . $amount;

            $queued += self::queue((int) $patientId, 'statement_ready', ['amount' => $amount],
                'statement_ready:' . $patientId . ':' . date('oW'));
        }

        return $queued;
    }

    /** Results released since the last run that the patient has not been told about. */
    public static function queueReleasedResults(): int
    {
        $db = Database::connection();
        $stmt = $db->query(
            "SELECT o.id AS order_id, o.patient_id, COALESCE(c.name, pc.name) AS test_name
             FROM patient_procedure_orders o
             JOIN patient_procedure_results r ON r.patient_procedure_order_id = o.id AND r.deleted_at IS NULL
             LEFT JOIN procedure_order_configs c ON c.id = o.procedure_order_config_id
             LEFT JOIN procedure_order_configs pc ON pc.id = c.parent_id
             WHERE o.deleted_at IS NULL AND r.portal_hold_reason IS NULL
               AND r.portal_release_at IS NOT NULL AND r.portal_release_at <= NOW()
               AND r.portal_release_at >= NOW() - INTERVAL 7 DAY
             GROUP BY o.id, o.patient_id, test_name"
        );

        $queued = 0;
        foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $r) {
            $queued += self::queue((int) $r['patient_id'], 'result_released', [
                'what' => $r['test_name'] ?: 'a test', 'link_id' => (int) $r['order_id'],
            ], 'result_released:' . $r['order_id']);
        }

        return $queued;
    }
}
