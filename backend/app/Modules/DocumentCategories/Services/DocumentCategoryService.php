<?php

namespace App\Modules\DocumentCategories\Services;

use App\Core\Database;
use App\Modules\DocumentCategories\Models\DocumentCategory;
use PDO;
use Throwable;

class DocumentCategoryService
{
    /**
     * Every active category, flat -- the frontend assembles the tree
     * from parent_id, same as the Procedure Order Configs picker.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, parent_id, name, value, access_control, codes, sequence
             FROM document_categories
             WHERE deleted_at IS NULL
             ORDER BY parent_id IS NULL DESC, sequence, name"
        );
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function register(array $data, int $createdBy): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        try {
            $id = (new DocumentCategory())->create([
                'parent_id'      => !empty($data['parent_id']) ? (int) $data['parent_id'] : null,
                'name'           => $data['name'],
                'value'          => $data['value'] ?? null,
                'access_control' => $data['access_control'] ?? null,
                'codes'          => $data['codes'] ?? null,
                'sequence'       => (int) ($data['sequence'] ?? 0),
                'created_at'     => date('Y-m-d H:i:s'),
                'created_by'     => $createdBy
            ]);

            if (!$id) {
                throw new \RuntimeException('Failed to create category.');
            }

            return ['success' => true, 'message' => 'Category added successfully.', 'data' => ['document_category_id' => $id]];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to add category.'];
        }
    }

    public function update(int $id, array $data, int $updatedBy): array
    {
        $category = (new DocumentCategory())->where('id', $id)->first();

        if (!$category || $category['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Category not found.'];
        }

        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        (new DocumentCategory())->update([
            'name'           => $data['name'],
            'value'          => $data['value'] ?? null,
            'access_control' => $data['access_control'] ?? null,
            'codes'          => $data['codes'] ?? null,
            'sequence'       => (int) ($data['sequence'] ?? $category['sequence']),
            'updated_at'     => date('Y-m-d H:i:s'),
            'updated_by'     => $updatedBy
        ], $id);

        return ['success' => true, 'message' => 'Category updated successfully.'];
    }

    /**
     * Soft-deletes this category and every descendant beneath it, same
     * cascade approach used for the Procedure Order Configs tree.
     */
    public function remove(int $id, int $deletedBy): array
    {
        $category = (new DocumentCategory())->where('id', $id)->first();

        if (!$category || $category['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Category not found.'];
        }

        $idsToDelete = $this->collectSubtreeIds($id);
        $placeholders = implode(',', array_fill(0, count($idsToDelete), '?'));

        $stmt = Database::connection()->prepare(
            "UPDATE document_categories SET deleted_at = ?, deleted_by = ? WHERE id IN ({$placeholders})"
        );
        $stmt->execute(array_merge([date('Y-m-d H:i:s'), $deletedBy], $idsToDelete));

        return ['success' => true, 'message' => 'Category deleted successfully.'];
    }

    private function validate(array $data): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Category name is required.';
        }

        return $errors;
    }

    private function collectSubtreeIds(int $id): array
    {
        $ids = [$id];
        $frontier = [$id];

        $stmt = Database::connection()->prepare(
            "SELECT id FROM document_categories WHERE parent_id = ? AND deleted_at IS NULL"
        );

        while (!empty($frontier)) {
            $parentId = array_shift($frontier);

            $stmt->execute([$parentId]);
            $children = $stmt->fetchAll(PDO::FETCH_COLUMN);

            foreach ($children as $childId) {
                $childId = (int) $childId;
                $ids[] = $childId;
                $frontier[] = $childId;
            }
        }

        return $ids;
    }
}
