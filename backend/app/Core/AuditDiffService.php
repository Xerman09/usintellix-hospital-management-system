<?php

declare(strict_types=1);

namespace App\Core;

use PDO;
use Throwable;

class AuditDiffService
{
    /**
     * Sensitive fields that should never be recorded in audit diff snapshots.
     */
    private const SENSITIVE_FIELDS = [
        'password',
        'password_hash',
        'remember_token',
        'otp_secret',
        'totp_secret',
        'token',
        'access_token',
        'refresh_token',
        'secret',
        'api_key',
        'npp_signature_data',
    ];

    /**
     * Ignored system tracking fields that should not trigger diffs on their own.
     */
    private const IGNORED_FIELDS = [
        'updated_at',
        'updated_by',
    ];

    /**
     * Calculate field differences between old and new snapshots.
     *
     * @param array|null $old
     * @param array|null $new
     * @return array{changed_fields: array, old_values: array|null, new_values: array|null}
     */
    public static function calculateDiff(?array $old, ?array $new): array
    {
        $filteredOld = self::sanitizeSnapshot($old);
        $filteredNew = self::sanitizeSnapshot($new);

        if ($old === null && $new !== null) {
            return [
                'changed_fields' => array_values(array_keys($filteredNew)),
                'old_values'     => null,
                'new_values'     => $filteredNew,
            ];
        }

        if ($old !== null && $new === null) {
            return [
                'changed_fields' => array_values(array_keys($filteredOld)),
                'old_values'     => $filteredOld,
                'new_values'     => null,
            ];
        }

        if ($filteredOld === null || $filteredNew === null) {
            return [
                'changed_fields' => [],
                'old_values'     => null,
                'new_values'     => null,
            ];
        }

        $allKeys = array_unique(array_merge(array_keys($filteredOld), array_keys($filteredNew)));
        $changedFields = [];
        $diffOld = [];
        $diffNew = [];

        foreach ($allKeys as $key) {
            if (in_array($key, self::IGNORED_FIELDS, true)) {
                continue;
            }

            $oldExists = array_key_exists($key, $filteredOld);
            $newExists = array_key_exists($key, $filteredNew);

            $oldVal = $oldExists ? $filteredOld[$key] : null;
            $newVal = $newExists ? $filteredNew[$key] : null;

            $isEqual = false;
            if ($oldVal === $newVal) {
                $isEqual = true;
            } elseif (is_numeric($oldVal) && is_numeric($newVal) && (string)$oldVal === (string)$newVal) {
                $isEqual = true;
            } elseif ((is_null($oldVal) && $newVal === '') || (is_null($newVal) && $oldVal === '')) {
                // Consider null and empty string equal for optional DB columns
                $isEqual = true;
            } elseif (is_array($oldVal) && is_array($newVal)) {
                $isEqual = (json_encode($oldVal) === json_encode($newVal));
            }

            if (!$isEqual) {
                $changedFields[] = $key;
                $diffOld[$key] = $oldVal;
                $diffNew[$key] = $newVal;
            }
        }

        return [
            'changed_fields' => $changedFields,
            'old_values'     => empty($changedFields) ? null : $diffOld,
            'new_values'     => empty($changedFields) ? null : $diffNew,
        ];
    }

