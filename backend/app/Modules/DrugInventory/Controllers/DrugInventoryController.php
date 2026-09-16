<?php

namespace App\Modules\DrugInventory\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\DrugInventory\Services\DrugInventoryService;
use App\Modules\Facilities\Services\FacilityService;

class DrugInventoryController extends Controller
{
    private DrugInventoryService $service;

    public function __construct()
    {
        $this->service = new DrugInventoryService();
    }

    /**
     * Inventory > Management list. Query: facility_id?, warehouse_id?,
     * product_type?, show_empty_lots?, show_inactive? (all optional).
     */
    public function index(): void
    {
        $request = new Request();

        $rows = $this->service->listLots([
            'facility_id' => $request->input('facility_id'),
            'warehouse_id' => $request->input('warehouse_id'),
            'product_type' => $request->input('product_type'),
            'show_empty_lots' => $request->input('show_empty_lots'),
            'show_inactive' => $request->input('show_inactive')
        ]);

        $this->success($rows, 'Inventory retrieved successfully.');
    }

    /**
     * Bundled catalogs for the filter bar and "Add Drug"/"Tran" forms.
     */
    public function options(): void
    {
        $result = [
            'warehouses' => [],
            'facilities' => [],
            'product_types' => DrugInventoryService::PRODUCT_TYPES,
            'forms' => DrugInventoryService::FORMS,
            'routes' => DrugInventoryService::ROUTES,
            'units' => DrugInventoryService::UNITS,
            'intervals' => DrugInventoryService::INTERVALS,
            'destruction_methods' => DrugInventoryService::DESTRUCTION_METHODS
        ];

        try {
            $result['warehouses'] = $this->service->listWarehouses();
        } catch (\Throwable $e) {
            error_log('drug-inventory options: warehouses failed: ' . $e->getMessage());
        }

        try {
            $result['facilities'] = (new FacilityService())->list();
        } catch (\Throwable $e) {
            error_log('drug-inventory options: facilities failed: ' . $e->getMessage());
        }

        $this->success($result, 'Options retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $result = $this->service->createDrug(
            $request->only([
                'name', 'ndc', 'rxcui', 'form', 'size', 'unit', 'route', 'product_type',
                'is_active', 'is_consumable', 'allow_inventory', 'allow_multiple_lots', 'allow_combining_lots',
                'on_order', 'min_level_global', 'max_level_global', 'min_level_onsite', 'max_level_onsite',
                'lot_number', 'facility_id', 'warehouse_id', 'quantity_on_hand', 'expires_date', 'templates'
            ]),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    public function transfer(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $lotId = (int) $request->input('lot_id');

        if (!$lotId) {
            $this->error('Lot is required.', 422);
            return;
        }

        $result = $this->service->transfer(
            $lotId,
            $request->only(['warehouse_id', 'facility_id', 'lot_number', 'quantity', 'notes']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $lotId = (int) $request->input('lot_id');

        if (!$lotId) {
            $this->error('Lot is required.', 422);
            return;
        }

        $result = $this->service->destroyLot(
            $lotId,
            $request->only(['quantity', 'destroyed_date', 'method', 'witness', 'notes']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Inventory > Destroyed list. Query: from?, to? (date range, both optional).
     */
    public function destroyedList(): void
    {
        $request = new Request();

        $rows = $this->service->listDestructions([
            'from' => $request->input('from'),
            'to' => $request->input('to')
        ]);

        $this->success($rows, 'Destroyed drugs retrieved successfully.');
    }
}
