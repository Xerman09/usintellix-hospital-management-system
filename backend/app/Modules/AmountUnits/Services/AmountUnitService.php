<?php

namespace App\Modules\AmountUnits\Services;

use App\Core\Database;
use App\Modules\AmountUnits\Models\AmountUnit;
use PDO;
use Throwable;

class AmountUnitService
{
    /**
     * List all active (non-deleted) amount units.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM amount_units
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new amount unit (admin-only).
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
            $unitId = (new AmountUnit())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$unitId) {
                throw new \RuntimeException('Failed to create amount unit record.');
            }

            return [
                'success' => true,
                'message' => 'Amount unit created successfully.',
                'data' => [
                    'amount_unit_id' => $unitId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create amount unit.'
            ];
        }
    }

    /**
     * Update an existing amount unit (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $unit = (new AmountUnit())->where('id', $id)->first();

        if (!$unit || $unit['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Amount unit not found.'
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

        $updated = (new AmountUnit())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update amount unit.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Amount unit updated successfully.'
        ];
    }

    /**
     * Soft-delete an amount unit (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $unit = (new AmountUnit())->where('id', $id)->first();

        if (!$unit || $unit['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Amount unit not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE amount_units
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
            'message' => 'Amount unit deleted successfully.'
        ];
    }

    /**
     * Validate amount unit input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new AmountUnit())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'An amount unit with this name already exists.';
        }

        return $errors;
    }
}
