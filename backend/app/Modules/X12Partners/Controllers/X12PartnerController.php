<?php

namespace App\Modules\X12Partners\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\X12Partners\Services\X12PartnerService;

class X12PartnerController extends Controller
{
    private X12PartnerService $x12PartnerService;

    public function __construct()
    {
        $this->x12PartnerService = new X12PartnerService();
    }

    /**
     * List X12 partners.
     */
    public function index(): void
    {
        $partners = $this->x12PartnerService->list();

        $this->success($partners, 'X12 partners retrieved successfully.');
    }

    /**
     * Register a new X12 partner (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'partner_id', 'description']);

        $result = $this->x12PartnerService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing X12 partner (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'partner_id', 'description']);

        $result = $this->x12PartnerService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'X12 partner not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete an X12 partner (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->x12PartnerService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
