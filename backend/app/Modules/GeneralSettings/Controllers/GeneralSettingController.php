<?php

namespace App\Modules\GeneralSettings\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\GeneralSettings\Services\GeneralSettingService;

class GeneralSettingController extends Controller
{
    private GeneralSettingService $generalSettingService;

    public function __construct()
    {
        $this->generalSettingService = new GeneralSettingService();
    }

    /**
     * Get the general settings, including which roles Two-Factor
     * Authentication currently applies to (admin-only).
     */
    public function show(): void
    {
        $this->success($this->generalSettingService->get(), 'General settings retrieved successfully.');
    }

    /**
     * Update Two-Factor Authentication settings (admin-only).
     */
    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->generalSettingService->update(
            $request->only(['two_factor_enabled', 'two_factor_method', 'role_ids']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message']);
    }
}
