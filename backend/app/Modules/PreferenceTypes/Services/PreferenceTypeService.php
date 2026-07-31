<?php

namespace App\Modules\PreferenceTypes\Services;

use App\Core\Database;
use App\Modules\PreferenceTypes\Models\PreferenceType;
use PDO;
use Throwable;

class PreferenceTypeService
{
    /**
     * List all active (non-deleted) preference types.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, loinc_code, description, created_at, updated_at
             FROM preference_types
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new preference type (admin-only).
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
            $preferenceTypeId = (new PreferenceType())->create([
                'name'        => $data['name'],
                'loinc_code'  => $data['loinc_code'] ?? null,
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$preferenceTypeId) {
                throw new \RuntimeException('Failed to create preference type record.');
            }

            return [
                'success' => true,
                'message' => 'Preference type created successfully.',
                'data' => [
                    'preference_type_id' => $preferenceTypeId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create preference type.'
            ];
        }
    }

    /**
     * Update an existing preference type (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $preferenceType = (new PreferenceType())->where('id', $id)->first();

        if (!$preferenceType || $preferenceType['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Preference type not found.'
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

        $updated = (new PreferenceType())->update([
            'name'        => $data['name'],
            'loinc_code'  => $data['loinc_code'] ?? null,
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update preference type.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Preference type updated successfully.'
        ];
    }

    /**
     * Soft-delete a preference type (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $preferenceType = (new PreferenceType())->where('id', $id)->first();

        if (!$preferenceType || $preferenceType['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Preference type not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE preference_types
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
            'message' => 'Preference type deleted successfully.'
        ];
    }

    /**
     * Validate preference type input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new PreferenceType())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A preference type with this name already exists.';
        }

        return $errors;
    }
}
