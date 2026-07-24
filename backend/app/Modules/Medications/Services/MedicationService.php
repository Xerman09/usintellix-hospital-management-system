<?php

namespace App\Modules\Medications\Services;

use App\Core\Database;
use App\Modules\Medications\Models\Medication;
use PDO;
use PDOException;
use Throwable;

class MedicationService
{
    /**
     * List all active (non-deleted) medications.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM medications
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new medication (admin-only).
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
            $medicationId = (new Medication())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$medicationId) {
                throw new \RuntimeException('Failed to create medication record.');
            }

            return [
                'success' => true,
                'message' => 'Medication created successfully.',
                'data' => [
                    'medication_id' => $medicationId
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A medication with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create medication.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create medication.'
            ];
        }
    }

    /**
     * Update an existing medication (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $medication = (new Medication())->where('id', $id)->first();

        if (!$medication || $medication['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Medication not found.'
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
            $updated = (new Medication())->update([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update medication.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Medication updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A medication with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update medication.'
            ];
        }
    }

    /**
     * Soft-delete a medication (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $medication = (new Medication())->where('id', $id)->first();

        if (!$medication || $medication['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Medication not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE medications
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
            'message' => 'Medication deleted successfully.'
        ];
    }

    /**
     * Validate medication input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new Medication())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A medication with this name already exists.';
        }

        return $errors;
    }
}
