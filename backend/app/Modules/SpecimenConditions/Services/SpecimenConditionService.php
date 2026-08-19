<?php

namespace App\Modules\SpecimenConditions\Services;

use App\Core\Database;
use App\Modules\SpecimenConditions\Models\SpecimenCondition;
use PDO;
use Throwable;

class SpecimenConditionService
{
    /**
     * List all active (non-deleted) specimen conditions.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM specimen_conditions
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new specimen condition (admin-only).
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
            $conditionId = (new SpecimenCondition())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$conditionId) {
                throw new \RuntimeException('Failed to create specimen condition record.');
            }

            return [
                'success' => true,
                'message' => 'Specimen condition created successfully.',
                'data' => [
                    'specimen_condition_id' => $conditionId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create specimen condition.'
            ];
        }
    }

    /**
     * Update an existing specimen condition (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $condition = (new SpecimenCondition())->where('id', $id)->first();

        if (!$condition || $condition['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Specimen condition not found.'
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

        $updated = (new SpecimenCondition())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update specimen condition.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Specimen condition updated successfully.'
        ];
    }

    /**
     * Soft-delete a specimen condition (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $condition = (new SpecimenCondition())->where('id', $id)->first();

        if (!$condition || $condition['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Specimen condition not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE specimen_conditions
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
            'message' => 'Specimen condition deleted successfully.'
        ];
    }

    /**
     * Validate specimen condition input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new SpecimenCondition())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A specimen condition with this name already exists.';
        }

        return $errors;
    }
}
