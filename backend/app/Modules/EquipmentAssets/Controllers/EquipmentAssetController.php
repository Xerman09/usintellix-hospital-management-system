<?php

namespace App\Modules\EquipmentAssets\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\EquipmentAssets\Services\EquipmentAssetService;

class EquipmentAssetController extends Controller
{
    private EquipmentAssetService $service;

    public function __construct()
    {
        $this->service = new EquipmentAssetService();
    }

    /**
     * List all equipment machinery with optional filters.
     */
    public function index(): void
    {
        $request = new Request();
        $filters = [
            'search'             => $request->input('search'),
            'category'           => $request->input('category'),
            'status'             => $request->input('status'),
            'criticality_level'  => $request->input('criticality_level'),
            'department_id'      => $request->input('department_id'),
            'ward_id'            => $request->input('ward_id'),
            'calibration_filter' => $request->input('calibration_filter'),
        ];

        $assets = $this->service->list($filters);
        $this->success($assets, 'Equipment assets retrieved successfully.');
    }

    /**
     * Get real-time equipment KPI metrics.
     */
    public function metrics(): void
    {
        $metrics = $this->service->getMetrics();
        $this->success($metrics, 'Equipment asset metrics retrieved successfully.');
    }

    /**
     * Get location master data (facilities, departments, buildings, wards, rooms).
     */
    public function locations(): void
    {
        $locations = $this->service->getLocations();
        $this->success($locations, 'Equipment location reference data retrieved successfully.');
    }

    /**
     * View single equipment asset with maintenance history.
     */
    public function show(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Asset ID is required.', 422);
            return;
        }

        $asset = $this->service->get($id);
        if (!$asset) {
            $this->error('Equipment asset not found.', 404);
            return;
        }

        $this->success($asset, 'Equipment asset retrieved successfully.');
    }

    /**
     * Register a new hospital machinery asset.
     */
    public function store(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $data = $request->only([
            'asset_tag',
            'name',
            'category',
            'criticality_level',
            'serial_number',
            'model_number',
            'manufacturer',
            'facility_id',
            'department_id',
            'building_id',
            'ward_id',
            'room_id',
            'purchase_date',
            'purchase_cost',
            'warranty_expiration_date',
            'last_calibration_date',
            'next_calibration_due',
            'status',
            'status_reason',
            'notes'
        ]);

        $result = $this->service->create($data, (int) ($user['id'] ?? 1));

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'] ?? null, $result['message'], 201);
    }

    /**
     * Update an existing hospital machinery asset.
     */
    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Asset ID is required.', 422);
            return;
        }

        $data = $request->only([
            'asset_tag',
            'name',
            'category',
            'criticality_level',
            'serial_number',
            'model_number',
            'manufacturer',
            'facility_id',
            'department_id',
            'building_id',
            'ward_id',
            'room_id',
            'purchase_date',
            'purchase_cost',
            'warranty_expiration_date',
            'last_calibration_date',
            'next_calibration_due',
            'status',
            'status_reason',
            'notes'
        ]);

        $result = $this->service->update($id, $data, (int) ($user['id'] ?? 1));

        if (!$result['success']) {
            $status = $result['message'] === 'Equipment asset not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Fast status transition.
     */
    public function status(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $status = (string) $request->input('status');
        $reason = $request->input('reason');

        if (!$id || empty($status)) {
            $this->error('Asset ID and status are required.', 422);
            return;
        }

        $result = $this->service->updateStatus($id, $status, $reason ?: null, (int) ($user['id'] ?? 1));

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Record a calibration or maintenance check log.
     */
    public function recordLog(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $equipmentId = (int) $request->input('equipment_id');

        if (!$equipmentId) {
            $this->error('Equipment ID is required.', 422);
            return;
        }

        $data = $request->only([
            'log_type',
            'performed_by',
            'performed_date',
            'result_status',
            'next_due_date',
            'cost',
            'findings',
            'actions_taken'
        ]);

        $result = $this->service->recordLog($equipmentId, $data, (int) ($user['id'] ?? 1));

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'] ?? null, $result['message'], 201);
    }

    /**
     * Archive/soft-delete an equipment asset.
     */
    public function destroy(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Asset ID is required.', 422);
            return;
        }

        $result = $this->service->delete($id, (int) ($user['id'] ?? 1));

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
