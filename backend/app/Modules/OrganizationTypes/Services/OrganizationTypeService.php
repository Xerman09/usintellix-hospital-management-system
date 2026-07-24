<?php

namespace App\Modules\OrganizationTypes\Services;

use App\Core\Database;
use App\Modules\OrganizationTypes\Models\OrganizationType;
use PDO;
use PDOException;
use Throwable;

class OrganizationTypeService
{
    /**
     * List all active (non-deleted) organization types.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM organization_types
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new organization type (admin-only).
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
            $orgTypeId = (new OrganizationType())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$orgTypeId) {
                throw new \RuntimeException('Failed to create organization type record.');
            }

            return [
                'success' => true,
                'message' => 'Organization type created successfully.',
                'data' => [
                    'organization_type_id' => $orgTypeId
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'An organization type with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create organization type.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create organization type.'
            ];
        }
    }

    /**
     * Update an existing organization type (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $orgType = (new OrganizationType())->where('id', $id)->first();

        if (!$orgType || $orgType['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Organization type not found.'
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
            $updated = (new OrganizationType())->update([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update organization type.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Organization type updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'An organization type with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update organization type.'
            ];
        }
    }

    /**
     * Soft-delete an organization type (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $orgType = (new OrganizationType())->where('id', $id)->first();

        if (!$orgType || $orgType['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Organization type not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE organization_types
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
            'message' => 'Organization type deleted successfully.'
        ];
    }

    /**
     * Validate organization type input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new OrganizationType())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'An organization type with this name already exists.';
        }

        return $errors;
    }
}
