<?php

namespace App\Modules\Insurances\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Insurances\Services\InsuranceService;

class InsuranceController extends Controller
{
    private InsuranceService $insuranceService;

    private const FIELDS = [
        'insurance_id', 'name', 'attention',
        'address_line1', 'address_line2', 'city', 'state', 'zip', 'country',
        'phone', 'payer_id', 'payer_type_id', 'x12_partner_id', 'cqm_source_of_payment_id'
    ];

    public function __construct()
    {
        $this->insuranceService = new InsuranceService();
    }

    /**
     * List insurances.
     */
    public function index(): void
    {
        $insurances = $this->insuranceService->list();

        $this->success($insurances, 'Insurances retrieved successfully.');
    }

    /**
     * Register a new insurance (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(self::FIELDS);

        $result = $this->insuranceService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing insurance (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(self::FIELDS);

        $result = $this->insuranceService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Insurance not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete an insurance (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->insuranceService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
