<?php

namespace App\Modules\PatientDuplicates\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\PatientDuplicates\Services\PatientDuplicateService;

class PatientDuplicateController extends Controller
{
    private PatientDuplicateService $service;

    public function __construct()
    {
        $this->service = new PatientDuplicateService();
    }

    public function index(): void
    {
        $groups = $this->service->list();

        $this->success($groups, 'Duplicate patient groups retrieved successfully.');
    }

    public function dismiss(): void
    {
        $user = Session::get('user');
        $request = new Request();
        $groupKey = (string) $request->input('group_key', '');

        $result = $this->service->dismissGroup($groupKey, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success(null, $result['message']);
    }
}
