<?php

namespace App\Modules\CqmValuesets\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\CqmValuesets\Services\CqmValuesetCodeService;

class CqmValuesetCodeController extends Controller
{
    private CqmValuesetCodeService $cqmValuesetCodeService;

    public function __construct()
    {
        $this->cqmValuesetCodeService = new CqmValuesetCodeService();
    }

    /**
     * Search member codes across all value sets, paginated.
     * Used by the "Select Codes" picker (CQM Valueset / OID Valueset sources).
     */
    public function search(): void
    {
        $request = new Request();

        $search = trim((string) $request->input('search', ''));
        $mode = (string) $request->input('mode', 'name');
        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 50);

        $result = $this->cqmValuesetCodeService->searchAcrossValuesets($search, $mode, $page, $perPage);

        $this->success($result, 'Value set codes retrieved successfully.');
    }

    /**
     * List member codes for a value set.
     */
    public function index(): void
    {
        $request = new Request();

        $valuesetId = (int) $request->input('valueset_id');

        $result = $this->cqmValuesetCodeService->list($valuesetId);

        $this->success($result, 'Value set codes retrieved successfully.');
    }

    /**
     * Add a member code to a value set (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $valuesetId = (int) $request->input('valueset_id');
        $data = $request->only(['code', 'code_system', 'description']);

        $result = $this->cqmValuesetCodeService->register($valuesetId, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Value set not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update a member code (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['code', 'code_system', 'description']);

        $result = $this->cqmValuesetCodeService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Code not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a member code (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->cqmValuesetCodeService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
