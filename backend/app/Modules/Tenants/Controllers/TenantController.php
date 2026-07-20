<?php

namespace App\Modules\Tenants\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Tenants\Services\TenantService;

class TenantController extends Controller
{
    private TenantService $tenantService;

    public function __construct()
    {
        $this->tenantService = new TenantService();
    }

    /**
     * Register a new company (tenant) and its first admin account.
     */
    public function register(): void
    {
        $request = new Request();

        $data = $request->only([
            'subdomain',
            'company_name',
            'company_email',
            'company_phone',
            'username',
            'password',
            'first_name',
            'middle_name',
            'last_name',
            'suffix',
            'sex',
            'birthdate',
            'email',
            'phone'
        ]);

        $result = $this->tenantService->register($data);

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $loginResult = (new AuthService())->login($data['subdomain'], $data['username'], $data['password']);

        if (!$loginResult['success']) {
            $this->success($result['data'], 'Company registered successfully. Please log in.', 201);
            return;
        }

        $this->success($loginResult['data'], 'Company registered successfully.', 201);
    }
}
