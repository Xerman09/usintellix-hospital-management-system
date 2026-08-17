<?php

namespace App\Modules\SpecimenTypes\Services;

use App\Core\Database;
use App\Modules\SpecimenTypes\Models\SpecimenType;
use PDO;
use Throwable;

class SpecimenTypeService
{
    /**
     * List all active (non-deleted) specimen types.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM specimen_types
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new specimen type (admin-only).
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
            $typeId = (new SpecimenType())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$typeId) {
                throw new \RuntimeException('Failed to create specimen type record.');
            }

            return [
                'success' => true,
                'message' => 'Specimen type created successfully.',
                'data' => [
                    'specimen_type_id' => $typeId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create specimen type.'
            ];
        }
    }

    /**
     * Update an existing specimen type (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $type = (new SpecimenType())->where('id', $id)->first();

        if (!$type || $type['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Specimen type not found.'
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

        $updated = (new SpecimenType())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update specimen type.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Specimen type updated successfully.'
        ];
    }

    /**
     * Soft-delete a specimen type (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $type = (new SpecimenType())->where('id', $id)->first();

        if (!$type || $type['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Specimen type not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE specimen_types
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
            'message' => 'Specimen type deleted successfully.'
        ];
    }

    /**
     * Validate specimen type input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new SpecimenType())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A specimen type with this name already exists.';
        }

        return $errors;
    }
}
