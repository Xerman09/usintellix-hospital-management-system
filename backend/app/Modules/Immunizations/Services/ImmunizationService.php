<?php

namespace App\Modules\Immunizations\Services;

use App\Core\Database;
use App\Modules\Immunizations\Models\Immunization;
use PDO;
use Throwable;

class ImmunizationService
{
    /**
     * List all active (non-deleted) immunizations.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM immunizations
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new immunization (admin-only).
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
            $immunizationId = (new Immunization())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$immunizationId) {
                throw new \RuntimeException('Failed to create immunization record.');
            }

            return [
                'success' => true,
                'message' => 'Immunization created successfully.',
                'data' => [
                    'immunization_id' => $immunizationId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create immunization.'
            ];
        }
    }

    /**
     * Update an existing immunization (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $immunization = (new Immunization())->where('id', $id)->first();

        if (!$immunization || $immunization['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Immunization not found.'
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

        $updated = (new Immunization())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update immunization.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Immunization updated successfully.'
        ];
    }

    /**
     * Soft-delete an immunization (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $immunization = (new Immunization())->where('id', $id)->first();

        if (!$immunization || $immunization['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Immunization not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE immunizations
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
            'message' => 'Immunization deleted successfully.'
        ];
    }

    /**
     * Validate immunization input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new Immunization())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'An immunization with this name already exists.';
        }

        return $errors;
    }
}
