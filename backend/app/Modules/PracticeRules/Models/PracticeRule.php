<?php

namespace App\Modules\PracticeRules\Models;

use App\Core\QueryBuilder;
use PDO;

class PracticeRule extends QueryBuilder
{
    protected string $table = 'practice_rules';
    protected string $primaryKey = 'id';

    /**
     * Fetch all non-deleted rules for a given tenant.
     */
    public function getRulesByTenant(int $tenantId): array
    {
        $sql = "SELECT r.*, 
                       COALESCE(u.username, 'System') AS created_by_name 
                FROM {$this->table} r
                LEFT JOIN users u ON r.created_by = u.id
                WHERE r.tenant_id = :tenant_id 
                  AND r.deleted_at IS NULL
                ORDER BY r.id DESC";

        $stmt = $this->db()->prepare($sql);
        $stmt->bindValue(':tenant_id', $tenantId, PDO::PARAM_INT);
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Find a active rule by ID and Tenant ID.
     */
    public function findRuleById(int $id, int $tenantId): ?array
    {
        $sql = "SELECT r.*, 
                       COALESCE(u.username, 'System') AS created_by_name,
                       COALESCE(u_upd.username, 'System') AS updated_by_name
                FROM {$this->table} r
                LEFT JOIN users u ON r.created_by = u.id
                LEFT JOIN users u_upd ON r.updated_by = u_upd.id
                WHERE r.id = :id 
                  AND r.tenant_id = :tenant_id 
                  AND r.deleted_at IS NULL
                LIMIT 1";

        $stmt = $this->db()->prepare($sql);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':tenant_id', $tenantId, PDO::PARAM_INT);
        $stmt->execute();

        $result = $stmt->fetch(PDO::FETCH_ASSOC);

        return $result ?: null;
    }

    /**
     * Perform soft delete on a rule.
     */
    public function softDeleteRule(int $id, int $tenantId, int $deletedByUserId): bool
    {
        $sql = "UPDATE {$this->table} 
                SET deleted_at = NOW(), 
                    deleted_by = :deleted_by 
                WHERE id = :id 
                  AND tenant_id = :tenant_id 
                  AND deleted_at IS NULL";

        $stmt = $this->db()->prepare($sql);
        $stmt->bindValue(':deleted_by', $deletedByUserId, PDO::PARAM_INT);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->bindValue(':tenant_id', $tenantId, PDO::PARAM_INT);

        return $stmt->execute();
    }
}
