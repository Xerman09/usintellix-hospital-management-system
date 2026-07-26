<?php

namespace App\Modules\CqmValuesets\Services;

use App\Core\Database;
use App\Modules\CqmValuesets\Models\CqmValueset;
use PDO;
use PDOException;
use Throwable;

class CqmValuesetService
{
    /**
     * List active (non-deleted) value sets, paginated and optionally
     * filtered by a search term against OID/name/code system.
     */
    public function list(int $page = 1, int $perPage = 50, string $search = ''): array
    {
        $page = max(1, $page);
        $perPage = max(1, min(200, $perPage));
        $offset = ($page - 1) * $perPage;

        $where = 'WHERE deleted_at IS NULL';
        $params = [];

        if ($search !== '') {
            $where .= ' AND (oid LIKE :search1 OR name LIKE :search2 OR code_system LIKE :search3)';
            $params['search1'] = '%' . $search . '%';
            $params['search2'] = '%' . $search . '%';
            $params['search3'] = '%' . $search . '%';
        }

        $countStmt = Database::connection()->prepare(
            "SELECT COUNT(*) AS total FROM cqm_valuesets {$where}"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        $stmt = Database::connection()->prepare(
            "SELECT v.id, v.oid, v.name, v.code_system, v.definition_version, v.created_at, v.updated_at,
                    (SELECT COUNT(*) FROM cqm_valueset_codes c WHERE c.valueset_id = v.id AND c.deleted_at IS NULL) AS code_count
             FROM cqm_valuesets v
             {$where}
             ORDER BY v.name
             LIMIT :limit OFFSET :offset"
        );

        foreach ($params as $key => $value) {
            $stmt->bindValue(":{$key}", $value);
        }

        $stmt->bindValue(':limit', $perPage, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();

        return [
            'items' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'total_pages' => $perPage > 0 ? (int) ceil($total / $perPage) : 0
        ];
    }

    /**
     * Register a new value set (admin-only).
     */
    public function register(array $data, int $createdBy): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        try {
            $id = (new CqmValueset())->create([
                'oid'                => $data['oid'],
                'name'               => $data['name'],
                'code_system'        => $data['code_system'],
                'definition_version' => $data['definition_version'] ?? null,
                'created_at'         => date('Y-m-d H:i:s'),
                'created_by'         => $createdBy
            ]);

            if (!$id) {
                throw new \RuntimeException('Failed to create value set record.');
            }

            return [
                'success' => true,
                'message' => 'Value set created successfully.',
                'data' => [
                    'valueset_id' => $id
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['oid' => 'A value set with this OID already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create value set.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create value set.'
            ];
        }
    }

    /**
     * Update an existing value set (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $record = (new CqmValueset())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Value set not found.'
            ];
        }

        $errors = $this->validate($data, $id);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        try {
            $updated = (new CqmValueset())->update([
                'oid'                => $data['oid'],
                'name'               => $data['name'],
                'code_system'        => $data['code_system'],
                'definition_version' => $data['definition_version'] ?? null,
                'updated_at'         => date('Y-m-d H:i:s'),
                'updated_by'         => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update value set.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Value set updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['oid' => 'A value set with this OID already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update value set.'
            ];
        }
    }

    /**
     * Soft-delete a value set (admin-only). Member codes cascade via FK.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = (new CqmValueset())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Value set not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE cqm_valuesets
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id'         => $id
        ]);

        $codesStmt = Database::connection()->prepare(
            "UPDATE cqm_valueset_codes
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE valueset_id = :valueset_id AND deleted_at IS NULL"
        );

        $codesStmt->execute([
            'deleted_at'  => date('Y-m-d H:i:s'),
            'deleted_by'  => $deletedBy,
            'valueset_id' => $id
        ]);

        return [
            'success' => true,
            'message' => 'Value set deleted successfully.'
        ];
    }

    /**
     * Validate value set input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['oid'])) {
            $errors['oid'] = 'OID is required.';
        }

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
        }

        if (empty($data['code_system'])) {
            $errors['code_system'] = 'Code system is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $existing = (new CqmValueset())->where('oid', $data['oid'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['oid'] = 'A value set with this OID already exists.';
        }

        return $errors;
    }
}
