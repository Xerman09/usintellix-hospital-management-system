<?php

namespace App\Modules\RefusalReasons\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\RefusalReasons\Services\RefusalReasonService;

class RefusalReasonController extends Controller
{
    private RefusalReasonService $refusalReasonService;

    public function __construct()
    {
        $this->refusalReasonService = new RefusalReasonService();
    }

    /**
     * List refusal reasons.
     */
    public function index(): void
    {
        $reasons = $this->refusalReasonService->list();

        $this->success($reasons, 'Refusal reasons retrieved successfully.');
    }

    /**
     * Register a new refusal reason (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);

        $result = $this->refusalReasonService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing refusal reason (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description']);

        $result = $this->refusalReasonService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Refusal reason not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a refusal reason (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->refusalReasonService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
