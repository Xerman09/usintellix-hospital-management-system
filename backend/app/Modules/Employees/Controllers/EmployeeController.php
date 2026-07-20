<?php

namespace App\Modules\Employees\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Employees\Services\EmployeeService;

class EmployeeController extends Controller
{
    private EmployeeService $employeeService;

    public function __construct()
    {
        $this->employeeService = new EmployeeService();
    }

    /**
     * Register a new employee account (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only([
            'username',
            'password',
            'role_id',
            'first_name',
            'middle_name',
            'last_name',
            'suffix',
            'sex',
            'birthdate',
            'email',
            'phone',
            'department_id'
        ]);

        $result = $this->employeeService->register(
            $data,
            (int) $admin['tenant_id'],
            (int) $admin['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }
}
