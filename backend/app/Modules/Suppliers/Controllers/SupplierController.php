<?php

namespace App\Modules\Suppliers\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\DrugInventory\Services\DrugInventoryService;
use App\Modules\Suppliers\Services\SupplierService;

class SupplierController extends Controller
{
    private SupplierService $service;

    public function __construct()
    {
        $this->service = new SupplierService();
    }

    /**
     * Supplier list. Query: show_inactive? (optional).
     */
    public function index(): void
    {
        $request = new Request();

        $this->success(
            $this->service->list(['show_inactive' => $request->input('show_inactive')]),
            'Suppliers retrieved successfully.'
        );
    }

    public function show(): void
    {
        $request = new Request();

        $supplier = $this->service->get((int) $request->input('id'));

        if (!$supplier) {
            $this->error('Supplier not found.', 404);
            return;
        }

        $this->success($supplier, 'Supplier retrieved successfully.');
    }

    /**
     * Fixed choice lists for the supplier form.
     */
    public function options(): void
    {
        $this->success([
            'supplier_types' => SupplierService::SUPPLIER_TYPES,
            'payment_terms' => SupplierService::PAYMENT_TERMS,
            'product_types' => DrugInventoryService::PRODUCT_TYPES,
            'license_warning_days' => SupplierService::LICENSE_WARNING_DAYS
        ], 'Options retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $result = $this->service->create($request->only(SupplierService::INPUT_FIELDS), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $result = $this->service->update(
            (int) $request->input('id'),
            $request->only(SupplierService::INPUT_FIELDS),
            (int) $user['id']
        );

        if (!$result['success']) {
            $status = $result['message'] === 'Supplier not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $result = $this->service->remove((int) $request->input('id'), (int) $user['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Supplier not found.' ? 404 : 422;
            $this->error($result['message'], $status);
            return;
        }

        $this->success(null, $result['message']);
    }
}
