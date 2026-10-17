<?php

namespace App\Modules\BusinessSettings\Services;

use App\Core\AuditDiffService;
use App\Modules\BusinessSettings\Models\BusinessSetting;

class BusinessSettingService
{
    /**
     * Get the single business settings row, creating a default one if
     * it somehow doesn't exist yet.
     */
    public function get(): array
    {
        $settings = (new BusinessSetting())->first();

        if ($settings) {
            return $settings;
        }

        $id = (new BusinessSetting())->create([
            'name'              => 'Intellix',
            'tax_name'          => 'VAT',
            'tax_rate_percent'  => 12.00,
            'tax_id_number'     => 'TIN-482-901-736-000',
            'currency_code'     => 'USD',
            'currency_symbol'   => '$',
            'currency_position' => 'prefix',
            'decimal_places'    => 2,
            'created_at'        => date('Y-m-d H:i:s')
        ]);

        return (new BusinessSetting())->where('id', $id)->first();
    }

    /**
     * Update the business name, contact info, tax configuration, and currency preferences (admin-only).
     */
    public function update(array $data, int $userId): array
    {
        $name = trim($data['name'] ?? '');
        $email = trim($data['email'] ?? '');
        $taxName = trim($data['tax_name'] ?? '');
        $taxIdNumber = trim($data['tax_id_number'] ?? '');
        $currencyCode = strtoupper(trim($data['currency_code'] ?? ''));
        $currencySymbol = trim($data['currency_symbol'] ?? '');
        $currencyPosition = strtolower(trim($data['currency_position'] ?? ''));
        $decimalPlaces = isset($data['decimal_places']) ? (int)$data['decimal_places'] : null;

        $errors = [];

        if ($name === '') {
            $errors['name'] = 'Business name is required.';
        }

        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Enter a valid email address.';
        }

        if (isset($data['tax_rate_percent'])) {
            $rate = $data['tax_rate_percent'];
            if (!is_numeric($rate) || (float)$rate < 0 || (float)$rate > 100) {
                $errors['tax_rate_percent'] = 'Tax rate percent must be a valid number between 0% and 100%.';
            }
        }

        if ($taxName !== '' && mb_strlen($taxName) > 50) {
            $errors['tax_name'] = 'Tax name cannot exceed 50 characters.';
        }

        if ($taxIdNumber !== '' && mb_strlen($taxIdNumber) > 50) {
            $errors['tax_id_number'] = 'Tax ID number cannot exceed 50 characters.';
        }

        if ($currencyCode !== '' && (mb_strlen($currencyCode) < 1 || mb_strlen($currencyCode) > 10)) {
            $errors['currency_code'] = 'Currency code must be between 1 and 10 characters (e.g. USD, PHP, EUR).';
        }

        if ($currencySymbol !== '' && mb_strlen($currencySymbol) > 10) {
            $errors['currency_symbol'] = 'Currency symbol cannot exceed 10 characters (e.g. $, ₱, €).';
        }

        if ($currencyPosition !== '' && !in_array($currencyPosition, ['prefix', 'suffix'], true)) {
            $errors['currency_position'] = 'Currency position must be either "prefix" or "suffix".';
        }

        if ($decimalPlaces !== null && ($decimalPlaces < 0 || $decimalPlaces > 4)) {
            $errors['decimal_places'] = 'Decimal places must be between 0 and 4.';
        }

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $settings = $this->get();
        $oldSnapshot = $settings;

        $updatePayload = [
            'name'       => $name,
            'address'    => trim($data['address'] ?? '') ?: null,
            'phone'      => trim($data['phone'] ?? '') ?: null,
            'email'      => $email ?: null,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ];

        if (array_key_exists('tax_name', $data)) {
            $updatePayload['tax_name'] = $taxName ?: 'VAT';
        }

        if (array_key_exists('tax_rate_percent', $data)) {
            $updatePayload['tax_rate_percent'] = round((float)$data['tax_rate_percent'], 2);
        }

