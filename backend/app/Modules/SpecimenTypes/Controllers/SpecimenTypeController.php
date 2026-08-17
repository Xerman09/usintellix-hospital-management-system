<?php

namespace App\Modules\SpecimenTypes\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\SpecimenTypes\Services\SpecimenTypeService;

class SpecimenTypeController extends Controller
{
    private SpecimenTypeService $specimenTypeService;

    public function __construct()
    {
        $this->specimenTypeService = new SpecimenTypeService();
    }

    /**
     * List specimen types.
     */
    public function index(): void
    {
        $types = $this->specimenTypeService->list();

        $this->success($types, 'Specimen types retrieved successfully.');
    }

    /**
     * Register a new specimen type (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);

        $result = $this->specimenTypeService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing specimen type (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description']);

        $result = $this->specimenTypeService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Specimen type not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a specimen type (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->specimenTypeService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
