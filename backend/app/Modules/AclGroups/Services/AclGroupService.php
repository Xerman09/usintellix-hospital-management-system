<?php

namespace App\Modules\AclGroups\Services;

use App\Core\Database;
use PDO;
use Throwable;

/**
 * "Access Control List Administration" -> User Memberships: which
 * ACL groups (Administrators, Clinicians, Front Office, ...) each
 * user belongs to. A separate, additional membership layer alongside
 * the existing single-role-per-user system.
 */
class AclGroupService
{
    /**
     * All active users (for the user picker list) + all ACL groups,
     * for the initial page load.
     */
    public function overview(): array
    {
        return [
            'users' => $this->listUsers(),
            'groups' => $this->listGroups()
        ];
    }

    /**
     * A user's group memberships split into active (is a member) and
     * inactive (is not a member) lists, matching the dual-listbox UI.
     */
    public function membershipsForUser(int $userId): array
    {
        $groups = $this->listGroups();

        $stmt = Database::connection()->prepare(
            'SELECT group_id FROM acl_group_members WHERE user_id = :user_id'
        );
        $stmt->execute(['user_id' => $userId]);
        $memberGroupIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

        $active = [];
        $inactive = [];

        foreach ($groups as $group) {
            if (in_array((int) $group['id'], $memberGroupIds, true)) {
                $active[] = $group;
            } else {
                $inactive[] = $group;
            }
        }

        return ['active' => $active, 'inactive' => $inactive];
    }

    /**
     * Add the user to one or more groups ("<<" -- move from Inactive
     * into Active).
     */
    public function addMembership(int $userId, array $groupIds, int $actingUserId): array
    {
        return $this->mutateMembership($userId, $groupIds, function (PDO $db, int $userId, int $groupId, int $actingUserId) {
            $stmt = $db->prepare(
                'INSERT IGNORE INTO acl_group_members (group_id, user_id, created_at, created_by)
                 VALUES (:group_id, :user_id, :created_at, :created_by)'
            );
            $stmt->execute([
                'group_id' => $groupId,
                'user_id' => $userId,
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $actingUserId
            ]);
        }, $actingUserId, 'added to');
    }

    /**
     * Remove the user from one or more groups (">>" -- move from
     * Active into Inactive).
     */
    public function removeMembership(int $userId, array $groupIds): array
    {
        return $this->mutateMembership($userId, $groupIds, function (PDO $db, int $userId, int $groupId) {
            $stmt = $db->prepare(
                'DELETE FROM acl_group_members WHERE user_id = :user_id AND group_id = :group_id'
            );
            $stmt->execute(['user_id' => $userId, 'group_id' => $groupId]);
        }, 0, 'removed from');
    }

    private function mutateMembership(int $userId, array $groupIds, callable $perGroup, int $actingUserId, string $verbPhrase): array
    {
        $groupIds = array_values(array_unique(array_map('intval', $groupIds)));

        if ($userId <= 0 || empty($groupIds)) {
            return ['success' => false, 'message' => 'Select a user and at least one group.'];
        }

        $user = $this->findUser($userId);

        if (!$user) {
            return ['success' => false, 'message' => 'User not found.'];
        }

        $db = Database::connection();

        try {
            $db->beginTransaction();

            foreach ($groupIds as $groupId) {
                if (!$this->groupExists($groupId)) {
                    continue;
                }

                $perGroup($db, $userId, $groupId, $actingUserId);
            }

            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();

            return ['success' => false, 'message' => 'Failed to update group memberships.'];
        }

        return [
            'success' => true,
            'message' => count($groupIds) . ' group(s) ' . $verbPhrase . ' ' . $user['username'] . '.'
        ];
    }

    private function listGroups(): array
    {
        $stmt = Database::connection()->query(
            'SELECT id, name FROM acl_groups WHERE deleted_at IS NULL ORDER BY name ASC'
        );

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    private function listUsers(): array
    {
        $stmt = Database::connection()->query(
            'SELECT id, username, deleted_at FROM users ORDER BY username ASC'
        );

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        return array_map(fn($row) => [
            'id' => (int) $row['id'],
            'username' => $row['username'],
            'is_inactive' => $row['deleted_at'] !== null
        ], $rows);
    }

    private function findUser(int $userId): ?array
    {
        $stmt = Database::connection()->prepare('SELECT id, username FROM users WHERE id = :id');
        $stmt->execute(['id' => $userId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        return $row ?: null;
    }

    private function groupExists(int $groupId): bool
    {
        $stmt = Database::connection()->prepare(
            'SELECT 1 FROM acl_groups WHERE id = :id AND deleted_at IS NULL'
        );
        $stmt->execute(['id' => $groupId]);

        return (bool) $stmt->fetchColumn();
    }
}
