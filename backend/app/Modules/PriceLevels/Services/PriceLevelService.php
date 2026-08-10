<?php

namespace App\Modules\PriceLevels\Services;

use App\Core\Database;
use App\Modules\PriceLevels\Models\PriceLevel;
use PDO;
use Throwable;

class PriceLevelService
{
    /**
     * List all active (non-deleted) price levels.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM price_levels
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new price level (admin-only).
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
            $levelId = (new PriceLevel())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$levelId) {
                throw new \RuntimeException('Failed to create price level record.');
            }

            return [
                'success' => true,
                'message' => 'Price level created successfully.',
                'data' => [
                    'price_level_id' => $levelId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create price level.'
            ];
        }
    }

    /**
     * Update an existing price level (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $level = (new PriceLevel())->where('id', $id)->first();

        if (!$level || $level['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Price level not found.'
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

        $updated = (new PriceLevel())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update price level.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Price level updated successfully.'
        ];
    }

    /**
     * Soft-delete a price level (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $level = (new PriceLevel())->where('id', $id)->first();

        if (!$level || $level['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Price level not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE price_levels
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
            'message' => 'Price level deleted successfully.'
        ];
    }

    /**
     * Validate price level input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new PriceLevel())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A price level with this name already exists.';
        }

        return $errors;
    }
}
