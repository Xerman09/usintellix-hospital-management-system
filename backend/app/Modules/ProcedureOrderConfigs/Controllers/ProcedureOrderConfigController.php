<?php

namespace App\Modules\ProcedureOrderConfigs\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\ProcedureOrderConfigs\Services\ProcedureOrderConfigService;

class ProcedureOrderConfigController extends Controller
{
    private const FIELDS = [
        'parent_id', 'procedure_tier', 'name', 'description', 'sequence',
        'order_test_type', 'order_from', 'identifying_code', 'standard_code',
        'body_site', 'specimen_type', 'administer_via', 'laterality',
        'default_units', 'default_range'
    ];

    private ProcedureOrderConfigService $procedureOrderConfigService;

    public function __construct()
    {
        $this->procedureOrderConfigService = new ProcedureOrderConfigService();
    }

    /**
     * List order/result config rows (flat -- frontend builds the tree),
     * plus the static dropdown option lists the Add/Edit form needs.
     */
    public function index(): void
    {
        $configs = $this->procedureOrderConfigService->list();

        $this->success([
            'items' => $configs,
            'options' => [
                'order_test_type' => ProcedureOrderConfigService::ORDER_TEST_TYPES,
                'order_from'      => ProcedureOrderConfigService::ORDER_FROM_OPTIONS,
                'body_site'       => ProcedureOrderConfigService::BODY_SITE_OPTIONS,
                'specimen_type'   => ProcedureOrderConfigService::SPECIMEN_TYPE_OPTIONS,
                'administer_via'  => ProcedureOrderConfigService::ADMINISTER_VIA_OPTIONS,
                'laterality'      => ProcedureOrderConfigService::LATERALITY_OPTIONS,
                'default_units'   => ProcedureOrderConfigService::DEFAULT_UNITS_OPTIONS
            ]
        ], 'Order/result configuration retrieved successfully.');
    }

    /**
     * Create a new top-level or child order/result config row (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(self::FIELDS);

        $result = $this->procedureOrderConfigService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing order/result config row (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(self::FIELDS);

        $result = $this->procedureOrderConfigService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Order/result item not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete an order/result config row and its descendants (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->procedureOrderConfigService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * "Load Lab Compendium" > bulk-create Procedure Order rows from an
     * uploaded CSV file (admin-only). Only the "Load Order Definitions"
     * action is implemented -- the other two modes shown in the UI have
     * no backing feature yet.
     */
    public function loadCompendium(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $action = (string) $request->input('action', '');

        if ($action !== 'load_order_definitions') {
            $this->error('This action is not available yet.', 422);
            return;
        }

        $vendorFacilityId = (int) $request->input('vendor_id');
        $containerGroupId = (int) $request->input('container_group_id');

        if ($vendorFacilityId <= 0) {
            $this->error('Please select a vendor.', 422, ['vendor_id' => 'Vendor is required.']);
            return;
        }

        if ($containerGroupId <= 0) {
            $this->error('Please select a container group.', 422, ['container_group_id' => 'Container Group Name is required.']);
            return;
        }

        $files = $request->files();

        $result = $this->procedureOrderConfigService->loadCompendium(
            $files['file'] ?? [],
            $vendorFacilityId,
            $containerGroupId,
            (int) $admin['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message']);
    }
}
