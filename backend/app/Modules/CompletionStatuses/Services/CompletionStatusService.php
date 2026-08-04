<?php

namespace App\Modules\CompletionStatuses\Services;

use App\Core\Database;
use App\Modules\CompletionStatuses\Models\CompletionStatus;
use PDO;
use Throwable;

class CompletionStatusService
{
    /**
     * List all active (non-deleted) completion statuses.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM completion_statuses
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new completion status (admin-only).
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
            $statusId = (new CompletionStatus())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$statusId) {
                throw new \RuntimeException('Failed to create completion status record.');
            }

            return [
                'success' => true,
                'message' => 'Completion status created successfully.',
                'data' => [
                    'completion_status_id' => $statusId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create completion status.'
            ];
        }
    }

    /**
     * Update an existing completion status (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $status = (new CompletionStatus())->where('id', $id)->first();

        if (!$status || $status['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Completion status not found.'
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

        $updated = (new CompletionStatus())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update completion status.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Completion status updated successfully.'
        ];
    }

    /**
     * Soft-delete a completion status (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $status = (new CompletionStatus())->where('id', $id)->first();

        if (!$status || $status['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Completion status not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE completion_statuses
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
            'message' => 'Completion status deleted successfully.'
        ];
    }

    /**
     * Validate completion status input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new CompletionStatus())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A completion status with this name already exists.';
        }

        return $errors;
    }
}
