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

    /**
     * Get the master capabilities catalog for all 10 subsystems.
     */
    public function getCapabilitiesCatalog(): array
    {
        $path = dirname(__DIR__, 4) . '/config/capabilities.php';
        if (file_exists($path)) {
            return require $path;
        }
        return [];
    }

    /**
     * Get the full permissions matrix across all roles and subsystem capabilities.
     */
    public function getPermissionsMatrix(): array
    {
        $catalog = $this->getCapabilitiesCatalog();
        $roles = $this->list();

        $stmt = Database::connection()->query(
            "SELECT role_id, capability 
             FROM role_permissions 
             WHERE is_granted = 1"
        );
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $matrix = [];
        foreach ($roles as $r) {
            $matrix[$r['id']] = [];
        }

        foreach ($rows as $row) {
            $rId = (int) $row['role_id'];
            if (!isset($matrix[$rId])) {
                $matrix[$rId] = [];
            }
            $matrix[$rId][] = $row['capability'];
        }

        return [
            'modules' => $catalog,
            'roles' => $roles,
            'matrix' => $matrix,
        ];
    }

    /**
     * Get granted capabilities for a single role.
     */
    public function getRolePermissions(int $roleId): array
    {
        $role = (new Role())->where('id', $roleId)->first();
        if (!$role || $role['deleted_at'] !== null) {
            return [];
        }

        $stmt = Database::connection()->prepare(
            "SELECT capability FROM role_permissions WHERE role_id = :role_id AND is_granted = 1"
        );
        $stmt->execute(['role_id' => $roleId]);

        return $stmt->fetchAll(PDO::FETCH_COLUMN) ?: [];
    }

    /**
     * Update granted capabilities for a role.
     */
    public function updateRolePermissions(int $roleId, array $capabilities, int $updatedBy): array
    {
        $role = (new Role())->where('id', $roleId)->first();
        if (!$role || $role['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Role not found.',
            ];
        }

        $catalog = $this->getCapabilitiesCatalog();
        $capToModule = [];
        foreach ($catalog as $moduleKey => $moduleData) {
            foreach ($moduleData['capabilities'] as $capKey => $capData) {
                $capToModule[$capKey] = $moduleKey;
            }
        }

        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            // Delete existing granted capabilities for this role
            $delStmt = $pdo->prepare("DELETE FROM role_permissions WHERE role_id = :role_id");
            $delStmt->execute(['role_id' => $roleId]);

            // Insert new capabilities
            if (!empty($capabilities)) {
                $insertStmt = $pdo->prepare(
                    "INSERT INTO role_permissions (role_id, module, capability, is_granted, created_by, updated_by, created_at, updated_at)
                     VALUES (:role_id, :module, :capability, 1, :created_by, :updated_by, NOW(), NOW())"
                );

                $now = date('Y-m-d H:i:s');
                foreach ($capabilities as $cap) {
                    $cap = trim((string) $cap);
                    if ($cap === '') {
                        continue;
                    }
                    $module = $capToModule[$cap] ?? 'general';
                    $insertStmt->execute([
                        'role_id' => $roleId,
                        'module' => $module,
                        'capability' => $cap,
                        'created_by' => $updatedBy,
                        'updated_by' => $updatedBy,
                    ]);
                }
            }

            $pdo->commit();
            \App\Core\RoleAccess::clearPermissionsCache();

            return [
                'success' => true,
                'message' => 'Role permissions updated successfully.',
                'data' => [
                    'role_id' => $roleId,
                    'capabilities' => $capabilities,
                ],
            ];
        } catch (Throwable $e) {
            $pdo->rollBack();
            return [
                'success' => false,
                'message' => 'Failed to update role permissions: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get user permissions by user role.
     */
    public function getUserPermissions(string $roleName): array
    {
        if (strtolower($roleName) === 'admin') {
            // Admin has every capability in the catalog
            $catalog = $this->getCapabilitiesCatalog();
            $allCaps = [];
            foreach ($catalog as $module) {
                foreach (array_keys($module['capabilities']) as $capKey) {
                    $allCaps[] = $capKey;
                }
            }
            return array_values(array_unique($allCaps));
        }

        return \App\Core\RoleAccess::getPermissionsForRole($roleName);
    }
}
