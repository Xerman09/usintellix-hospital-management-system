<?php

namespace App\Modules\CompletionStatuses\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\CompletionStatuses\Services\CompletionStatusService;

class CompletionStatusController extends Controller
{
    private CompletionStatusService $completionStatusService;

    public function __construct()
    {
        $this->completionStatusService = new CompletionStatusService();
    }

    /**
     * List completion statuses.
     */
    public function index(): void
    {
        $statuses = $this->completionStatusService->list();

        $this->success($statuses, 'Completion statuses retrieved successfully.');
    }

    /**
     * Register a new completion status (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only(['name', 'description']);

        $result = $this->completionStatusService->register($data, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing completion status (admin-only).
     */
    public function update(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');
        $data = $request->only(['name', 'description']);

        $result = $this->completionStatusService->update($id, $data, (int) $admin['id']);

        if (!$result['success']) {
            $status = $result['message'] === 'Completion status not found.' ? 404 : 422;
            $this->error($result['message'], $status, $result['errors'] ?? null);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * Soft-delete a completion status (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->completionStatusService->remove($id, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
