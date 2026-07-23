<?php

namespace App\Modules\VisitTypes\Services;

use App\Core\Database;
use App\Modules\VisitTypes\Models\VisitType;
use PDO;
use PDOException;
use Throwable;

class VisitTypeService
{
    /**
     * List all active (non-deleted) visit types.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, type, description, created_at, updated_at
             FROM visit_types
             WHERE deleted_at IS NULL
             ORDER BY type"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new visit type (admin-only).
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
            $visitTypeId = (new VisitType())->create([
                'type'        => $data['type'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$visitTypeId) {
                throw new \RuntimeException('Failed to create visit type record.');
            }

            return [
                'success' => true,
                'message' => 'Visit type created successfully.',
                'data' => [
                    'visit_type_id' => $visitTypeId
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['type' => 'A visit type with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create visit type.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create visit type.'
            ];
        }
    }

    /**
     * Update an existing visit type (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $visitType = (new VisitType())->where('id', $id)->first();

        if (!$visitType || $visitType['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Visit type not found.'
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
            $updated = (new VisitType())->update([
                'type'        => $data['type'],
                'description' => $data['description'] ?? null,
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update visit type.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Visit type updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['type' => 'A visit type with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update visit type.'
            ];
        }
    }

    /**
     * Soft-delete a visit type (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $visitType = (new VisitType())->where('id', $id)->first();

        if (!$visitType || $visitType['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Visit type not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE visit_types
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
            'message' => 'Visit type deleted successfully.'
        ];
    }

    /**
     * Validate visit type input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['type'])) {
            $errors['type'] = 'Type is required.';
            return $errors;
        }

        $existing = (new VisitType())->where('type', $data['type'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['type'] = 'A visit type with this name already exists.';
        }

        return $errors;
    }
}
