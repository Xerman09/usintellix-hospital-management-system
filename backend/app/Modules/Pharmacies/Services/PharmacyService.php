<?php

namespace App\Modules\Pharmacies\Services;

use App\Core\Database;
use App\Modules\Pharmacies\Models\Pharmacy;
use PDO;
use Throwable;

class PharmacyService
{
    private const DEFAULT_METHODS = ['print', 'email', 'fax', 'transmit', 'erx'];

    private const FIELDS = [
        'name', 'address', 'address2', 'city', 'state', 'zip',
        'email', 'phone', 'fax', 'npi', 'ncpdp', 'default_method'
    ];

    /**
     * List all active (non-deleted) pharmacies.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, address, address2, city, state, zip,
                    email, phone, fax, npi, ncpdp, default_method,
                    created_at, updated_at
             FROM pharmacies
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new pharmacy (admin-only).
     */
    public function register(array $data, int $createdBy): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        try {
            $pharmacyId = (new Pharmacy())->create(array_merge(
                $this->pluckFields($data),
                [
                    'created_at' => date('Y-m-d H:i:s'),
                    'created_by' => $createdBy
                ]
            ));

            if (!$pharmacyId) {
                throw new \RuntimeException('Failed to create pharmacy record.');
            }

            return [
                'success' => true,
                'message' => 'Pharmacy created successfully.',
                'data' => [
                    'pharmacy_id' => $pharmacyId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create pharmacy.'
            ];
        }
    }

    /**
     * Update an existing pharmacy (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $pharmacy = (new Pharmacy())->where('id', $id)->first();

        if (!$pharmacy || $pharmacy['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Pharmacy not found.'
            ];
        }

        $errors = $this->validate($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        try {
            $updated = (new Pharmacy())->update(array_merge(
                $this->pluckFields($data),
                [
                    'updated_at' => date('Y-m-d H:i:s'),
                    'updated_by' => $updatedBy
                ]
            ), $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update pharmacy.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Pharmacy updated successfully.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to update pharmacy.'
            ];
        }
    }

    /**
     * Soft-delete a pharmacy (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $pharmacy = (new Pharmacy())->where('id', $id)->first();

        if (!$pharmacy || $pharmacy['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Pharmacy not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE pharmacies
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id'         => $id
        ]);

        return [
            'success' => true,
            'message' => 'Pharmacy deleted successfully.'
        ];
    }

    private function pluckFields(array $data): array
    {
        $fields = [];

        foreach (self::FIELDS as $field) {
            $fields[$field] = $data[$field] ?? null;
        }

        return $fields;
    }

    /**
     * Validate pharmacy input.
     */
    private function validate(array $data): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
        }

        if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Enter a valid email address.';
        }

        if (!empty($data['default_method']) && !in_array($data['default_method'], self::DEFAULT_METHODS, true)) {
            $errors['default_method'] = 'Select a valid default method.';
        }

        return $errors;
    }
}
