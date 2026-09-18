<?php

namespace App\Modules\TemplateMaintenance\Services;

use App\Core\Database;
use App\Modules\TemplateMaintenance\Models\TemplateProfile;
use PDO;

class TemplateProfileService
{
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT p.id, p.name, p.active, p.description, p.category_id, c.name AS category_name,
                    p.template_group_id, g.name AS group_name, p.created_at, p.updated_at
             FROM template_profiles p
             LEFT JOIN template_categories c ON c.id = p.category_id AND c.deleted_at IS NULL
             LEFT JOIN template_groups g ON g.id = p.template_group_id AND g.deleted_at IS NULL
             WHERE p.deleted_at IS NULL
             ORDER BY p.name"
        );
        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Just the "Profiles in Portal" table's Active checkbox -- doesn't
     * touch name/category/group, so it skips the full update() name
     * re-validation.
     */
    public function setActive(int $id, bool $active, int $userId): array
    {
        (new TemplateProfile())->update([
            'active' => $active ? 1 : 0,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Profile updated.'];
    }

    public function create(array $data, int $userId): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $id = (new TemplateProfile())->create([
            'name' => $data['name'],
            'category_id' => $data['category_id'] ?: null,
            'template_group_id' => $data['template_group_id'] ?: null,
            'description' => $data['description'] ?? null,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to create profile.'];
        }

        return ['success' => true, 'message' => 'Profile created.', 'data' => ['id' => $id]];
    }

    public function update(int $id, array $data, int $userId): array
    {
        $errors = $this->validate($data, $id);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        (new TemplateProfile())->update([
            'name' => $data['name'],
            'category_id' => $data['category_id'] ?: null,
            'template_group_id' => $data['template_group_id'] ?: null,
            'description' => $data['description'] ?? null,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Profile updated.'];
    }

    public function remove(int $id, int $userId): array
    {
        (new TemplateProfile())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Profile deleted.'];
    }

    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new TemplateProfile())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A profile with this name already exists.';
        }

        return $errors;
    }
}
