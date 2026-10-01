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
            'show_inactive' => $request->input('show_inactive'),
            'days' => $request->input('days')
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
            'drugs' => [],
            'dosage_forms' => [],
            'routes' => [],
            'units' => [],
            'categories' => [],
            'product_types' => DrugInventoryService::PRODUCT_TYPES,
            'controlled_classes' => DrugInventoryService::CONTROLLED_CLASSES,
            'storage_conditions' => DrugInventoryService::STORAGE_CONDITIONS,
            'intervals' => DrugInventoryService::INTERVALS,
            'destruction_methods' => DrugInventoryService::DESTRUCTION_METHODS
        ];

        $lookups = [
            'dosage_forms' => 'dosage_forms',
            'routes' => 'administration_routes',
            'units' => 'amount_units',
            'categories' => 'drug_categories'
        ];

        foreach ($lookups as $key => $table) {
            try {
                $result[$key] = $this->service->listLookup($table);
            } catch (\Throwable $e) {
                error_log("drug-inventory options: {$key} failed: " . $e->getMessage());
            }
        }

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

        try {
            $result['drugs'] = $this->service->listDrugs();
        } catch (\Throwable $e) {
            error_log('drug-inventory options: drugs failed: ' . $e->getMessage());
        }

        $this->success($result, 'Options retrieved successfully.');
    }

    /**
     * Drug Catalog list. Query: show_inactive? (optional).
     */
    public function catalog(): void
    {
        $request = new Request();

        $rows = $this->service->listCatalog([
            'show_inactive' => $request->input('show_inactive')
        ]);

        $this->success($rows, 'Drug catalog retrieved successfully.');
    }

    /**
     * One drug with its prescription templates, for the edit form.
     */
    public function show(): void
    {
        $request = new Request();

        $drug = $this->service->getDrug((int) $request->input('id'));

        if (!$drug) {
            $this->error('Drug not found.', 404);
            return;
        }

        $this->success($drug, 'Drug retrieved successfully.');
    }

    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $result = $this->service->createDrug(
            $request->only(DrugInventoryService::DRUG_INPUT_FIELDS),
            (int) $user['id']
        );

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

        $result = $this->service->updateDrug(
            (int) $request->input('id'),
            $request->only(DrugInventoryService::DRUG_INPUT_FIELDS),
            (int) $user['id']
        );

        if (!$result['success']) {
            $status = $result['message'] === 'Drug not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function destroyDrug(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $result = $this->service->deleteDrug((int) $request->input('id'), (int) $user['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Drug not found.' ? 404 : 422;
            $this->error($result['message'], $status);
            return;
        }

        $this->success(null, $result['message']);
    }

    public function receive(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $result = $this->service->receiveStock(
            $request->only(DrugInventoryService::RECEIVE_INPUT_FIELDS),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Bulk registration. Body: { rows: [ {generic_name, strength,
     * dosage_form, ...}, ... ] } -- lookups given by name.
     */
    public function import(): void
    {
        $request = new Request();
        $user = Session::get('user');

        $rows = $request->input('rows');

        if (!is_array($rows) || !$rows) {
            $this->error('No rows to import.', 422);
            return;
        }

        $result = $this->service->importDrugs($rows, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
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
