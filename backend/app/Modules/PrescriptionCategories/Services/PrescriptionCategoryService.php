<?php

namespace App\Modules\PrescriptionCategories\Services;

use App\Core\Database;
use App\Modules\PrescriptionCategories\Models\PrescriptionCategory;
use PDO;
use Throwable;

class PrescriptionCategoryService
{
    /**
     * List all active (non-deleted) prescription categories.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM prescription_categories
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new prescription category (admin-only).
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
            $categoryId = (new PrescriptionCategory())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$categoryId) {
                throw new \RuntimeException('Failed to create prescription category record.');
            }

            return [
                'success' => true,
                'message' => 'Prescription category created successfully.',
                'data' => [
                    'prescription_category_id' => $categoryId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create prescription category.'
            ];
        }
    }

    /**
     * Update an existing prescription category (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $category = (new PrescriptionCategory())->where('id', $id)->first();

        if (!$category || $category['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Prescription category not found.'
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

        $updated = (new PrescriptionCategory())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update prescription category.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Prescription category updated successfully.'
        ];
    }

    /**
     * Soft-delete a prescription category (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $category = (new PrescriptionCategory())->where('id', $id)->first();

        if (!$category || $category['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Prescription category not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE prescription_categories
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
            'message' => 'Prescription category deleted successfully.'
        ];
    }

    /**
     * Validate prescription category input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new PrescriptionCategory())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A prescription category with this name already exists.';
        }

        return $errors;
    }
}
