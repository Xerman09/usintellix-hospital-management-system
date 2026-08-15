<?php

namespace App\Modules\CarePlanReasonCodes\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\CarePlanReasonCodes\Services\CarePlanReasonCodeService;

class CarePlanReasonCodeController extends Controller
{
    private CarePlanReasonCodeService $carePlanReasonCodeService;

    public function __construct()
    {
        $this->carePlanReasonCodeService = new CarePlanReasonCodeService();
    }

    /**
     * List care plan reason codes.
     */
    public function index(): void
    {
        $reasonCodes = $this->carePlanReasonCodeService->list();

        $this->success($reasonCodes, 'Care plan reason codes retrieved successfully.');
    }

    /**
     * Register a new care plan reason code (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['code', 'description']);

        $result = $this->carePlanReasonCodeService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing care plan reason code (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['code', 'description']);

        $result = $this->carePlanReasonCodeService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Care plan reason code not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a care plan reason code (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->carePlanReasonCodeService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
