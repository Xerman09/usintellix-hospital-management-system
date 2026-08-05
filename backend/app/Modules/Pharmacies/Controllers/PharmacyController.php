<?php

namespace App\Modules\Pharmacies\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Pharmacies\Services\PharmacyService;

class PharmacyController extends Controller
{
    private PharmacyService $pharmacyService;

    private const FIELDS = [
        'name', 'address', 'address2', 'city', 'state', 'zip',
        'email', 'phone', 'fax', 'npi', 'ncpdp', 'default_method'
    ];

    public function __construct()
    {
        $this->pharmacyService = new PharmacyService();
    }

    /**
     * List pharmacies.
     */
    public function index(): void
    {
        $pharmacies = $this->pharmacyService->list();

        $this->success($pharmacies, 'Pharmacies retrieved successfully.');
    }

    /**
     * Register a new pharmacy (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(self::FIELDS);

        $result = $this->pharmacyService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing pharmacy (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(self::FIELDS);

        $result = $this->pharmacyService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Pharmacy not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a pharmacy (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->pharmacyService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
