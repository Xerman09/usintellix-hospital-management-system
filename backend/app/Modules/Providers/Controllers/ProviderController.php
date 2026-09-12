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
     * List providers. Patients (picking a provider to self-schedule with)
     * only get name/specialty/department — not NPI/license/DEA numbers or
     * personal contact info, which the full staff listing includes.
     */
    public function index(): void
    {
        $user = Session::get('user');
        $providers = $this->providerService->list();

        if (($user['role'] ?? '') === 'patient') {
            $providers = array_map(
                fn(array $provider): array => [
                    'id' => $provider['id'],
                    'first_name' => $provider['first_name'],
                    'middle_name' => $provider['middle_name'],
                    'last_name' => $provider['last_name'],
                    'suffix' => $provider['suffix'],
                    'specialty' => $provider['specialty'],
                    'department_name' => $provider['department_name']
                ],
                $providers
            );
        }

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
