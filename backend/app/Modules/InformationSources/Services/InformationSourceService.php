<?php

namespace App\Modules\InformationSources\Services;

use App\Core\Database;
use App\Modules\InformationSources\Models\InformationSource;
use PDO;
use Throwable;

class InformationSourceService
{
    /**
     * List all active (non-deleted) information sources.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM information_sources
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new information source (admin-only).
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
            $sourceId = (new InformationSource())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$sourceId) {
                throw new \RuntimeException('Failed to create information source record.');
            }

            return [
                'success' => true,
                'message' => 'Information source created successfully.',
                'data' => [
                    'information_source_id' => $sourceId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create information source.'
            ];
        }
    }

    /**
     * Update an existing information source (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $source = (new InformationSource())->where('id', $id)->first();

        if (!$source || $source['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Information source not found.'
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

        $updated = (new InformationSource())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update information source.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Information source updated successfully.'
        ];
    }

    /**
     * Soft-delete an information source (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $source = (new InformationSource())->where('id', $id)->first();

        if (!$source || $source['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Information source not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE information_sources
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
            'message' => 'Information source deleted successfully.'
        ];
    }

    /**
     * Validate information source input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new InformationSource())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'An information source with this name already exists.';
        }

        return $errors;
    }
}
