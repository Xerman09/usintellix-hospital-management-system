<?php

namespace App\Modules\AdministrationSites\Services;

use App\Core\Database;
use App\Modules\AdministrationSites\Models\AdministrationSite;
use PDO;
use Throwable;

class AdministrationSiteService
{
    /**
     * List all active (non-deleted) administration sites.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM administration_sites
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new administration site (admin-only).
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
            $siteId = (new AdministrationSite())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$siteId) {
                throw new \RuntimeException('Failed to create administration site record.');
            }

            return [
                'success' => true,
                'message' => 'Administration site created successfully.',
                'data' => [
                    'administration_site_id' => $siteId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create administration site.'
            ];
        }
    }

    /**
     * Update an existing administration site (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $site = (new AdministrationSite())->where('id', $id)->first();

        if (!$site || $site['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Administration site not found.'
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

        $updated = (new AdministrationSite())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update administration site.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Administration site updated successfully.'
        ];
    }

    /**
     * Soft-delete an administration site (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $site = (new AdministrationSite())->where('id', $id)->first();

        if (!$site || $site['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Administration site not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE administration_sites
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
            'message' => 'Administration site deleted successfully.'
        ];
    }

    /**
     * Validate administration site input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new AdministrationSite())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'An administration site with this name already exists.';
        }

        return $errors;
    }
}
