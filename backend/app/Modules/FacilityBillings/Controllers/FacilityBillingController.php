<?php

namespace App\Modules\FacilityBillings\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\FacilityBillings\Services\FacilityBillingService;

class FacilityBillingController extends Controller
{
    private FacilityBillingService $facilityBillingService;

    public function __construct()
    {
        $this->facilityBillingService = new FacilityBillingService();
    }

    /**
     * List facility billing records.
     */
    public function index(): void
    {
        $billings = $this->facilityBillingService->list();

        $this->success($billings, 'Facility billing records retrieved successfully.');
    }

    /**
     * Register a new facility billing record (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description', 'rate']);

        $result = $this->facilityBillingService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing facility billing record (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description', 'rate']);

        $result = $this->facilityBillingService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Facility billing record not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a facility billing record (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->facilityBillingService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
