<?php

namespace App\Modules\Providers\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Providers\Services\ProviderService;

class ProviderController extends Controller
{
    private ProviderService $providerService;

    public function __construct()
    {
        $this->providerService = new ProviderService();
    }

    /**
     * List providers.
     */
    public function index(): void
    {
        $providers = $this->providerService->list();

        $this->success($providers, 'Providers retrieved successfully.');
    }

    /**
     * Register a new provider (admin-only).
     */
    public function register(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $data = $request->only([
            'employee_id',
            'specialty',
            'npi_number',
            'license_number',
            'dea_number'
        ]);

        $result = $this->providerService->register(
            $data,
            (int) $admin['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message'], 201);
    }

    /**
     * Soft-delete a provider (admin-only).
     */
    public function destroy(): void
    {
        $admin = Session::get('user');
        $request = new Request();

        $id = (int) $request->input('id');

        $result = $this->providerService->remove(
            $id,
            (int) $admin['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 404);
            return;
        }

        $this->success(null, $result['message']);
    }
}
