<?php

namespace App\Modules\VoidReasons\Services;

use App\Core\Database;
use App\Modules\VoidReasons\Models\VoidReason;
use PDO;
use Throwable;

class VoidReasonService
{
    /**
     * List all active (non-deleted) void reasons.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM void_reasons
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new void reason (admin-only).
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
            $reasonId = (new VoidReason())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$reasonId) {
                throw new \RuntimeException('Failed to create void reason record.');
            }

            return [
                'success' => true,
                'message' => 'Void reason created successfully.',
                'data' => [
                    'void_reason_id' => $reasonId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create void reason.'
            ];
        }
    }

    /**
     * Update an existing void reason (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $reason = (new VoidReason())->where('id', $id)->first();

        if (!$reason || $reason['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Void reason not found.'
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

        $updated = (new VoidReason())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update void reason.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Void reason updated successfully.'
        ];
    }

    /**
     * Soft-delete a void reason (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $reason = (new VoidReason())->where('id', $id)->first();

        if (!$reason || $reason['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Void reason not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE void_reasons
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
            'message' => 'Void reason deleted successfully.'
        ];
    }

    /**
     * Validate void reason input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new VoidReason())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A void reason with this name already exists.';
        }

        return $errors;
    }
}
