<?php

namespace App\Modules\DepartmentOrg\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\DepartmentOrg\Services\DepartmentOrgService;

class DepartmentOrgController extends Controller
{
    private DepartmentOrgService $service;

    public function __construct()
    {
        $this->service = new DepartmentOrgService();
    }

    /**
     * Get complete visual organizational hierarchy tree.
     */
    public function tree(): void
    {
        $request = new Request();
        $facilityId = $request->input('facility_id') ? (int) $request->input('facility_id') : null;

        $tree = $this->service->getFacilityOrgTree($facilityId);

        if (!$tree['success']) {
            $this->error($tree['message'], 404);
            return;
        }

        $this->success($tree, 'Facility organizational tree retrieved successfully.');
    }

    /**
     * Appoint / Change Head of Department (Doctor).
     */
    public function assignHead(): void
    {
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);
        $request = new Request();

        $departmentId = (int) $request->input('department_id');
        $employeeId = (int) $request->input('employee_id');

        if (!$departmentId || !$employeeId) {
            $this->error('Department ID and Employee ID are required.', 422);
            return;
        }

        $result = $this->service->assignHeadOfDepartment($departmentId, $employeeId, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }

    /**
     * Assign or move ward to a department.
     */
    public function assignWard(): void
    {
        $user = Session::get('user');
        $userId = (int) ($user['id'] ?? 1);
        $request = new Request();

        $wardId = (int) $request->input('ward_id');
        $departmentId = (int) $request->input('department_id');

        if (!$wardId || !$departmentId) {
            $this->error('Ward ID and Department ID are required.', 422);
            return;
        }

        $result = $this->service->assignWardToDepartment($wardId, $departmentId, $userId);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result, $result['message']);
    }
}
