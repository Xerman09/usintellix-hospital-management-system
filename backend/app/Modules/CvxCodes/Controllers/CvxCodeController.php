<?php

namespace App\Modules\CvxCodes\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\CvxCodes\Services\CvxCodeService;

class CvxCodeController extends Controller
{
    private CvxCodeService $cvxCodeService;

    public function __construct()
    {
        $this->cvxCodeService = new CvxCodeService();
    }

    /**
     * List CVX codes, paginated.
     */
    public function index(): void
    {
        $request = new Request();

        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 50);
        $search = trim((string) $request->input('search', ''));

        $result = $this->cvxCodeService->list($page, $perPage, $search);

        $this->success($result, 'CVX codes retrieved successfully.');
    }

    /**
     * Register a new CVX code (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['code', 'short_description', 'status']);

        $result = $this->cvxCodeService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing CVX code (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['code', 'short_description', 'status']);

        $result = $this->cvxCodeService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'CVX code not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a CVX code (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->cvxCodeService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
