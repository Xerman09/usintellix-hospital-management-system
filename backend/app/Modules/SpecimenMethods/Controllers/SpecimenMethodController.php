<?php

namespace App\Modules\SpecimenMethods\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\SpecimenMethods\Services\SpecimenMethodService;

class SpecimenMethodController extends Controller
{
    private SpecimenMethodService $specimenMethodService;

    public function __construct()
    {
        $this->specimenMethodService = new SpecimenMethodService();
    }

    /**
     * List specimen methods.
     */
    public function index(): void
    {
        $methods = $this->specimenMethodService->list();

        $this->success($methods, 'Specimen methods retrieved successfully.');
    }

    /**
     * Register a new specimen method (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);

        $result = $this->specimenMethodService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing specimen method (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description']);

        $result = $this->specimenMethodService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Specimen method not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a specimen method (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->specimenMethodService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
