<?php

namespace App\Modules\VisitCategories\Services;

use App\Core\Database;
use App\Modules\VisitCategories\Models\VisitCategory;
use PDO;
use Throwable;

class VisitCategoryService
{
    /**
     * List all active (non-deleted) visit categories.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM visit_categories
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new visit category (admin-only).
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
            $categoryId = (new VisitCategory())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$categoryId) {
                throw new \RuntimeException('Failed to create visit category record.');
            }

            return [
                'success' => true,
                'message' => 'Visit category created successfully.',
                'data' => [
                    'visit_category_id' => $categoryId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create visit category.'
            ];
        }
    }

    /**
     * Update an existing visit category (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $category = (new VisitCategory())->where('id', $id)->first();

        if (!$category || $category['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Visit category not found.'
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

        $updated = (new VisitCategory())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update visit category.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Visit category updated successfully.'
        ];
    }

    /**
     * Soft-delete a visit category (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $category = (new VisitCategory())->where('id', $id)->first();

        if (!$category || $category['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Visit category not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE visit_categories
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
            'message' => 'Visit category deleted successfully.'
        ];
    }

    /**
     * Validate visit category input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new VisitCategory())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A visit category with this name already exists.';
        }

        return $errors;
    }
}