        if (array_key_exists('tax_id_number', $data)) {
            $updatePayload['tax_id_number'] = $taxIdNumber ?: null;
        }

        if (array_key_exists('currency_code', $data)) {
            $updatePayload['currency_code'] = $currencyCode ?: 'USD';
        }

        if (array_key_exists('currency_symbol', $data)) {
            $updatePayload['currency_symbol'] = $currencySymbol ?: '$';
        }

        if (array_key_exists('currency_position', $data)) {
            $updatePayload['currency_position'] = in_array($currencyPosition, ['prefix', 'suffix'], true) ? $currencyPosition : 'prefix';
        }

        if (array_key_exists('decimal_places', $data)) {
            $updatePayload['decimal_places'] = ($decimalPlaces !== null && $decimalPlaces >= 0 && $decimalPlaces <= 4) ? $decimalPlaces : 2;
        }

        (new BusinessSetting())->update($updatePayload, $settings['id']);

        $newSettings = $this->get();

        // Record granular entity change audit diff
        try {
            AuditDiffService::recordDiff(
                'business_settings',
                (int)$settings['id'],
                'UPDATE',
                $oldSnapshot,
                $newSettings,
                $userId
            );
        } catch (\Throwable $e) {
            error_log('AuditDiffService error on business_settings: ' . $e->getMessage());
        }

        return [
            'success' => true,
            'message' => 'Business, tax, and currency configuration updated successfully.',
            'data' => $newSettings
        ];
    }

    /**
     * Upload/replace the business logo (admin-only).
     */
    public function uploadLogo(array $file, int $userId): array
    {
        if (empty($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
            return [
                'success' => false,
                'message' => 'No image was uploaded.'
            ];
        }

        $allowedTypes = [
            'image/jpeg' => 'jpg',
            'image/png'  => 'png',
            'image/webp' => 'webp',
            'image/svg+xml' => 'svg',
            'image/gif'  => 'gif'
        ];

        $mimeType = mime_content_type($file['tmp_name']);

        if (!isset($allowedTypes[$mimeType])) {
            return [
                'success' => false,
                'message' => 'Only JPG, PNG, WEBP, SVG, or GIF images are allowed.'
            ];
        }

        if ($file['size'] > 2 * 1024 * 1024) {
            return [
                'success' => false,
                'message' => 'Image must be 2MB or smaller.'
            ];
        }

        $settings = $this->get();

        $uploadDir = dirname(__DIR__, 4) . '/public/uploads/business';

        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $filename = 'logo_' . time() . '.' . $allowedTypes[$mimeType];
        $destination = $uploadDir . '/' . $filename;

        if (!move_uploaded_file($file['tmp_name'], $destination)) {
            return [
                'success' => false,
                'message' => 'Failed to save the uploaded image.'
            ];
        }

        $this->deleteLogoFile($settings['logo'] ?? null);

        $logoPath = '/uploads/business/' . $filename;

        (new BusinessSetting())->update([
            'logo'       => $logoPath,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $settings['id']);

        return [
            'success' => true,
            'message' => 'Business logo updated successfully.',
            'data' => $this->get()
        ];
    }

    /**
     * Remove the business logo, reverting to the default app icon.
     */
    public function removeLogo(int $userId): array
    {
        $settings = $this->get();

        $this->deleteLogoFile($settings['logo'] ?? null);

        (new BusinessSetting())->update([
            'logo'       => null,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $settings['id']);

        return [
            'success' => true,
            'message' => 'Business logo removed successfully.',
            'data' => $this->get()
        ];
    }

    private function deleteLogoFile(?string $logoPath): void
    {
        if (empty($logoPath)) {
            return;
        }

        $path = dirname(__DIR__, 4) . '/public' . $logoPath;

        if (is_file($path)) {
            @unlink($path);
        }
    }
}
