<?php

namespace App\Modules\ScreeningTools\Services;

use App\Core\Database;
use App\Modules\ScreeningTools\Models\ScreeningTool;
use PDO;
use Throwable;

class ScreeningToolService
{
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM screening_tools
             WHERE deleted_at IS NULL
             ORDER BY name"
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
            $toolId = (new ScreeningTool())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$toolId) {
                throw new \RuntimeException('Failed to create screening tool record.');
            }

            return ['success' => true, 'message' => 'Screening tool created successfully.', 'data' => ['screening_tool_id' => $toolId]];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to create screening tool.'];
        }
    }

    public function update(int $id, array $data, int $updatedBy): array
    {
        $tool = (new ScreeningTool())->where('id', $id)->first();

        if (!$tool || $tool['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Screening tool not found.'];
        }

        $errors = $this->validate($data, $id);
        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $updated = (new ScreeningTool())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return ['success' => false, 'message' => 'Failed to update screening tool.'];
        }

        return ['success' => true, 'message' => 'Screening tool updated successfully.'];
    }

    public function remove(int $id, int $deletedBy): array
    {
        $tool = (new ScreeningTool())->where('id', $id)->first();

        if (!$tool || $tool['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Screening tool not found.'];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE screening_tools
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id'         => $id
        ]);

        return ['success' => true, 'message' => 'Screening tool deleted successfully.'];
    }

    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new ScreeningTool())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A screening tool with this name already exists.';
        }

        return $errors;
    }
}
