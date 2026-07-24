<?php

namespace App\Modules\PayerTypes\Services;

use App\Core\Database;
use App\Modules\PayerTypes\Models\PayerType;
use PDO;
use PDOException;
use Throwable;

class PayerTypeService
{
    /**
     * List all active (non-deleted) payer types.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM payer_types
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new payer type (admin-only).
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
            $payerTypeId = (new PayerType())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$payerTypeId) {
                throw new \RuntimeException('Failed to create payer type record.');
            }

            return [
                'success' => true,
                'message' => 'Payer type created successfully.',
                'data' => [
                    'payer_type_id' => $payerTypeId
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A payer type with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create payer type.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create payer type.'
            ];
        }
    }

    /**
     * Update an existing payer type (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $payerType = (new PayerType())->where('id', $id)->first();

        if (!$payerType || $payerType['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Payer type not found.'
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
            $updated = (new PayerType())->update([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update payer type.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Payer type updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A payer type with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update payer type.'
            ];
        }
    }

    /**
     * Soft-delete a payer type (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $payerType = (new PayerType())->where('id', $id)->first();

        if (!$payerType || $payerType['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Payer type not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE payer_types
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
            'message' => 'Payer type deleted successfully.'
        ];
    }

    /**
     * Validate payer type input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new PayerType())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A payer type with this name already exists.';
        }

        return $errors;
    }
}
