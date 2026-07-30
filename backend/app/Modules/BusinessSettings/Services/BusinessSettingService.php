<?php

namespace App\Modules\BusinessSettings\Services;

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
            'name'       => 'Intellix',
            'created_at' => date('Y-m-d H:i:s')
        ]);

        return (new BusinessSetting())->where('id', $id)->first();
    }

    /**
     * Update the business name and contact info (admin-only).
     */
    public function update(array $data, int $userId): array
    {
        $name = trim($data['name'] ?? '');
        $email = trim($data['email'] ?? '');

        $errors = [];

        if ($name === '') {
            $errors['name'] = 'Business name is required.';
        }

        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Enter a valid email address.';
        }

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $settings = $this->get();

        (new BusinessSetting())->update([
            'name'       => $name,
            'address'    => trim($data['address'] ?? '') ?: null,
            'phone'      => trim($data['phone'] ?? '') ?: null,
            'email'      => $email ?: null,
            'updated_at' => date('Y-m-d H:i:s'),
            'updated_by' => $userId
        ], $settings['id']);

        return [
            'success' => true,
            'message' => 'Business information updated successfully.',
            'data' => $this->get()
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