    /**
     * Record an entity data change diff into audit_trail_diffs.
     *
     * @param string $table
     * @param int $recordId
     * @param string $action CREATE|UPDATE|DELETE
     * @param array|null $oldValues
     * @param array|null $newValues
     * @param int|null $userId
     * @param string|null $ipAddress
     * @param string|null $userAgent
     * @return int|null
     */
    public static function recordDiff(
        string $table,
        int $recordId,
        string $action,
        ?array $oldValues,
        ?array $newValues,
        ?int $userId = null,
        ?string $ipAddress = null,
        ?string $userAgent = null
    ): ?int {
        try {
            $action = strtoupper(trim($action));
            if (!in_array($action, ['CREATE', 'UPDATE', 'DELETE'], true)) {
                $action = 'UPDATE';
            }

            $diff = self::calculateDiff($oldValues, $newValues);

            // If an update was triggered but nothing actually changed, don't create a useless diff
            if ($action === 'UPDATE' && empty($diff['changed_fields'])) {
                return null;
            }

            $db = Database::connection();

            // Resolve user session if not passed
            if ($userId === null) {
                $sessionUser = Session::get('user');
                if (is_array($sessionUser) && isset($sessionUser['id'])) {
                    $userId = (int) $sessionUser['id'];
                }
            }

            $ip = $ipAddress ?: self::resolveClientIp();
            $agent = substr($userAgent ?: ($_SERVER['HTTP_USER_AGENT'] ?? 'CLI/Service'), 0, 255);

            $stmt = $db->prepare("
                INSERT INTO `audit_trail_diffs` (
                    `table_name`,
                    `record_id`,
                    `action`,
                    `changed_fields`,
                    `old_values`,
                    `new_values`,
                    `user_id`,
                    `ip_address`,
                    `user_agent`,
                    `created_at`
                ) VALUES (
                    :table_name,
                    :record_id,
                    :action,
                    :changed_fields,
                    :old_values,
                    :new_values,
                    :user_id,
                    :ip_address,
                    :user_agent,
                    NOW()
                )
            ");

            $stmt->execute([
                'table_name'     => $table,
                'record_id'      => $recordId,
                'action'         => $action,
                'changed_fields' => json_encode($diff['changed_fields'], JSON_UNESCAPED_UNICODE),
                'old_values'     => $diff['old_values'] !== null ? json_encode($diff['old_values'], JSON_UNESCAPED_UNICODE) : null,
                'new_values'     => $diff['new_values'] !== null ? json_encode($diff['new_values'], JSON_UNESCAPED_UNICODE) : null,
                'user_id'        => $userId,
                'ip_address'     => $ip,
                'user_agent'     => $agent,
            ]);

            return (int) $db->lastInsertId();
        } catch (Throwable $e) {
            error_log('[AuditDiffService::recordDiff Error] ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Fetch paginated list of diffs with search and filter parameters.
     *
     * @param array $filters
     * @param int $page
     * @param int $perPage
     * @return array{data: array, total: int, page: int, per_page: int, total_pages: int}
     */
    public static function getDiffs(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $db = Database::connection();
        $page = max(1, $page);
        $perPage = min(100, max(5, $perPage));
        $offset = ($page - 1) * $perPage;

        $conditions = [];
        $params = [];

        if (!empty($filters['table_name'])) {
            $conditions[] = "d.table_name = :table_name";
            $params['table_name'] = trim($filters['table_name']);
        }

        if (!empty($filters['record_id'])) {
            $conditions[] = "d.record_id = :record_id";
            $params['record_id'] = (int) $filters['record_id'];
        }

        if (!empty($filters['action'])) {
            $conditions[] = "d.action = :action";
            $params['action'] = strtoupper(trim($filters['action']));
        }

        if (!empty($filters['user_id'])) {
            $conditions[] = "d.user_id = :user_id";
            $params['user_id'] = (int) $filters['user_id'];
        }

        if (!empty($filters['date_from'])) {
            $conditions[] = "d.created_at >= :date_from";
            $params['date_from'] = trim($filters['date_from']) . ' 00:00:00';
        }

        if (!empty($filters['date_to'])) {
            $conditions[] = "d.created_at <= :date_to";
            $params['date_to'] = trim($filters['date_to']) . ' 23:59:59';
        }

        if (!empty($filters['search'])) {
            $conditions[] = "(
                d.table_name LIKE :search 
                OR d.action LIKE :search 
                OR d.changed_fields LIKE :search 
                OR d.old_values LIKE :search 
                OR d.new_values LIKE :search 
                OR u.username LIKE :search 
                OR e.first_name LIKE :search 
                OR e.last_name LIKE :search
            )";
            $params['search'] = '%' . trim($filters['search']) . '%';
        }

        $whereClause = !empty($conditions) ? 'WHERE ' . implode(' AND ', $conditions) : '';

        // Count total matching
        $countSql = "
            SELECT COUNT(*) 
            FROM `audit_trail_diffs` d
            LEFT JOIN `users` u ON u.id = d.user_id
            LEFT JOIN `employees` e ON e.user_id = u.id
            {$whereClause}
        ";
        $countStmt = $db->prepare($countSql);
        foreach ($params as $key => $val) {
            $countStmt->bindValue(':' . $key, $val);
        }
        $countStmt->execute();
        $total = (int) $countStmt->fetchColumn();

        // Query page
        $dataSql = "
            SELECT 
                d.id,
                d.table_name,
                d.record_id,
                d.action,
                d.changed_fields,
                d.old_values,
                d.new_values,
                d.user_id,
                d.ip_address,
                d.user_agent,
                d.created_at,
                u.username,
                r.name AS role_name,
                TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))) AS full_name,
                e.employee_no
            FROM `audit_trail_diffs` d
            LEFT JOIN `users` u ON u.id = d.user_id
            LEFT JOIN `roles` r ON r.id = u.role_id
            LEFT JOIN `employees` e ON e.user_id = u.id
            {$whereClause}
            ORDER BY d.id DESC
            LIMIT :limit OFFSET :offset
        ";

        $dataStmt = $db->prepare($dataSql);
        foreach ($params as $key => $val) {
            $dataStmt->bindValue(':' . $key, $val);
        }
        $dataStmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $dataStmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $dataStmt->execute();
        $rows = $dataStmt->fetchAll(PDO::FETCH_ASSOC);

        $formatted = array_map(function ($row) {
            $row['changed_fields'] = json_decode($row['changed_fields'] ?? '[]', true) ?: [];
            $row['old_values']     = $row['old_values'] !== null ? (json_decode($row['old_values'], true) ?: []) : null;
            $row['new_values']     = $row['new_values'] !== null ? (json_decode($row['new_values'], true) ?: []) : null;
            return $row;
        }, $rows);

        $totalPages = $total > 0 ? (int) ceil($total / $perPage) : 1;

        return [
            'data'        => $formatted,
            'total'       => $total,
            'page'        => $page,
            'per_page'    => $perPage,
            'total_pages' => $totalPages,
        ];
    }

