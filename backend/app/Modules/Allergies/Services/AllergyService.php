<?php

namespace App\Modules\Allergies\Services;

use App\Core\Database;
use App\Modules\Allergies\Models\Allergy;
use PDO;
use PDOException;
use Throwable;

class AllergyService
{
    /**
     * List all active (non-deleted) allergies.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM allergies
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new allergy (admin-only).
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
            $allergyId = (new Allergy())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$allergyId) {
                throw new \RuntimeException('Failed to create allergy record.');
            }

            return [
                'success' => true,
                'message' => 'Allergy created successfully.',
                'data' => [
                    'allergy_id' => $allergyId
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'An allergy with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create allergy.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create allergy.'
            ];
        }
    }

    /**
     * Update an existing allergy (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $allergy = (new Allergy())->where('id', $id)->first();

        if (!$allergy || $allergy['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Allergy not found.'
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
            $updated = (new Allergy())->update([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update allergy.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Allergy updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'An allergy with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update allergy.'
            ];
        }
    }

    /**
     * Soft-delete an allergy (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $allergy = (new Allergy())->where('id', $id)->first();

        if (!$allergy || $allergy['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Allergy not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE allergies
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
            'message' => 'Allergy deleted successfully.'
        ];
    }

    /**
     * Validate allergy input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new Allergy())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'An allergy with this name already exists.';
        }

        return $errors;
    }
}
