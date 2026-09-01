<?php

namespace App\Modules\FormDefinitions\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\FormDefinitions\Services\FormDefinitionService;

class FormDefinitionController extends Controller
{
    private FormDefinitionService $service;

    public function __construct()
    {
        $this->service = new FormDefinitionService();
    }

    /**
     * Registered form modules + the informational Unregistered
     * catalog (admin-only).
     */
    public function index(): void
    {
        $this->success($this->service->overview(), 'Forms Administration data retrieved successfully.');
    }

    /**
     * Bulk-save priority/category/nickname/access_control for the
     * registered forms grid (admin-only).
     */
    public function bulkUpdate(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $rows = (array) $request->input('rows', []);
        $result = $this->service->bulkUpdate($rows, (int) $admin['id']);

        if (!$result['success']) {
            $this->error($result['message'], 500);
            return;
        }

        $this->success(null, $result['message']);
    }
}
