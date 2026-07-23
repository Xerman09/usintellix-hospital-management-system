<?php

namespace App\Modules\FacilityBillings\Services;

use App\Core\Database;
use App\Modules\FacilityBillings\Models\FacilityBilling;
use PDO;
use PDOException;
use Throwable;

class FacilityBillingService
{
    /**
     * List all active (non-deleted) facility billing records.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, rate, created_at, updated_at
             FROM facility_billings
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new facility billing record (admin-only).
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
            $billingId = (new FacilityBilling())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'rate'        => $data['rate'],
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$billingId) {
                throw new \RuntimeException('Failed to create facility billing record.');
            }

            return [
                'success' => true,
                'message' => 'Facility billing created successfully.',
                'data' => [
                    'facility_billing_id' => $billingId
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A facility billing record with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create facility billing.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create facility billing.'
            ];
        }
    }

    /**
     * Update an existing facility billing record (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $billing = (new FacilityBilling())->where('id', $id)->first();

        if (!$billing || $billing['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Facility billing record not found.'
            ];
        }

        $errors = $this->validate($data, $id);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        try {
            $updated = (new FacilityBilling())->update([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'rate'        => $data['rate'],
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update facility billing.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Facility billing updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A facility billing record with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update facility billing.'
            ];
        }
    }

    /**
     * Soft-delete a facility billing record (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $billing = (new FacilityBilling())->where('id', $id)->first();

        if (!$billing || $billing['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Facility billing record not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE facility_billings
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
            'message' => 'Facility billing deleted successfully.'
        ];
    }

    /**
     * Validate facility billing input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
        }

        if (!isset($data['rate']) || $data['rate'] === '' || !is_numeric($data['rate']) || (float) $data['rate'] < 0) {
            $errors['rate'] = 'A valid, non-negative rate is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $existing = (new FacilityBilling())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A facility billing record with this name already exists.';
        }

        return $errors;
    }
}
