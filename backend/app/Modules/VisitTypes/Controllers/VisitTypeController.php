<?php

namespace App\Modules\VisitTypes\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\VisitTypes\Services\VisitTypeService;

class VisitTypeController extends Controller
{
    private VisitTypeService $visitTypeService;

    public function __construct()
    {
        $this->visitTypeService = new VisitTypeService();
    }

    /**
     * List visit types.
     */
    public function index(): void
    {
        $visitTypes = $this->visitTypeService->list();

        $this->success($visitTypes, 'Visit types retrieved successfully.');
    }

    /**
     * Register a new visit type (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['type', 'description']);

        $result = $this->visitTypeService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing visit type (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['type', 'description']);

        $result = $this->visitTypeService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Visit type not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a visit type (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->visitTypeService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
