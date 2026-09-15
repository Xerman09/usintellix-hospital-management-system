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

        $this->success($result, 'Warehouses retrieved successfully.');
    }

    public function store(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->service->register($request->only(['name', 'facility_id']), (int) $user['id']);

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

        $result = $this->service->update($id, $request->only(['name', 'facility_id', 'is_active']), (int) $user['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Warehouse not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
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
