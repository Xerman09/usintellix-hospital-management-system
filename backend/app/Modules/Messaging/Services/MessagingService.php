<?php

namespace App\Modules\Messaging\Services;

use App\Core\Database;
use App\Modules\Messaging\Models\Conversation;
use App\Modules\Messaging\Models\ConversationParticipant;
use App\Modules\Messaging\Models\Message;
use PDO;

class MessagingService
{
    private const SENDER_NAME_SQL =
        "COALESCE(
            NULLIF(TRIM(CONCAT(se.first_name, ' ', se.last_name)), ''),
            NULLIF(TRIM(CONCAT(sp.first_name, ' ', sp.last_name)), ''),
            su.username
        )";

    /**
     * List the conversations the given user participates in, most
     * recently active first, with a snippet of the latest message.
     */
    public function listConversations(int $userId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT c.id, c.subject, c.created_at,
                    lm.body AS last_message_body,
                    lm.created_at AS last_message_at,
                    CASE
                        WHEN lm.id IS NULL THEN 0
                        WHEN lm.sender_id = :user_id2 THEN 0
                        WHEN cp.last_read_at IS NULL OR cp.last_read_at < lm.created_at THEN 1
                        ELSE 0
                    END AS is_unread
             FROM conversations c
             INNER JOIN conversation_participants cp
                    ON cp.conversation_id = c.id AND cp.user_id = :user_id
             LEFT JOIN messages lm
                    ON lm.id = (
                        SELECT m2.id FROM messages m2
                        WHERE m2.conversation_id = c.id AND m2.deleted_at IS NULL
                        ORDER BY m2.created_at DESC, m2.id DESC
                        LIMIT 1
                    )
             WHERE c.deleted_at IS NULL
             ORDER BY COALESCE(lm.created_at, c.created_at) DESC"
        );

        $stmt->execute(['user_id' => $userId, 'user_id2' => $userId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Start a new conversation between the given user and the supplied
     * participant ids.
     */
    public function createConversation(int $userId, array $participantIds, ?string $subject = null): array
    {
        $participantIds = array_values(array_unique(array_filter(
            array_map('intval', $participantIds)
        )));

        if (empty($participantIds)) {
            return [
                'success' => false,
                'message' => 'At least one recipient is required.'
            ];
        }

        $placeholders = implode(',', array_fill(0, count($participantIds), '?'));
        $stmt = Database::connection()->prepare(
            "SELECT id FROM users WHERE deleted_at IS NULL AND id IN ({$placeholders})"
        );
        $stmt->execute($participantIds);

        if (count($stmt->fetchAll(PDO::FETCH_COLUMN)) !== count($participantIds)) {
            return [
                'success' => false,
                'message' => 'One or more recipients could not be found.'
            ];
        }

        $conversationId = (new Conversation())->create([
            'subject' => $subject !== null && $subject !== '' ? $subject : null,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        if (!$conversationId) {
            return [
                'success' => false,
                'message' => 'Failed to start conversation.'
            ];
        }

        $allParticipantIds = array_unique(array_merge([$userId], $participantIds));
        $now = date('Y-m-d H:i:s');

        foreach ($allParticipantIds as $participantId) {
            (new ConversationParticipant())->create([
                'conversation_id' => $conversationId,
                'user_id' => $participantId,
                'last_read_at' => $participantId === $userId ? $now : null,
                'created_at' => $now
            ]);
        }

        return [
            'success' => true,
            'message' => 'Conversation started successfully.',
            'data' => ['conversation_id' => $conversationId]
        ];
    }

    /**
     * The logged-in user's flat message inbox across every conversation
     * they participate in.
     */
    public function listMine(int $userId, string $scope = 'active'): array
    {
        $scopeSql = match ($scope) {
            'inactive' => 'm.deleted_at IS NOT NULL',
            'all' => '1=1',
            default => 'm.deleted_at IS NULL'
        };

        $senderName = self::SENDER_NAME_SQL;

        $stmt = Database::connection()->prepare(
            "SELECT m.id, m.conversation_id, m.sender_id,
                    {$senderName} AS sender_name,
                    m.type_id, mt.name AS type_name,
                    m.status_id, ms.name AS status_name,
                    m.patient_id,
                    NULLIF(TRIM(CONCAT(pt.first_name, ' ', pt.last_name)), '') AS patient_name,
                    m.body, m.created_at, m.deleted_at,
                    CASE
                        WHEN m.sender_id = :user_id2 THEN 0
                        WHEN cp.last_read_at IS NULL OR cp.last_read_at < m.created_at THEN 1
                        ELSE 0
                    END AS is_unread
             FROM messages m
             INNER JOIN conversation_participants cp
                    ON cp.conversation_id = m.conversation_id AND cp.user_id = :user_id
             LEFT JOIN users su ON su.id = m.sender_id
             LEFT JOIN employees se ON se.user_id = su.id AND se.deleted_at IS NULL
             LEFT JOIN patients sp ON sp.user_id = su.id AND sp.deleted_at IS NULL
             LEFT JOIN message_types mt ON mt.id = m.type_id
             LEFT JOIN message_statuses ms ON ms.id = m.status_id
             LEFT JOIN patients pt ON pt.id = m.patient_id
             WHERE {$scopeSql}
             ORDER BY m.created_at DESC, m.id DESC"
        );

        $stmt->execute(['user_id' => $userId, 'user_id2' => $userId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * All (non-deleted) messages recorded about a specific patient,
     * regardless of who sent them or which conversation they're in.
     * Backs the patient dashboard's Messages widget.
     */
    public function listPatientMessages(int $patientId): array
    {
        $senderName = self::SENDER_NAME_SQL;

        $stmt = Database::connection()->prepare(
            "SELECT m.id, m.sender_id,
                    {$senderName} AS sender_name,
                    m.type_id, mt.name AS type_name,
                    m.status_id, ms.name AS status_name,
                    m.body, m.created_at
             FROM messages m
             LEFT JOIN users su ON su.id = m.sender_id
             LEFT JOIN employees se ON se.user_id = su.id AND se.deleted_at IS NULL
             LEFT JOIN patients sp ON sp.user_id = su.id AND sp.deleted_at IS NULL
             LEFT JOIN message_types mt ON mt.id = m.type_id
             LEFT JOIN message_statuses ms ON ms.id = m.status_id
             WHERE m.patient_id = :patient_id AND m.deleted_at IS NULL
             ORDER BY m.created_at DESC, m.id DESC"
        );

        $stmt->execute(['patient_id' => $patientId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Users available to start a new conversation with (everyone but
     * the current user).
     */
    public function listRecipients(int $userId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT u.id,
                    COALESCE(r.name, 'patient') AS role,
                    COALESCE(
                        NULLIF(TRIM(CONCAT(e.first_name, ' ', e.last_name)), ''),
                        NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''),
                        u.username
                    ) AS display_name
             FROM users u
             LEFT JOIN roles r ON r.id = u.role_id
             LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
             LEFT JOIN patients p ON p.user_id = u.id AND p.deleted_at IS NULL
             WHERE u.deleted_at IS NULL AND u.id != :user_id
             ORDER BY display_name"
        );

        $stmt->execute(['user_id' => $userId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * A single conversation plus its participants, if the given user
     * belongs to it.
     */
    public function showConversation(int $conversationId, int $userId): ?array
    {
        if (!$this->isParticipant($conversationId, $userId)) {
            return null;
        }

        $conversation = (new Conversation())->where('id', $conversationId)->first();

        if (!$conversation || $conversation['deleted_at'] !== null) {
            return null;
        }

        $stmt = Database::connection()->prepare(
            "SELECT u.id,
                    COALESCE(
                        NULLIF(TRIM(CONCAT(e.first_name, ' ', e.last_name)), ''),
                        NULLIF(TRIM(CONCAT(p.first_name, ' ', p.last_name)), ''),
                        u.username
                    ) AS display_name,
                    COALESCE(r.name, 'patient') AS role
             FROM conversation_participants cp
             INNER JOIN users u ON u.id = cp.user_id
             LEFT JOIN roles r ON r.id = u.role_id
             LEFT JOIN employees e ON e.user_id = u.id AND e.deleted_at IS NULL
             LEFT JOIN patients p ON p.user_id = u.id AND p.deleted_at IS NULL
             WHERE cp.conversation_id = :conversation_id"
        );

        $stmt->execute(['conversation_id' => $conversationId]);
        $conversation['participants'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return $conversation;
    }

    /**
     * Messages inside a single conversation, oldest first, for a
     * thread view.
     */
    public function listConversationMessages(int $conversationId, int $userId, int $limit = 50, int $offset = 0): ?array
    {
        if (!$this->isParticipant($conversationId, $userId)) {
            return null;
        }

        $senderName = self::SENDER_NAME_SQL;
        $limit = max(1, min($limit, 200));
        $offset = max(0, $offset);

        $stmt = Database::connection()->prepare(
            "SELECT m.id, m.sender_id,
                    {$senderName} AS sender_name,
                    m.type_id, mt.name AS type_name,
                    m.status_id, ms.name AS status_name,
                    m.patient_id, m.body, m.created_at
             FROM messages m
             LEFT JOIN users su ON su.id = m.sender_id
             LEFT JOIN employees se ON se.user_id = su.id AND se.deleted_at IS NULL
             LEFT JOIN patients sp ON sp.user_id = su.id AND sp.deleted_at IS NULL
             LEFT JOIN message_types mt ON mt.id = m.type_id
             LEFT JOIN message_statuses ms ON ms.id = m.status_id
             WHERE m.conversation_id = :conversation_id AND m.deleted_at IS NULL
             ORDER BY m.created_at ASC, m.id ASC
             LIMIT {$limit} OFFSET {$offset}"
        );

        $stmt->execute(['conversation_id' => $conversationId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Post a message into an existing conversation.
     */
    public function sendMessage(int $conversationId, int $userId, string $body, array $extra = []): array
    {
        if (!$this->isParticipant($conversationId, $userId)) {
            return [
                'success' => false,
                'message' => 'Conversation not found.'
            ];
        }

        $body = trim($body);

        if ($body === '') {
            return [
                'success' => false,
                'message' => 'Message body is required.'
            ];
        }

        $messageId = (new Message())->create([
            'conversation_id' => $conversationId,
            'sender_id' => $userId,
            'type_id' => $extra['type_id'] ?: null,
            'status_id' => $extra['status_id'] ?: null,
            'patient_id' => $extra['patient_id'] ?: null,
            'body' => $body,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        if (!$messageId) {
            return [
                'success' => false,
                'message' => 'Failed to send message.'
            ];
        }

        (new Conversation())->update([
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $conversationId);

        (new ConversationParticipant())
            ->where('conversation_id', $conversationId)
            ->where('user_id', $userId)
            ->update(['last_read_at' => date('Y-m-d H:i:s')]);

        return [
            'success' => true,
            'message' => 'Message sent successfully.',
            'data' => ['id' => $messageId]
        ];
    }

    /**
     * Soft-delete a single message. Only the sender (or an admin) may
     * remove it.
     */
    public function destroyMessage(int $messageId, int $userId, string $role): array
    {
        $message = (new Message())->where('id', $messageId)->first();

        if (!$message || $message['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Message not found.'
            ];
        }

        if ((int) $message['sender_id'] !== $userId && $role !== 'admin') {
            return [
                'success' => false,
                'message' => 'Message not found.'
            ];
        }

        (new Message())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $messageId);

        return [
            'success' => true,
            'message' => 'Message deleted successfully.'
        ];
    }

    /**
     * Mark every message in a conversation as read by the given user.
     */
    public function markRead(int $conversationId, int $userId): array
    {
        if (!$this->isParticipant($conversationId, $userId)) {
            return [
                'success' => false,
                'message' => 'Conversation not found.'
            ];
        }

        (new ConversationParticipant())
            ->where('conversation_id', $conversationId)
            ->where('user_id', $userId)
            ->update(['last_read_at' => date('Y-m-d H:i:s')]);

        return [
            'success' => true,
            'message' => 'Conversation marked as read.'
        ];
    }

    private function isParticipant(int $conversationId, int $userId): bool
    {
        $participant = (new ConversationParticipant())
            ->where('conversation_id', $conversationId)
            ->where('user_id', $userId)
            ->first();

        return $participant !== null;
    }
}
