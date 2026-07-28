<?php

namespace App\Modules\PrescriptionCategories\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PrescriptionCategories\Services\PrescriptionCategoryService;

class PrescriptionCategoryController extends Controller
{
    private PrescriptionCategoryService $prescriptionCategoryService;

    public function __construct()
    {
        $this->prescriptionCategoryService = new PrescriptionCategoryService();
    }

    /**
     * List prescription categories.
     */
    public function index(): void
    {
        $categories = $this->prescriptionCategoryService->list();

        $this->success($categories, 'Prescription categories retrieved successfully.');
    }

    /**
     * Register a new prescription category (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);

        $result = $this->prescriptionCategoryService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing prescription category (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description']);

        $result = $this->prescriptionCategoryService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Prescription category not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a prescription category (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->prescriptionCategoryService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
