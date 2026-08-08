<?php

namespace App\Modules\Surgeries\Services;

use App\Core\Database;
use App\Modules\Surgeries\Models\Surgery;
use PDO;
use Throwable;

class SurgeryService
{
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM surgeries
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
            $surgeryId = (new Surgery())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$surgeryId) {
                throw new \RuntimeException('Failed to create surgery record.');
            }

            return ['success' => true, 'message' => 'Surgery created successfully.', 'data' => ['surgery_id' => $surgeryId]];
        } catch (Throwable $e) {
            return ['success' => false, 'message' => 'Failed to create surgery.'];
        }
    }

    public function update(int $id, array $data, int $updatedBy): array
    {
        $surgery = (new Surgery())->where('id', $id)->first();

        if (!$surgery || $surgery['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Surgery not found.'];
        }

        $errors = $this->validate($data, $id);
        if (!empty($errors)) {
            return ['success' => false, 'message' => 'Validation failed.', 'errors' => $errors];
        }

        $updated = (new Surgery())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return ['success' => false, 'message' => 'Failed to update surgery.'];
        }

        return ['success' => true, 'message' => 'Surgery updated successfully.'];
    }

    public function remove(int $id, int $deletedBy): array
    {
        $surgery = (new Surgery())->where('id', $id)->first();

        if (!$surgery || $surgery['deleted_at'] !== null) {
            return ['success' => false, 'message' => 'Surgery not found.'];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE surgeries
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id'         => $id
        ]);

        return ['success' => true, 'message' => 'Surgery deleted successfully.'];
    }

    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new Surgery())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A surgery with this name already exists.';
        }

        return $errors;
    }
}
