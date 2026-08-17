<?php

namespace App\Modules\SpecimenMethods\Services;

use App\Core\Database;
use App\Modules\SpecimenMethods\Models\SpecimenMethod;
use PDO;
use Throwable;

class SpecimenMethodService
{
    /**
     * List all active (non-deleted) specimen methods.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM specimen_methods
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new specimen method (admin-only).
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
            $methodId = (new SpecimenMethod())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$methodId) {
                throw new \RuntimeException('Failed to create specimen method record.');
            }

            return [
                'success' => true,
                'message' => 'Specimen method created successfully.',
                'data' => [
                    'specimen_method_id' => $methodId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create specimen method.'
            ];
        }
    }

    /**
     * Update an existing specimen method (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $method = (new SpecimenMethod())->where('id', $id)->first();

        if (!$method || $method['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Specimen method not found.'
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

        $updated = (new SpecimenMethod())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update specimen method.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Specimen method updated successfully.'
        ];
    }

    /**
     * Soft-delete a specimen method (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $method = (new SpecimenMethod())->where('id', $id)->first();

        if (!$method || $method['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Specimen method not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE specimen_methods
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
            'message' => 'Specimen method deleted successfully.'
        ];
    }

    /**
     * Validate specimen method input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new SpecimenMethod())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A specimen method with this name already exists.';
        }

        return $errors;
    }
}
