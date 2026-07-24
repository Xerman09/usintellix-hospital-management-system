<?php

namespace App\Modules\PosCodes\Services;

use App\Core\Database;
use App\Modules\PosCodes\Models\PosCode;
use PDO;
use PDOException;
use Throwable;

class PosCodeService
{
    /**
     * List all active (non-deleted) POS codes.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, code, name, description, created_at, updated_at
             FROM pos_codes
             WHERE deleted_at IS NULL
             ORDER BY code"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new POS code (admin-only).
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
            $posCodeId = (new PosCode())->create([
                'code'        => $data['code'],
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$posCodeId) {
                throw new \RuntimeException('Failed to create POS code record.');
            }

            return [
                'success' => true,
                'message' => 'POS code created successfully.',
                'data' => [
                    'pos_code_id' => $posCodeId
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['code' => 'A POS code with this code already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create POS code.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create POS code.'
            ];
        }
    }

    /**
     * Update an existing POS code (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $posCode = (new PosCode())->where('id', $id)->first();

        if (!$posCode || $posCode['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'POS code not found.'
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
            $updated = (new PosCode())->update([
                'code'        => $data['code'],
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update POS code.'
                ];
            }

            return [
                'success' => true,
                'message' => 'POS code updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['code' => 'A POS code with this code already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update POS code.'
            ];
        }
    }

    /**
     * Soft-delete a POS code (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $posCode = (new PosCode())->where('id', $id)->first();

        if (!$posCode || $posCode['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'POS code not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE pos_codes
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
            'message' => 'POS code deleted successfully.'
        ];
    }

    /**
     * Validate POS code input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['code'])) {
            $errors['code'] = 'Code is required.';
        }

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $existing = (new PosCode())->where('code', $data['code'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['code'] = 'A POS code with this code already exists.';
        }

        return $errors;
    }
}
