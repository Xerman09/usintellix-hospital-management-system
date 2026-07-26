<?php

namespace App\Modules\CqmValuesets\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\CqmValuesets\Services\CqmValuesetService;

class CqmValuesetController extends Controller
{
    private CqmValuesetService $cqmValuesetService;

    public function __construct()
    {
        $this->cqmValuesetService = new CqmValuesetService();
    }

    /**
     * List CQM value sets, paginated.
     */
    public function index(): void
    {
        $request = new Request();

        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 50);
        $search = trim((string) $request->input('search', ''));

        $result = $this->cqmValuesetService->list($page, $perPage, $search);

        $this->success($result, 'CQM value sets retrieved successfully.');
    }

    /**
     * Register a new CQM value set (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['oid', 'name', 'code_system', 'definition_version']);

        $result = $this->cqmValuesetService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing CQM value set (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['oid', 'name', 'code_system', 'definition_version']);

        $result = $this->cqmValuesetService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Value set not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a CQM value set (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->cqmValuesetService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
