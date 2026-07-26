<?php

namespace App\Modules\CqmValuesets\Services;

use App\Core\Database;
use App\Modules\CqmValuesets\Models\CqmValueset;
use App\Modules\CqmValuesets\Models\CqmValuesetCode;
use PDO;
use PDOException;
use Throwable;

class CqmValuesetCodeService
{
    /**
     * Search member codes across all value sets, paginated. Used by the
     * generic "Select Codes" picker.
     *
     * - mode "name": matches against code, description, or the value set's name
     * - mode "oid":  matches against the value set's OID
     */
    public function searchAcrossValuesets(string $search, string $mode = 'name', int $page = 1, int $perPage = 50): array
    {
        $page = max(1, $page);
        $perPage = max(1, min(200, $perPage));
        $offset = ($page - 1) * $perPage;

        $where = 'WHERE c.deleted_at IS NULL AND v.deleted_at IS NULL';
        $params = [];

        if ($search !== '') {
            if ($mode === 'oid') {
                $where .= ' AND v.oid LIKE :search';
                $params['search'] = '%' . $search . '%';
            } else {
                $where .= ' AND (c.code LIKE :search1 OR c.description LIKE :search2 OR v.name LIKE :search3)';
                $params['search1'] = '%' . $search . '%';
                $params['search2'] = '%' . $search . '%';
                $params['search3'] = '%' . $search . '%';
            }
        }

        $countStmt = Database::connection()->prepare(
            "SELECT COUNT(*) AS total
             FROM cqm_valueset_codes c
             JOIN cqm_valuesets v ON v.id = c.valueset_id
             {$where}"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        $stmt = Database::connection()->prepare(
            "SELECT c.id, c.code, c.code_system, c.description, v.oid AS valueset_oid, v.name AS valueset_name
             FROM cqm_valueset_codes c
             JOIN cqm_valuesets v ON v.id = c.valueset_id
             {$where}
             ORDER BY c.code
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
     * List active (non-deleted) member codes for a value set.
     */
    public function list(int $valuesetId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, valueset_id, code, code_system, description, created_at, updated_at
             FROM cqm_valueset_codes
             WHERE valueset_id = :valueset_id AND deleted_at IS NULL
             ORDER BY code"
        );

        $stmt->execute(['valueset_id' => $valuesetId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Add a member code to a value set (admin-only).
     */
    public function register(int $valuesetId, array $data, int $createdBy): array
    {
        $valueset = (new CqmValueset())->where('id', $valuesetId)->first();

        if (!$valueset || $valueset['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Value set not found.'
            ];
        }

        $errors = $this->validate($valuesetId, $data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        try {
            $id = (new CqmValuesetCode())->create([
                'valueset_id' => $valuesetId,
                'code'        => $data['code'],
                'code_system' => $data['code_system'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$id) {
                throw new \RuntimeException('Failed to create value set code record.');
            }

            return [
                'success' => true,
                'message' => 'Code added successfully.',
                'data' => [
                    'valueset_code_id' => $id
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['code' => 'This code already exists in the value set.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to add code.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to add code.'
            ];
        }
    }

    /**
     * Update a member code (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $record = (new CqmValuesetCode())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Code not found.'
            ];
        }

        $errors = $this->validate((int) $record['valueset_id'], $data, $id);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        try {
            $updated = (new CqmValuesetCode())->update([
                'code'        => $data['code'],
                'code_system' => $data['code_system'],
                'description' => $data['description'] ?? null,
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update code.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Code updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['code' => 'This code already exists in the value set.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update code.'
            ];
        }
    }

    /**
     * Soft-delete a member code (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = (new CqmValuesetCode())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Code not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE cqm_valueset_codes
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id'         => $id
        ]);

        return [
            'success' => true,
            'message' => 'Code removed successfully.'
        ];
    }

    /**
     * Validate member code input.
     */
    private function validate(int $valuesetId, array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['code'])) {
            $errors['code'] = 'Code is required.';
        }

        if (empty($data['code_system'])) {
            $errors['code_system'] = 'Code system is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $existing = (new CqmValuesetCode())
            ->where('valueset_id', $valuesetId)
            ->where('code', $data['code'])
            ->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['code'] = 'This code already exists in the value set.';
        }

        return $errors;
    }
}
