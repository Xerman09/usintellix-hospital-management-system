<?php

namespace App\Modules\X12Partners\Services;

use App\Core\Database;
use App\Modules\X12Partners\Models\X12Partner;
use PDO;
use PDOException;
use Throwable;

class X12PartnerService
{
    /**
     * List all active (non-deleted) X12 partners.
     */
    public function list(): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT id, name, partner_id, description, created_at, updated_at
             FROM x12_partners
             WHERE deleted_at IS NULL
             ORDER BY name"
        );

        $stmt->execute();

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new X12 partner (admin-only).
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
            $partnerId = (new X12Partner())->create([
                'name'        => $data['name'],
                'partner_id'  => $data['partner_id'],
                'description' => $data['description'] ?? null,
                'created_at'  => date('Y-m-d H:i:s'),
                'created_by'  => $createdBy
            ]);

            if (!$partnerId) {
                throw new \RuntimeException('Failed to create X12 partner record.');
            }

            return [
                'success' => true,
                'message' => 'X12 partner created successfully.',
                'data' => [
                    'x12_partner_id' => $partnerId
                ]
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['partner_id' => 'An X12 partner with this partner ID already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to create X12 partner.'
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create X12 partner.'
            ];
        }
    }

    /**
     * Update an existing X12 partner (admin-only).
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $partner = (new X12Partner())->where('id', $id)->first();

        if (!$partner || $partner['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'X12 partner not found.'
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
            $updated = (new X12Partner())->update([
                'name'        => $data['name'],
                'partner_id'  => $data['partner_id'],
                'description' => $data['description'] ?? null,
                'updated_at'  => date('Y-m-d H:i:s'),
                'updated_by'  => $updatedBy
            ], $id);

            if (!$updated) {
                return [
                    'success' => false,
                    'message' => 'Failed to update X12 partner.'
                ];
            }

            return [
                'success' => true,
                'message' => 'X12 partner updated successfully.'
            ];
        } catch (PDOException $e) {
            if ((int) $e->getCode() === 23000 || str_contains($e->getMessage(), 'Duplicate entry')) {
                return [
                    'success' => false,
                    'message' => 'Validation failed.',
                    'errors' => ['partner_id' => 'An X12 partner with this partner ID already exists.']
                ];
            }

            return [
                'success' => false,
                'message' => 'Failed to update X12 partner.'
            ];
        }
    }

    /**
     * Soft-delete an X12 partner (admin-only).
     */
    public function remove(int $id, int $deletedBy): array
    {
        $partner = (new X12Partner())->where('id', $id)->first();

        if (!$partner || $partner['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'X12 partner not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE x12_partners
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
            'message' => 'X12 partner deleted successfully.'
        ];
    }

    /**
     * Validate X12 partner input.
     */
    private function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        if (empty($data['name'])) {
            $errors['name'] = 'Name is required.';
        }

        if (empty($data['partner_id'])) {
            $errors['partner_id'] = 'Partner ID is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $existing = (new X12Partner())->where('partner_id', $data['partner_id'])->first();

        if ($existing && $existing['deleted_at'] === null && (int) $existing['id'] !== (int) $ignoreId) {
            $errors['partner_id'] = 'An X12 partner with this partner ID already exists.';
        }

        return $errors;
    }
}
