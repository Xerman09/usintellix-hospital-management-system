<?php

namespace App\Modules\Facilities\Services;

use App\Core\Database;
use App\Modules\Facilities\Models\Facility;
use PDO;
use PDOException;
use Throwable;

class FacilityService
{
    /**
     * List all active (non-deleted) facilities.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, location, created_at, updated_at
             FROM facilities
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new facility (admin-only).
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
            $facilityId = (new Facility())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'location'    => $data['location'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$facilityId) {
                throw new \RuntimeException('Failed to create facility record.');
            }

            return [
                'success' => true,
                'message' => 'Facility created successfully.',
                'data' => [
                    'facility_id' => $facilityId
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A facility with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create facility.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create facility.'
            ];
        }
    }

    /**
     * Update an existing facility (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $facility = (new Facility())->where('id', $id)->first();

        if (!$facility || $facility['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Facility not found.'
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
            $updated = (new Facility())->update([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'location'    => $data['location'] ?? null,
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update facility.'
                ];
            }

            return [
                'success' => true,
                'message' => 'Facility updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['name' => 'A facility with this name already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update facility.'
            ];
        }
    }

    /**
     * Soft-delete a facility (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $facility = (new Facility())->where('id', $id)->first();

        if (!$facility || $facility['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Facility not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE facilities
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
            'message' => 'Facility deleted successfully.'
        ];
    }

    /**
     * Validate facility input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new Facility())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A facility with this name already exists.';
        }

        return $errors;
    }
}
