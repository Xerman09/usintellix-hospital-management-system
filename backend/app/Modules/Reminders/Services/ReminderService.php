<?php

namespace App\Modules\Reminders\Services;

use App\Core\Database;
use App\Modules\Reminders\Models\Reminder;
use App\Modules\Reminders\Models\ReminderRecipient;
use PDO;

class ReminderService
{
    private const PRIORITIES = ['low', 'medium', 'high'];

    private const SENDER_NAME_SQL =
        "COALESCE(
            NULLIF(TRIM(CONCAT(se.first_name, ' ', se.last_name)), ''),
            NULLIF(TRIM(CONCAT(sp.first_name, ' ', sp.last_name)), ''),
            su.username
        )";

    /**
     * Every reminder the logged-in user sent or was sent, newest due
     * date first, along with this user's own completion status.
     */
    public function listMine(int $userId): array
    {
        $senderName = self::SENDER_NAME_SQL;

        $stmt = Database::connection()->prepare(
            "SELECT r.id, r.sender_id, {$senderName} AS sender_name,
                    r.patient_id,
                    NULLIF(TRIM(CONCAT(pt.first_name, ' ', pt.last_name)), '') AS patient_name,
                    r.due_date, r.priority, r.body, r.require_each_complete,
                    r.created_at,
                    (rr.id IS NOT NULL) AS is_recipient,
                    rr.completed_at AS my_completed_at,
                    (SELECT COUNT(*) FROM reminder_recipients WHERE reminder_id = r.id) AS recipient_count,
                    (SELECT COUNT(*) FROM reminder_recipients WHERE reminder_id = r.id AND completed_at IS NOT NULL) AS completed_count
             FROM reminders r
             LEFT JOIN users su ON su.id = r.sender_id
             LEFT JOIN employees se ON se.user_id = su.id AND se.deleted_at IS NULL
             LEFT JOIN patients sp ON sp.user_id = su.id AND sp.deleted_at IS NULL
             LEFT JOIN patients pt ON pt.id = r.patient_id
             LEFT JOIN reminder_recipients rr ON rr.reminder_id = r.id AND rr.user_id = :user_id
             WHERE r.deleted_at IS NULL
               AND (r.sender_id = :user_id2 OR rr.id IS NOT NULL)
             ORDER BY (r.due_date IS NULL), r.due_date ASC, r.id DESC"
        );

        $stmt->execute(['user_id' => $userId, 'user_id2' => $userId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Send a new dated reminder to one or more recipients.
     */
    public function store(array $data, int $userId): array
    {
        $recipientIds = array_values(array_unique(array_filter(
            array_map('intval', $data['recipient_ids'] ?? [])
        )));

        $errors = $this->validate($data, $recipientIds);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $placeholders = implode(',', array_fill(0, count($recipientIds), '?'));
        $stmt = Database::connection()->prepare(
            "SELECT id FROM users WHERE deleted_at IS NULL AND id IN ({$placeholders})"
        );
        $stmt->execute($recipientIds);

        if (count($stmt->fetchAll(PDO::FETCH_COLUMN)) !== count($recipientIds)) {
            return [
                'success' => false,
                'message' => 'One or more recipients could not be found.'
            ];
        }

        $reminderId = (new Reminder())->create([
            'sender_id' => $userId,
            'patient_id' => $data['patient_id'] ?: null,
            'due_date' => $data['due_date'] ?: null,
            'priority' => $data['priority'] ?: 'low',
            'body' => trim((string) $data['body']),
            'require_each_complete' => !empty($data['require_each_complete']) ? 1 : 0,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        if (!$reminderId) {
            return [
                'success' => false,
                'message' => 'Failed to send reminder.'
            ];
        }

        $now = date('Y-m-d H:i:s');

        foreach ($recipientIds as $recipientId) {
            (new ReminderRecipient())->create([
                'reminder_id' => $reminderId,
                'user_id' => $recipientId,
                'created_at' => $now
            ]);
        }

        return [
            'success' => true,
            'message' => 'Reminder sent successfully.',
            'data' => ['id' => $reminderId]
        ];
    }

    /**
     * Mark the logged-in user's own copy of a reminder as completed.
     */
    public function complete(int $reminderId, int $userId): array
    {
        $recipient = (new ReminderRecipient())
            ->where('reminder_id', $reminderId)
            ->where('user_id', $userId)
            ->first();

        if (!$recipient) {
            return [
                'success' => false,
                'message' => 'Reminder not found.'
            ];
        }

        (new ReminderRecipient())->update([
            'completed_at' => date('Y-m-d H:i:s')
        ], (int) $recipient['id']);

        return [
            'success' => true,
            'message' => 'Reminder marked as completed.'
        ];
    }

    /**
     * Soft-delete a reminder. Only the original sender may remove it.
     */
    public function remove(int $id, int $userId): array
    {
        $reminder = (new Reminder())->where('id', $id)->first();

        if (!$reminder || $reminder['deleted_at'] !== null || (int) $reminder['sender_id'] !== $userId) {
            return [
                'success' => false,
                'message' => 'Reminder not found.'
            ];
        }

        (new Reminder())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        return [
            'success' => true,
            'message' => 'Reminder removed successfully.'
        ];
    }

    private function validate(array $data, array $recipientIds): array
    {
        $errors = [];

        if (empty($recipientIds)) {
            $errors['recipient_ids'] = 'At least one recipient is required.';
        }

        $body = trim((string) ($data['body'] ?? ''));

        if ($body === '') {
            $errors['body'] = 'Message is required.';
        } elseif (strlen($body) > 160) {
            $errors['body'] = 'Message must be 160 characters or fewer.';
        }

        if (!empty($data['due_date']) && strtotime($data['due_date']) === false) {
            $errors['due_date'] = 'Due date is invalid.';
        }

        if (!empty($data['priority']) && !in_array($data['priority'], self::PRIORITIES, true)) {
            $errors['priority'] = 'Priority must be low, medium, or high.';
        }

        return $errors;
    }
}
