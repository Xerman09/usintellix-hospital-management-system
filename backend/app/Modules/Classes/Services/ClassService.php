<?php

namespace App\Modules\Classes\Services;

use App\Core\Database;
use App\Modules\Classes\Models\ClassModel;
use PDO;
use PDOException;
use Throwable;

class ClassService
{
    /**
     * List all active (non-deleted) classes.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM classes
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new class (admin-only).
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
            $classId = (new ClassModel())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$classId) {
                throw new \RuntimeException('Failed to create class record.');
            }

            return [
                'success' => true,
                'message' => 'Class created successfully.',
                'data' => [
                    'class_id' => $classId
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A class with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create class.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create class.'
            ];
        }
    }

    /**
     * Update an existing class (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $class = (new ClassModel())->where('id', $id)->first();

        if (!$class || $class['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Class not found.'
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
            $updated = (new ClassModel())->update([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update class.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Class updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A class with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update class.'
            ];
        }
    }

    /**
     * Soft-delete a class (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $class = (new ClassModel())->where('id', $id)->first();

        if (!$class || $class['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Class not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE classes
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
            'message' => 'Class deleted successfully.'
        ];
    }

    /**
     * Validate class input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new ClassModel())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A class with this name already exists.';
        }

        return $errors;
    }
}
