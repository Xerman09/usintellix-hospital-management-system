<?php

namespace App\Modules\CvxCodes\Services;

use App\Core\Database;
use App\Modules\CvxCodes\Models\CvxCode;
use PDO;
use PDOException;
use Throwable;

class CvxCodeService
{
    /**
     * List active (non-deleted) CVX codes, paginated and optionally
     * filtered by a search term against code/short_description.
     */
    public function list(int $page = 1, int $perPage = 50, string $search = ''): array
    {
        $page = max(1, $page);
        $perPage = max(1, min(200, $perPage));
        $offset = ($page - 1) * $perPage;

        $where = 'WHERE deleted_at IS NULL';
        $params = [];

        if ($search !== '') {
            $where .= ' AND (code LIKE :search1 OR short_description LIKE :search2)';
            $params['search1'] = '%' . $search . '%';
            $params['search2'] = '%' . $search . '%';
        }

        $countStmt = Database::connection()->prepare(
            "SELECT COUNT(*) AS total FROM cvx_codes {$where}"
        );
        $countStmt->execute($params);
        $total = (int) $countStmt->fetch(PDO::FETCH_ASSOC)['total'];

        $stmt = Database::connection()->prepare(
            "SELECT id, code, short_description, status, created_at, updated_at
             FROM cvx_codes
             {$where}
             ORDER BY code
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
     * Register a new CVX code (admin-only).
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
            $id = (new CvxCode())->create([
                'code'              => $data['code'],
                'short_description' => $data['short_description'],
                'status'            => $data['status'] ?? 'Active',
                'created_at'        => date('Y-m-d H:i:s'),
                'created_by'        => $createdBy
            ]);

            if (!$id) {
                throw new \RuntimeException('Failed to create CVX code record.');
            }

            return [
                'success' => true,
                'message' => 'CVX code created successfully.',
                'data' => [
                    'cvx_code_id' => $id
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['code' => 'A CVX code with this value already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create CVX code.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create CVX code.'
            ];
        }
    }

    /**
     * Update an existing CVX code (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $record = (new CvxCode())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'CVX code not found.'
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
            $updated = (new CvxCode())->update([
                'code'              => $data['code'],
                'short_description' => $data['short_description'],
                'status'            => $data['status'] ?? 'Active',
                'updated_at'        => date('Y-m-d H:i:s'),
                'updated_by'        => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update CVX code.'
                ];
            }

            return [
                'success' => true,
                'message' => 'CVX code updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['code' => 'A CVX code with this value already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update CVX code.'
            ];
        }
    }

    /**
     * Soft-delete a CVX code (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $record = (new CvxCode())->where('id', $id)->first();

        if (!$record || $record['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'CVX code not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE cvx_codes
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
            'message' => 'CVX code deleted successfully.'
        ];
    }

    /**
     * Validate CVX code input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['code'])) {
            $errors['code'] = 'Code is required.';
        }

        if (empty($data['short_description'])) {
            $errors['short_description'] = 'Description is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $existing = (new CvxCode())->where('code', $data['code'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['code'] = 'A CVX code with this value already exists.';
        }

        return $errors;
    }
}
