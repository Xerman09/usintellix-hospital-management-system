<?php

namespace App\Modules\Roles\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Roles\Services\RoleService;

class RoleController extends Controller
{
    private RoleService $roleService;

    public function __construct()
    {
        $this->roleService = new RoleService();
    }

    /**
     * List all roles.
     */
    public function index(): void
    {
        $roles = $this->roleService->list();

        $this->success($roles, 'Roles retrieved successfully.');
    }

    /**
     * Register a new role (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);

        $result = $this->roleService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing role (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description']);

        $result = $this->roleService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Role not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a role (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->roleService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Get the full capability catalog, all roles, and permissions matrix.
     */
    public function permissionsMatrix(): void
    {
        $matrix = $this->roleService->getPermissionsMatrix();

        $this->success($matrix, 'Permissions matrix retrieved successfully.');
    }

    /**
     * Get granted capabilities for a specific role.
     */
    public function getRolePermissions(): void
    {
        $request = new Request();
        $roleId = (int) $request->input('role_id', $request->query('role_id'));

        if ($roleId <= 0) {
            $this->error('Role ID is required.', 422);
            return;
        }

        $capabilities = $this->roleService->getRolePermissions($roleId);

        $this->success([
            'role_id' => $roleId,
            'capabilities' => $capabilities,
        ], 'Role permissions retrieved successfully.');
    }

    /**
     * Update permissions granted to a role.
     */
    public function updatePermissions(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $roleId = (int) $request->input('role_id');
        $capabilities = $request->input('capabilities', []);

        if ($roleId <= 0) {
            $this->error('Role ID is required.', 422);
            return;
        }

        if (!is_array($capabilities)) {
            $capabilities = [];
        }

        $result = $this->roleService->updateRolePermissions($roleId, $capabilities, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Get granted capabilities for the currently authenticated user.
     */
    public function userPermissions(): void
    {
        $user = Session::get('user');
        if (!$user) {
            $this->error('Unauthorized', 401);
            return;
        }

        $capabilities = $this->roleService->getUserPermissions((string) ($user['role'] ?? ''));

        $this->success([
            'role' => $user['role'] ?? '',
            'capabilities' => $capabilities,
        ], 'User permissions retrieved successfully.');
    }
}
