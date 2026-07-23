<?php

namespace App\Modules\VisitCategories\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\VisitCategories\Services\VisitCategoryService;

class VisitCategoryController extends Controller
{
    private VisitCategoryService $visitCategoryService;

    public function __construct()
    {
        $this->visitCategoryService = new VisitCategoryService();
    }

    /**
     * List visit categories.
     */
    public function index(): void
    {
        $categories = $this->visitCategoryService->list();

        $this->success($categories, 'Visit categories retrieved successfully.');
    }

    /**
     * Register a new visit category (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);

        $result = $this->visitCategoryService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing visit category (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description']);

        $result = $this->visitCategoryService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Visit category not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a visit category (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->visitCategoryService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
