<?php

namespace App\Modules\SpecimenSites\Services;

use App\Core\Database;
use App\Modules\SpecimenSites\Models\SpecimenSite;
use PDO;
use Throwable;

class SpecimenSiteService
{
    /**
     * List all active (non-deleted) specimen sites.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, description, created_at, updated_at
             FROM specimen_sites
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new specimen site (admin-only).
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
            $siteId = (new SpecimenSite())->create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$siteId) {
                throw new \RuntimeException('Failed to create specimen site record.');
            }

            return [
                'success' => true,
                'message' => 'Specimen site created successfully.',
                'data' => [
                    'specimen_site_id' => $siteId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create specimen site.'
            ];
        }
    }

    /**
     * Update an existing specimen site (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $site = (new SpecimenSite())->where('id', $id)->first();

        if (!$site || $site['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Specimen site not found.'
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

        $updated = (new SpecimenSite())->update([
            'name'        => $data['name'],
            'description' => $data['description'] ?? null,
            'updated_at'  => date('Y-m-d H:i:s'),
            'updated_by'  => $updatedBy
        ], $id);

        if (!$updated) {
            return [
                'success' => false,
                'message' => 'Failed to update specimen site.'
            ];
        }

        return [
            'success' => true,
            'message' => 'Specimen site updated successfully.'
        ];
    }

    /**
     * Soft-delete a specimen site (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $site = (new SpecimenSite())->where('id', $id)->first();

        if (!$site || $site['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Specimen site not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE specimen_sites
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
            'message' => 'Specimen site deleted successfully.'
        ];
    }

    /**
     * Validate specimen site input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
            return $errors;
        }

        $existing = (new SpecimenSite())->where('name', $data['name'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['name'] = 'A specimen site with this name already exists.';
        }

        return $errors;
    }
}
