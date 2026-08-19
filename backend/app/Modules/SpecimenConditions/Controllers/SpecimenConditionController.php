<?php

namespace App\Modules\SpecimenConditions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\SpecimenConditions\Services\SpecimenConditionService;

class SpecimenConditionController extends Controller
{
    private SpecimenConditionService $specimenConditionService;

    public function __construct()
    {
        $this->specimenConditionService = new SpecimenConditionService();
    }

    /**
     * List specimen conditions.
     */
    public function index(): void
    {
        $conditions = $this->specimenConditionService->list();

        $this->success($conditions, 'Specimen conditions retrieved successfully.');
    }

    /**
     * Register a new specimen condition (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);

        $result = $this->specimenConditionService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing specimen condition (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description']);

        $result = $this->specimenConditionService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Specimen condition not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a specimen condition (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->specimenConditionService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
