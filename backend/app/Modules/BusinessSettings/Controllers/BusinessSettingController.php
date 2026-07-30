<?php

namespace App\Modules\BusinessSettings\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\BusinessSettings\Services\BusinessSettingService;

class BusinessSettingController extends Controller
{
    private BusinessSettingService $businessSettingService;

    public function __construct()
    {
        $this->businessSettingService = new BusinessSettingService();
    }

    /**
     * Get the business name/logo. Public (no auth) -- the login page
     * needs this before a user is signed in.
     */
    public function show(): void
    {
        $this->success($this->businessSettingService->get(), 'Business information retrieved successfully.');
    }

    /**
     * Update the business name and contact info (admin-only).
     */
    public function update(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->businessSettingService->update(
            $request->only(['name', 'address', 'phone', 'email']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Upload/replace the business logo (admin-only).
     */
    public function uploadLogo(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $files = $request->files();

        $result = $this->businessSettingService->uploadLogo($files['logo'] ?? [], (int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Remove the business logo (admin-only).
     */
    public function removeLogo(): void
    {
        $user = Session::get('user');

        $result = $this->businessSettingService->removeLogo((int) $user['id']);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }
}
