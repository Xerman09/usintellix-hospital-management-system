<?php

namespace App\Modules\SpecimenSites\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\SpecimenSites\Services\SpecimenSiteService;

class SpecimenSiteController extends Controller
{
    private SpecimenSiteService $specimenSiteService;

    public function __construct()
    {
        $this->specimenSiteService = new SpecimenSiteService();
    }

    /**
     * List specimen sites.
     */
    public function index(): void
    {
        $sites = $this->specimenSiteService->list();

        $this->success($sites, 'Specimen sites retrieved successfully.');
    }

    /**
     * Register a new specimen site (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);

        $result = $this->specimenSiteService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing specimen site (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description']);

        $result = $this->specimenSiteService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Specimen site not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a specimen site (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->specimenSiteService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
