<?php

namespace App\Modules\Facilities\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Facilities\Services\FacilityService;

class FacilityController extends Controller
{
    private FacilityService $facilityService;

    private const FIELDS = [
        'name',
        'physical_address_line1', 'physical_city', 'physical_state', 'physical_zip', 'physical_country',
        'mailing_address_line1', 'mailing_city', 'mailing_state', 'mailing_zip', 'mailing_country',
        'phone', 'fax', 'website', 'email',
        'organization_type_id', 'iban', 'color', 'facility_taxonomy',
        'pos_code_id', 'billing_attn', 'clia_number', 'facility_lab_code',
        'tax_id_type', 'tax_id', 'oid', 'facility_npi',
        'is_billing_location', 'accepts_assignment', 'is_service_location',
        'is_primary_business_entity', 'is_inactive', 'info'
    ];

    public function __construct()
    {
        $this->facilityService = new FacilityService();
    }

    /**
     * List facilities.
     */
    public function index(): void
    {
        $facilities = $this->facilityService->list();

        $this->success($facilities, 'Facilities retrieved successfully.');
    }

    /**
     * Register a new facility (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(self::FIELDS);

        $result = $this->facilityService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing facility (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(self::FIELDS);

        $result = $this->facilityService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Facility not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a facility (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->facilityService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
