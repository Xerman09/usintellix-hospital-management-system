<?php

namespace App\Modules\GeneralSettings\Services;

use App\Core\Database;
use App\Modules\GeneralSettings\Models\GeneralSetting;
use DateTime;
use DateTimeZone;
use PDO;

class GeneralSettingService
{
    private const TWO_FACTOR_METHODS = ['sms', 'email'];

    /**
     * The system timezone used until an admin picks one. Only the
     * frontend applies it (to "today", "now" and clocks); the backend
     * itself keeps running on the server's clock.
     */
    public const DEFAULT_TIMEZONE = 'Asia/Manila';

    /**
     * Get the single general settings row (creating a default one if it
     * somehow doesn't exist yet), plus which roles Two-Factor
     * Authentication currently applies to.
     */
    public function get(): array
    {
        $settings = (new GeneralSetting())->first();

        if (!$settings) {
            $id = (new GeneralSetting())->create([
                'two_factor_enabled' => 0,
                'created_at' => date('Y-m-d H:i:s')
            ]);

            $settings = (new GeneralSetting())->where('id', $id)->first();
        }

        $settings['two_factor_role_ids'] = $this->getTwoFactorRoleIds();
        $settings['timezone'] = $settings['timezone'] ?? self::DEFAULT_TIMEZONE;
        $settings['timezone_offset'] = (new DateTime('now', new DateTimeZone($settings['timezone'])))->format('P');

        return $settings;
    }

    /**
     * Just the system timezone -- readable by everyone, since every
     * browser needs it to work out "today" and "now".
     */
    public function systemTimezone(): array
    {
        $stmt = Database::connection()->query("SELECT timezone FROM general_settings ORDER BY id LIMIT 1");
        $timezone = $stmt->fetchColumn();

        return [
            'timezone' => is_string($timezone) && $this->isValidTimezone($timezone) ? $timezone : self::DEFAULT_TIMEZONE
        ];
    }

    /**
     * Every timezone the system can run in, grouped by region, each with
     * its current UTC offset -- for the System Timezone picker.
     */
    public function timezones(): array
    {
        $now = new DateTime('now');
        $groups = [];

        foreach (DateTimeZone::listIdentifiers() as $name) {
            $offset = $now->setTimezone(new DateTimeZone($name))->format('P');
            $region = strpos($name, '/') === false ? 'Other' : strstr($name, '/', true);

            $groups[$region][] = [
                'name' => $name,
                'offset' => $offset,
                'label' => '(UTC' . $offset . ') ' . str_replace(['/', '_'], [' / ', ' '], $name)
            ];
        }

        return $groups;
    }

    /**
     * Change the system timezone (admin-only). Browsers pick it up on
     * their next page load; nothing already stored is changed.
     */
    public function updateTimezone(array $data, int $userId): array
    {
        $timezone = trim((string) ($data['timezone'] ?? ''));

        if (!$this->isValidTimezone($timezone)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => ['timezone' => 'Choose a timezone from the list.']
            ];
        }

        $settings = $this->get();

        (new GeneralSetting())->update([
            'timezone' => $timezone,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $settings['id']);

        return [
            'success' => true,
            'message' => 'System timezone updated successfully.',
            'data' => $this->get()
        ];
    }

    /**
     * Update Two-Factor Authentication: whether it's enabled, and if so,
     * the delivery method and which roles it applies to (admin-only).
     */
    public function update(array $data, int $userId): array
    {
        $enabled = !empty($data['two_factor_enabled']);
        $method = trim((string) ($data['two_factor_method'] ?? ''));
        $roleIds = array_values(array_unique(array_map('intval', $data['role_ids'] ?? [])));

        $errors = [];

        if ($enabled) {
            if (!in_array($method, self::TWO_FACTOR_METHODS, true)) {
                $errors['two_factor_method'] = 'Choose SMS or Email.';
            }

            if (empty($roleIds)) {
                $errors['role_ids'] = 'Select at least one role.';
            }
        }

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $settings = $this->get();

        (new GeneralSetting())->update([
            'two_factor_enabled' => $enabled ? 1 : 0,
            'two_factor_method' => $enabled ? $method : null,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $settings['id']);

        $this->syncTwoFactorRoles($enabled ? $roleIds : [], $userId);

        return [
            'success' => true,
            'message' => 'General settings updated successfully.',
            'data' => $this->get()
        ];
    }

    private function isValidTimezone(string $name): bool
    {
        return in_array($name, DateTimeZone::listIdentifiers(), true);
    }

    private function getTwoFactorRoleIds(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT role_id FROM general_settings_two_factor_roles ORDER BY role_id"
        );

        $stmt->execute();

        return array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /**
     * Replace the full set of roles Two-Factor Authentication applies to
     * (the editor always submits the complete selection).
     */
    private function syncTwoFactorRoles(array $roleIds, int $userId): void
    {
        $pdo = Database::connection();

        $pdo->prepare("DELETE FROM general_settings_two_factor_roles")->execute();

        if (empty($roleIds)) {
            return;
        }

        $now = date('Y-m-d H:i:s');

        $insert = $pdo->prepare(
            "INSERT INTO general_settings_two_factor_roles (role_id, created_at, created_by)
             VALUES (:role_id, :created_at, :created_by)"
        );

        foreach ($roleIds as $roleId) {
            $insert->execute([
                'role_id' => $roleId,
                'created_at' => $now,
                'created_by' => $userId
            ]);
        }
    }
}
