<?php

namespace App\Modules\CqmSourceOfPayments\Services;

use App\Core\Database;
use App\Modules\CqmSourceOfPayments\Models\CqmSourceOfPayment;
use PDO;
use PDOException;
use Throwable;

class CqmSourceOfPaymentService
{
    /**
     * List all active (non-deleted) CQM source of payment records.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM cqm_source_of_payments
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new CQM source of payment (admin-only).
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
            $sopId = (new CqmSourceOfPayment())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$sopId) {
                throw new \RuntimeException('Failed to create CQM source of payment record.');
            }

            return [
                'success' => true,
                'message' => 'CQM source of payment created successfully.',
                'data' => [
                    'cqm_source_of_payment_id' => $sopId
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A CQM source of payment with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create CQM source of payment.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create CQM source of payment.'
            ];
        }
    }

    /**
     * Update an existing CQM source of payment (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $sop = (new CqmSourceOfPayment())->where('id', $id)->first();

        if (!$sop || $sop['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'CQM source of payment not found.'
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
            $updated = (new CqmSourceOfPayment())->update([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update CQM source of payment.'
                ];
            }

            return [
                'success' => true,
                'message' => 'CQM source of payment updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A CQM source of payment with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update CQM source of payment.'
            ];
        }
    }

    /**
     * Soft-delete a CQM source of payment (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $sop = (new CqmSourceOfPayment())->where('id', $id)->first();

        if (!$sop || $sop['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'CQM source of payment not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE cqm_source_of_payments
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
            'message' => 'CQM source of payment deleted successfully.'
        ];
    }

    /**
     * Validate CQM source of payment input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new CqmSourceOfPayment())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A CQM source of payment with this name already exists.';
        }

        return $errors;
    }
}
