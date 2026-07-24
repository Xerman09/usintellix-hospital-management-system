<?php

namespace App\Modules\PayerTypes\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PayerTypes\Services\PayerTypeService;

class PayerTypeController extends Controller
{
    private PayerTypeService $payerTypeService;

    public function __construct()
    {
        $this->payerTypeService = new PayerTypeService();
    }

    /**
     * List payer types.
     */
    public function index(): void
    {
        $payerTypes = $this->payerTypeService->list();

        $this->success($payerTypes, 'Payer types retrieved successfully.');
    }

    /**
     * Register a new payer type (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);

        $result = $this->payerTypeService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing payer type (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description']);

        $result = $this->payerTypeService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Payer type not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a payer type (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->payerTypeService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
