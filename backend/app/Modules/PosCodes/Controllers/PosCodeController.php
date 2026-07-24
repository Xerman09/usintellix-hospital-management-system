<?php

namespace App\Modules\PosCodes\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PosCodes\Services\PosCodeService;

class PosCodeController extends Controller
{
    private PosCodeService $posCodeService;

    public function __construct()
    {
        $this->posCodeService = new PosCodeService();
    }

    /**
     * List POS codes.
     */
    public function index(): void
    {
        $posCodes = $this->posCodeService->list();

        $this->success($posCodes, 'POS codes retrieved successfully.');
    }

    /**
     * Register a new POS code (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['code', 'name', 'description']);

        $result = $this->posCodeService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing POS code (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['code', 'name', 'description']);

        $result = $this->posCodeService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'POS code not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a POS code (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->posCodeService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
