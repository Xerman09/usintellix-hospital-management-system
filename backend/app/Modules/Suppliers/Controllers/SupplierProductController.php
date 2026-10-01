<?php

namespace App\Modules\Suppliers\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Suppliers\Services\SupplierProductService;

class SupplierProductController extends Controller
{
    private SupplierProductService $service;

    public function __construct()
    {
        $this->service = new SupplierProductService();
    }

    /**
     * Price list. Query: drug_id?, supplier_id?, show_inactive? (all optional).
     */
    public function index(): void
    {
        $request = new Request();

        $this->success($this->service->list([
            'drug_id' => $request->input('drug_id'),
            'supplier_id' => $request->input('supplier_id'),
            'show_inactive' => $request->input('show_inactive')
        ]), 'Supplier prices retrieved successfully.');
    }

    public function options(): void
    {
        $this->success($this->service->options(), 'Options retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $result = $this->service->create($request->only(SupplierProductService::INPUT_FIELDS), (int) $user['id']);

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
            $request->only(SupplierProductService::INPUT_FIELDS),
            (int) $user['id']
        );

        if (!$result['success']) {
            $status = $result['message'] === 'Price listing not found.' ? 404 : 422;
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
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
