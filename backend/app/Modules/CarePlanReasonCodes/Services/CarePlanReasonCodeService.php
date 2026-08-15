<?php

namespace App\Modules\CarePlanReasonCodes\Services;

use App\Core\Database;
use App\Modules\CarePlanReasonCodes\Models\CarePlanReasonCode;
use PDO;
use Throwable;

class CarePlanReasonCodeService
{
    /**
     * List all active (non-deleted) care plan reason codes.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, code, description, created_at, updated_at
             FROM care_plan_reason_codes
             WHERE deleted_at IS NULL
             ORDER BY code"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new care plan reason code (admin-only).
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
            $reasonCodeId = (new CarePlanReasonCode())->create([
                'code'        => $data['code'],
                'description' => $data['description'],
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$reasonCodeId) {
                throw new \RuntimeException('Failed to create care plan reason code record.');
            }

            return [
                'success' => true,
                'message' => 'Care plan reason code created successfully.',
                'data' => [
                    'care_plan_reason_code_id' => $reasonCodeId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create care plan reason code.'
            ];
        }
    }

    /**
     * Update an existing care plan reason code (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $reasonCode = (new CarePlanReasonCode())->where('id', $id)->first();

        if (!$reasonCode || $reasonCode['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Care plan reason code not found.'
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

        $updated = (new CarePlanReasonCode())->update([
            'code'        => $data['code'],
            'description' => $data['description'],
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update care plan reason code.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Care plan reason code updated successfully.'
        ];
    }

    /**
     * Soft-delete a care plan reason code (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $reasonCode = (new CarePlanReasonCode())->where('id', $id)->first();

        if (!$reasonCode || $reasonCode['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Care plan reason code not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE care_plan_reason_codes
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
            'message' => 'Care plan reason code deleted successfully.'
        ];
    }

    /**
     * Validate care plan reason code input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['code'])) {
            $errors['code'] = 'Code is required.';
        }

        if (empty($data['description'])) {
            $errors['description'] = 'Description is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $existing = (new CarePlanReasonCode())->where('code', $data['code'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['code'] = 'A care plan reason code with this code already exists.';
        }

        return $errors;
    }
}
