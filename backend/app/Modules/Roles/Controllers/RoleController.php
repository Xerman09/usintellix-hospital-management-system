<?php

namespace App\Modules\Roles\Controllers;

use App\Core\Controller;
use App\Modules\Roles\Models\Role;

class RoleController extends Controller
{
    /**
     * List all roles.
     */
    public function index(): void
    {
        $roles = (new Role())->all();

        $this->success($roles, 'Roles retrieved successfully.');
    }
}
