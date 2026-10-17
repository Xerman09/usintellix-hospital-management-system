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
     * The system timezone, for every browser (no login needed -- the
     * login page shows dates too, and it isn't sensitive).
     */
    public function systemTimezone(): void
    {
        $this->success($this->generalSettingService->systemTimezone(), 'System timezone retrieved successfully.');
    }

    /**
     * Timezones the system can be set to, grouped by region (admin-only).
     */
    public function timezones(): void
    {
        $this->success($this->generalSettingService->timezones(), 'Timezones retrieved successfully.');
    }

    /**
     * Change the system timezone (admin-only).
     */
    public function updateTimezone(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->generalSettingService->updateTimezone(
            $request->only(['timezone']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Change how long new prescriptions stay valid (admin-only).
     */
    public function updatePrescriptions(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->generalSettingService->updatePrescriptionSettings(
            $request->only(['prescription_validity_days', 'refill_validity_days']),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message']);
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

    /**
     * Update Notification Preferences & Master Channel Switches (admin-only).
     */
    public function updateNotifications(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->generalSettingService->updateNotificationSettings(
            $request->only([
                'notification_sms_enabled',
                'notification_email_enabled',
                'notification_in_app_enabled',
                'sms_gateway_provider',
                'email_gateway_provider'
            ]),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Update Hospital Operational Policies & System Constants (admin-only).
     */
    public function updateOperationalPolicies(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->generalSettingService->updateOperationalPolicies(
            $request->only([
                'default_appointment_duration',
                'bed_turnover_buffer_minutes',
                'inactivity_timeout_minutes',
                'break_glass_requires_cosign'
            ]),
            (int) $user['id']
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message']);
    }
}
