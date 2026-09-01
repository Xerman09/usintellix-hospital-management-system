<?php

namespace App\Modules\ProviderInsuranceNumbers\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\ProviderInsuranceNumbers\Services\ProviderInsuranceNumberService;

class ProviderInsuranceNumberController extends Controller
{
    private ProviderInsuranceNumberService $service;

    public function __construct()
    {
        $this->service = new ProviderInsuranceNumberService();
    }

    public function index(): void
    {
        $rows = $this->service->list();

        $this->success($rows, 'Provider insurance numbers retrieved successfully.');
    }

    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $providerId = (int) $request->input('provider_id');
        $data = $request->only(['provider_number', 'rendering_number', 'group_number']);

        $result = $this->service->update($providerId, $data, (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
