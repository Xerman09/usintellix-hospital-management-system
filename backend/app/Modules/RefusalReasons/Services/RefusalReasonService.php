<?php

namespace App\Modules\RefusalReasons\Services;

use App\Core\Database;
use App\Modules\RefusalReasons\Models\RefusalReason;
use PDO;
use Throwable;

class RefusalReasonService
{
    /**
     * List all active (non-deleted) refusal reasons.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM refusal_reasons
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new refusal reason (admin-only).
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
            $reasonId = (new RefusalReason())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$reasonId) {
                throw new \RuntimeException('Failed to create refusal reason record.');
            }

            return [
                'success' => true,
                'message' => 'Refusal reason created successfully.',
                'data' => [
                    'refusal_reason_id' => $reasonId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create refusal reason.'
            ];
        }
    }

    /**
     * Update an existing refusal reason (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $reason = (new RefusalReason())->where('id', $id)->first();

        if (!$reason || $reason['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Refusal reason not found.'
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

        $updated = (new RefusalReason())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update refusal reason.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Refusal reason updated successfully.'
        ];
    }

    /**
     * Soft-delete a refusal reason (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $reason = (new RefusalReason())->where('id', $id)->first();

        if (!$reason || $reason['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Refusal reason not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE refusal_reasons
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
            'message' => 'Refusal reason deleted successfully.'
        ];
    }

    /**
     * Validate refusal reason input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new RefusalReason())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A refusal reason with this name already exists.';
        }

        return $errors;
    }
}
