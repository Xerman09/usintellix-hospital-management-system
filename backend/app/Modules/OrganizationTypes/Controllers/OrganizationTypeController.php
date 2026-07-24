<?php

namespace App\Modules\OrganizationTypes\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\OrganizationTypes\Services\OrganizationTypeService;

class OrganizationTypeController extends Controller
{
    private OrganizationTypeService $organizationTypeService;

    public function __construct()
    {
        $this->organizationTypeService = new OrganizationTypeService();
    }

    /**
     * List organization types.
     */
    public function index(): void
    {
        $orgTypes = $this->organizationTypeService->list();

        $this->success($orgTypes, 'Organization types retrieved successfully.');
    }

    /**
     * Register a new organization type (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);

        $result = $this->organizationTypeService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing organization type (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description']);

        $result = $this->organizationTypeService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Organization type not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete an organization type (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->organizationTypeService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
