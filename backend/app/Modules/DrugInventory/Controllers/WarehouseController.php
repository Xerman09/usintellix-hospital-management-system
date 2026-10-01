<?php

namespace App\Modules\DrugInventory\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\DrugInventory\Services\WarehouseService;
use App\Modules\Facilities\Services\FacilityService;

class WarehouseController extends Controller
{
    private WarehouseService $service;

    public function __construct()
    {
        $this->service = new WarehouseService();
    }

    /**
     * List every warehouse (active and inactive) for the management
     * screen, plus the facility catalog for the Add/Edit form's picker.
     */
    public function index(): void
    {
        $result = [
            'warehouses' => $this->service->list(),
            'facilities' => []
        ];

        try {
            $result['facilities'] = (new FacilityService())->list();
        } catch (\Throwable $e) {
            error_log('warehouses index: facilities failed: ' . $e->getMessage());
        }

        $this->success($result, 'Storage locations retrieved successfully.');
    }

    public function store(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->service->register($request->only(WarehouseService::INPUT_FIELDS), (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->service->update($id, $request->only(WarehouseService::INPUT_FIELDS), (int) $user['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Storage location not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /** Location types, departments and staff for the form. */
    public function options(): void
    {
        $this->success($this->service->options(), 'Options retrieved successfully.');
    }

    /** Stock Check for one location. Query: id */
    public function stock(): void
    {
        $request = new Request();

        $result = $this->service->stockCheck((int) $request->input('id'));

        if (!$result) {
            $this->error('Storage location not found.', 404);
            return;
        }

        $this->success($result, 'Stock check retrieved successfully.');
    }

    /** Body: warehouse_id, drug_id, min_level, max_level? */
    public function saveStockLevel(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->service->saveStockLevel(
            (int) $request->input('warehouse_id'),
            $request->only(['drug_id', 'min_level', 'max_level']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], !empty($result['not_found']) ? 404 : 422, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /** Body: warehouse_id, drug_id */
    public function removeStockLevel(): void
    {
        $request = new Request();

        $result = $this->service->removeStockLevel((int) $request->input('warehouse_id'), (int) $request->input('drug_id'));

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function destroy(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->service->remove($id, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
