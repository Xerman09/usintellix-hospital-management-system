<?php

namespace App\Modules\TemplateMaintenance\Services;

use App\Core\Database;
use App\Modules\TemplateMaintenance\Models\TemplateGroup;
use App\Modules\TemplateMaintenance\Models\TemplateGroupTemplate;
use PDO;

class TemplateGroupService
{
    /**
     * Every group with its member template filenames attached, so the
     * Groups modal and the Assign picker can both render without an
     * extra round trip per group.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM template_groups
             WHERE deleted_at IS NULL
             ORDER BY name"
        );
        $stmt->execute();
        $groups = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (!$groups) {
            return [];
        }

        $itemsStmt = Database::connection()->prepare(
            "SELECT template_group_id, template_filename FROM template_group_templates
             WHERE template_group_id IN (" . implode(',', array_fill(0, count($groups), '?')) . ")"
        );
        $itemsStmt->execute(array_column($groups, 'id'));

        $itemsByGroup = [];
        foreach ($itemsStmt->fetchAll(PDO::FETCH_ASSOC) as $item) {
            $itemsByGroup[$item['template_group_id']][] = $item['template_filename'];
        }

        foreach ($groups as &$group) {
            $group['templates'] = $itemsByGroup[$group['id']] ?? [];
        }

        return $groups;
    }

    public function create(array $data, int $userId): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $id = (new TemplateGroup())->create([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        if (!$id) {
            return ['success' => false, 'message' => 'Failed to create group.'];
        }

        $this->syncTemplates((int) $id, $data['templates'] ?? [], $userId);

        return ['success' => true, 'message' => 'Group created.', 'data' => ['id' => $id]];
    }

    public function update(int $id, array $data, int $userId): array
    {
        $errors = $this->validate($data, $id);

        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        (new TemplateGroup())->update([
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $id);

        if (array_key_exists('templates', $data)) {
            $this->syncTemplates($id, $data['templates'], $userId);
        }

        return ['success' => true, 'message' => 'Group updated.'];
    }

    public function remove(int $id, int $userId): array
    {
        (new TemplateGroup())->update([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $userId
        ], $id);

        return ['success' => true, 'message' => 'Group deleted.'];
    }

    /**
     * Replaces a group's member list wholesale -- simplest correct
     * approach for a small checkbox-list membership editor (delete what's
     * no longer checked, insert what's newly checked).
     */
    private function syncTemplates(int $groupId, array $filenames, int $userId): void
    {
        Database::connection()->prepare(
            "DELETE FROM template_group_templates WHERE template_group_id = ?"
        )->execute([$groupId]);

        $filenames = array_values(array_unique(array_filter($filenames, fn ($f) => trim((string) $f) !== '')));

        if (!$filenames) {
            return;
        }

        $stmt = Database::connection()->prepare(
            "INSERT INTO template_group_templates (template_group_id, template_filename, created_at, created_by)
             VALUES (?, ?, ?, ?)"
        );

        foreach ($filenames as $filename) {
            $stmt->execute([$groupId, $filename, date('Y-m-d H:i:s'), $userId]);
        }
    }

    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new TemplateGroup())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A group with this name already exists.';
        }

        return $errors;
    }
}
