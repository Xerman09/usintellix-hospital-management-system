<?php

namespace App\Modules\Departments\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Departments\Services\DepartmentService;

class DepartmentController extends Controller
{
    private DepartmentService $service;

    public function __construct()
    {
        $this->service = new DepartmentService();
    }

    /**
     * List all departments with filtering.
     */
    public function index(): void
    {
        $request = new Request();
        $filters = [
            'keyword'     => $request->input('keyword'),
            'type'        => $request->input('type'),
            'status'      => $request->input('status'),
            'facility_id' => $request->input('facility_id')
        ];

        $departments = $this->service->list(array_filter($filters, static function ($v) {
            return $v !== null && $v !== '';
        }));

        $this->success($departments, 'Departments retrieved successfully.');
    }

    /**
     * Get department statistics summary.
     */
    public function stats(): void
    {
        $stats = $this->service->getStats();
        $this->success($stats, 'Department statistics retrieved successfully.');
    }

    /**
     * Get options for dropdowns (facilities, heads of department, types, statuses).
     */
    public function options(): void
    {
        $options = $this->service->getOptions();
        $this->success($options, 'Department options retrieved successfully.');
    }

    /**
     * Get a single department detail.
     */
    public function show(): void
    {
        $request = new Request();
        $id = (int) ($request->input('id') ?? 0);

        if ($id <= 0) {
            $this->error('Valid Department ID is required.', 400);
            return;
        }

        $dept = $this->service->getById($id);
        if (!$dept) {
            $this->error('Department not found.', 404);
            return;
        }

        $this->success($dept, 'Department retrieved successfully.');
    }

    /**
     * Get employees assigned to a department.
     */
    public function staff(): void
    {
        $request = new Request();
        $id = (int) ($request->input('id') ?? $request->input('department_id') ?? 0);

        if ($id <= 0) {
            $this->error('Valid Department ID is required.', 400);
            return;
        }

        $dept = $this->service->getById($id);
        if (!$dept) {
            $this->error('Department not found.', 404);
            return;
        }

        $staff = $this->service->getStaff($id);
        $this->success([
            'department' => $dept,
            'staff' => $staff
        ], 'Department staff roster retrieved successfully.');
    }

    /**
     * Register a new department.
     */
    public function store(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);
        $data = $request->all();

        $result = $this->service->register($data, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? []);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Update an existing department.
     */
    public function update(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);
        $data = $request->all();
        $id = (int) ($data['id'] ?? $request->input('id') ?? 0);

        if ($id <= 0) {
            $this->error('Valid Department ID is required.', 400);
            return;
        }

        $result = $this->service->update($id, $data, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? []);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Soft delete a department.
     */
    public function destroy(): void
    {
        $request = new Request();
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);
        $data = $request->all();
        $id = (int) ($data['id'] ?? $request->input('id') ?? 0);

        if ($id <= 0) {
            $this->error('Valid Department ID is required.', 400);
            return;
        }

        $result = $this->service->delete($id, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }
}
