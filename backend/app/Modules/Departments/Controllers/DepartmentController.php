<?php

namespace App\Modules\Departments\Controllers;

use App\Core\Controller;
use App\Modules\Departments\Models\Department;

class DepartmentController extends Controller
{
    /**
     * List all departments.
     */
    public function index(): void
    {
        $departments = (new Department())->all();

        $this->success($departments, 'Departments retrieved successfully.');
    }
}
