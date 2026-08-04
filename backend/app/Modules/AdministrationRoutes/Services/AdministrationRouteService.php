<?php

namespace App\Modules\AdministrationRoutes\Services;

use App\Core\Database;
use App\Modules\AdministrationRoutes\Models\AdministrationRoute;
use PDO;
use Throwable;

class AdministrationRouteService
{
    /**
     * List all active (non-deleted) administration routes.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM administration_routes
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new administration route (admin-only).
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
            $routeId = (new AdministrationRoute())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$routeId) {
                throw new \RuntimeException('Failed to create administration route record.');
            }

            return [
                'success' => true,
                'message' => 'Administration route created successfully.',
                'data' => [
                    'administration_route_id' => $routeId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create administration route.'
            ];
        }
    }

    /**
     * Update an existing administration route (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $route = (new AdministrationRoute())->where('id', $id)->first();

        if (!$route || $route['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Administration route not found.'
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

        $updated = (new AdministrationRoute())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update administration route.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Administration route updated successfully.'
        ];
    }

    /**
     * Soft-delete an administration route (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $route = (new AdministrationRoute())->where('id', $id)->first();

        if (!$route || $route['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Administration route not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE administration_routes
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
            'message' => 'Administration route deleted successfully.'
        ];
    }

    /**
     * Validate administration route input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new AdministrationRoute())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'An administration route with this name already exists.';
        }

        return $errors;
    }
}
