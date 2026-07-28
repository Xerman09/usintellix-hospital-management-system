<?php

namespace App\Modules\Roles\Services;

use App\Core\Database;
use App\Modules\Roles\Models\Role;
use PDO;
use Throwable;

class RoleService
{
    /**
     * List all active (non-deleted) roles.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM roles
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new role (admin-only).
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
            $roleId = (new Role())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$roleId) {
                throw new \RuntimeException('Failed to create role record.');
            }

            return [
                'success' => true,
                'message' => 'Role created successfully.',
                'data' => [
                    'role_id' => $roleId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create role.'
            ];
        }
    }

    /**
     * Update an existing role (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $role = (new Role())->where('id', $id)->first();

        if (!$role || $role['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Role not found.'
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

        $updated = (new Role())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update role.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Role updated successfully.'
        ];
    }

    /**
     * Soft-delete a role (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $role = (new Role())->where('id', $id)->first();

        if (!$role || $role['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Role not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE roles
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
            'message' => 'Role deleted successfully.'
        ];
    }

    /**
     * Validate role input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new Role())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A role with this name already exists.';
        }

        return $errors;
    }
}