    /**
     * Retrieve single diff record by ID.
     */
    public static function getDiffById(int $diffId): ?array
    {
        $db = Database::connection();
        $stmt = $db->prepare("
            SELECT 
                d.id,
                d.table_name,
                d.record_id,
                d.action,
                d.changed_fields,
                d.old_values,
                d.new_values,
                d.user_id,
                d.ip_address,
                d.user_agent,
                d.created_at,
                u.username,
                r.name AS role_name,
                TRIM(CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.last_name, ''))) AS full_name,
                e.employee_no
            FROM `audit_trail_diffs` d
            LEFT JOIN `users` u ON u.id = d.user_id
            LEFT JOIN `roles` r ON r.id = u.role_id
            LEFT JOIN `employees` e ON e.user_id = u.id
            WHERE d.id = :id
            LIMIT 1
        ");
        $stmt->execute(['id' => $diffId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return null;
        }

        $row['changed_fields'] = json_decode($row['changed_fields'] ?? '[]', true) ?: [];
        $row['old_values']     = $row['old_values'] !== null ? (json_decode($row['old_values'], true) ?: []) : null;
        $row['new_values']     = $row['new_values'] !== null ? (json_decode($row['new_values'], true) ?: []) : null;

        return $row;
    }

    /**
     * Get list of unique table names that have recorded diffs.
     *
     * @return array<string>
     */
    public static function getDistinctTables(): array
    {
        $db = Database::connection();
        $stmt = $db->query("SELECT DISTINCT table_name FROM `audit_trail_diffs` ORDER BY table_name ASC");
        return $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
    }

    /**
     * Get entity diff history for a specific table record.
     */
    public static function getEntityHistory(string $tableName, int $recordId): array
    {
        return self::getDiffs([
            'table_name' => $tableName,
            'record_id'  => $recordId,
        ], 1, 100)['data'];
    }

    /**
     * Sanitize an associative array snapshot by removing sensitive credential fields.
     */
    private static function sanitizeSnapshot(?array $data): ?array
    {
        if ($data === null) {
            return null;
        }

        $clean = [];
        foreach ($data as $key => $val) {
            if (in_array(strtolower($key), self::SENSITIVE_FIELDS, true)) {
                continue;
            }
            $clean[$key] = $val;
        }
        return $clean;
    }

    /**
     * Resolve remote IP address from headers or connection.
     */
    private static function resolveClientIp(): string
    {
        if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $parts = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
            return trim($parts[0]);
        }

        return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    }
}
