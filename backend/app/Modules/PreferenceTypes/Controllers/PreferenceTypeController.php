<?php

namespace App\Modules\PreferenceTypes\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PreferenceTypes\Services\PreferenceTypeService;

class PreferenceTypeController extends Controller
{
    private PreferenceTypeService $preferenceTypeService;

    public function __construct()
    {
        $this->preferenceTypeService = new PreferenceTypeService();
    }

    /**
     * List preference types.
     */
    public function index(): void
    {
        $preferenceTypes = $this->preferenceTypeService->list();

        $this->success($preferenceTypes, 'Preference types retrieved successfully.');
    }

    /**
     * Register a new preference type (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'loinc_code', 'description']);

        $result = $this->preferenceTypeService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing preference type (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'loinc_code', 'description']);

        $result = $this->preferenceTypeService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Preference type not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a preference type (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->preferenceTypeService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
