<?php

namespace App\Modules\CqmSourceOfPayments\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\CqmSourceOfPayments\Services\CqmSourceOfPaymentService;

class CqmSourceOfPaymentController extends Controller
{
    private CqmSourceOfPaymentService $cqmSourceOfPaymentService;

    public function __construct()
    {
        $this->cqmSourceOfPaymentService = new CqmSourceOfPaymentService();
    }

    /**
     * List CQM source of payment records.
     */
    public function index(): void
    {
        $records = $this->cqmSourceOfPaymentService->list();

        $this->success($records, 'CQM source of payment records retrieved successfully.');
    }

    /**
     * Register a new CQM source of payment (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);

        $result = $this->cqmSourceOfPaymentService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing CQM source of payment (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description']);

        $result = $this->cqmSourceOfPaymentService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'CQM source of payment not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a CQM source of payment (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->cqmSourceOfPaymentService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
