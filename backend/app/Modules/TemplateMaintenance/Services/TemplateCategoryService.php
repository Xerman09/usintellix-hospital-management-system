<?php

namespace App\Modules\TemplateMaintenance\Services;

use App\Core\Database;
use App\Modules\TemplateMaintenance\Models\TemplateCategory;
use PDO;

class TemplateCategoryService
{
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM template_categories
             WHERE deleted_at IS NULL
             ORDER BY name"
        );
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function create(array $data, int $userId): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $id = (new TemplateCategory())->create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to create category.'];
        }

        return ['success' => true, 'message' => 'Category created.', 'data' => ['id' => $id]];
    }

    public function update(int $id, array $data, int $userId): array
    {
        $errors = $this->validate($data, $id);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        (new TemplateCategory())->update([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Category updated.'];
    }

    public function remove(int $id, int $userId): array
    {
        (new TemplateCategory())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Category deleted.'];
    }

    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new TemplateCategory())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A category with this name already exists.';
        }

        return $errors;
    }
}
