<?php

namespace App\Modules\BusinessAssociates\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\BusinessAssociates\Services\BusinessAssociateService;

class BusinessAssociateController extends Controller
{
    private BusinessAssociateService $service;

    public function __construct()
    {
        $this->service = new BusinessAssociateService();
    }

    /**
     * List all Business Associate vendors.
     */
    public function index(): void
    {
        $request = new Request();
        $filters = [
            'search'         => $request->input('search'),
            'category'       => $request->input('category'),
            'status'         => $request->input('status'),
            'has_signed_baa' => $request->input('has_signed_baa'),
            'subcontractor'  => $request->input('subcontractor')
        ];

        $vendors = $this->service->list($filters);

        $this->success($vendors, 'Business Associate inventory retrieved successfully.');
    }

    /**
     * Get aggregate statistics and critical audit alerts.
     */
    public function stats(): void
    {
        $stats = $this->service->stats();

        $this->success($stats, 'Business Associate statistics retrieved.');
    }

    /**
     * View single vendor details.
     */
    public function show(): void
    {
        $request = new Request();
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Vendor ID is required.', 422);
            return;
        }

        $vendor = $this->service->find($id);

        if (!$vendor) {
            $this->error('Vendor record not found.', 404);
            return;
        }

        $this->success($vendor, 'Vendor details retrieved.');
    }

    /**
     * Register a new Business Associate vendor.
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'email' => 'admin@uhms.org', 'role' => 'admin'];

        $result = $this->service->create($request->all(), $user);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing Business Associate vendor.
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'email' => 'admin@uhms.org', 'role' => 'admin'];
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Vendor ID is required.', 422);
            return;
        }

        $result = $this->service->update($id, $request->all(), $user);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Soft-delete a Business Associate vendor.
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'email' => 'admin@uhms.org', 'role' => 'admin'];
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Vendor ID is required.', 422);
            return;
        }

        $result = $this->service->delete($id, $user);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Export complete BAA registry to CSV for OCR compliance audits.
     */
    public function exportCsv(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'email' => 'admin@uhms.org', 'role' => 'admin'];
        $filters = [
            'search'         => $request->input('search'),
            'category'       => $request->input('category'),
            'status'         => $request->input('status'),
            'has_signed_baa' => $request->input('has_signed_baa'),
            'subcontractor'  => $request->input('subcontractor')
        ];

        $csv = $this->service->exportCsv($filters, $user);

        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="HIPAA_BAA_Vendor_Inventory_' . date('Ymd_His') . '.csv"');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');

        echo $csv;
        exit;
    }

    /**
     * Generate formal Vendor BAA Compliance Dossier.
     */
    public function dossier(): void
    {
        $request = new Request();
        $user = Session::get('user') ?? ['id' => 1, 'email' => 'admin@uhms.org', 'role' => 'admin'];
        $id = (int) $request->input('id');

        if (!$id) {
            $this->error('Vendor ID is required.', 422);
            return;
        }

        $result = $this->service->generateVendorInventoryReport($id, $user);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success($result['data'], 'Vendor BAA compliance dossier compiled successfully.');
    }
}
