<?php

namespace App\Modules\GeneralSettings\Services;

use App\Core\Database;
use App\Modules\GeneralSettings\Models\GeneralSetting;
use PDO;

class GeneralSettingService
{
    private const TWO_FACTOR_METHODS = ['sms', 'email'];

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

        return $settings;
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
