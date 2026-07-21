<?php

namespace App\Modules\Providers\Services;

use App\Core\Database;
use App\Modules\Departments\Models\Department;
use App\Modules\Providers\Models\Provider;
use PDO;
use Throwable;

class ProviderService
{
    /**
     * List all active (non-deleted) providers for a tenant.
     */
    public function list(int $tenantId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT * FROM providers
             WHERE tenant_id = :tenant_id AND deleted_at IS NULL
             ORDER BY last_name, first_name"
        );

        $stmt->execute(['tenant_id' => $tenantId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new provider (admin-only).
     */
    public function register(array $data, int $tenantId, int $createdBy): array
    {
        $errors = $this->validate($data, $tenantId);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        try {
            $providerId = (new Provider())->create([
                'tenant_id'      => $tenantId,
                'title'          => $data['title'] ?? null,
                'first_name'     => $data['first_name'],
                'middle_name'    => $data['middle_name'] ?? null,
                'last_name'      => $data['last_name'],
                'suffix'         => $data['suffix'] ?? null,
                'specialty'      => $data['specialty'],
                'npi_number'     => $data['npi_number'] ?? null,
                'license_number' => $data['license_number'] ?? null,
                'dea_number'     => $data['dea_number'] ?? null,
                'email'          => $data['email'],
                'phone'          => $data['phone'],
                'department_id'  => $data['department_id'],
                'status'         => $data['status'] ?? 'active',
                'created_at'     => date('Y-m-d H:i:s'),
                'created_by'     => $createdBy
            ]);

            if (!$providerId) {
                throw new \RuntimeException('Failed to create provider record.');
            }

            return [
                'success' => true,
                'message' => 'Provider created successfully.',
                'data' => [
                    'provider_id' => $providerId
                ]
            ];
        } catch (Throwable $e) {
            return [
                'success' => false,
                'message' => 'Failed to create provider.'
            ];
        }
    }

    /**
     * Soft-delete a provider (admin-only).
     */
    public function remove(int $id, int $tenantId, int $deletedBy): array
    {
        $provider = (new Provider())
            ->where('id', $id)
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$provider || $provider['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Provider not found.'
            ];
        }

        $stmt = Database::connection()->prepare(
            "UPDATE providers
             SET deleted_at = :deleted_at, deleted_by = :deleted_by
             WHERE id = :id AND tenant_id = :tenant_id"
        );

        $stmt->execute([
            'deleted_at' => date('Y-m-d H:i:s'),
            'deleted_by' => $deletedBy,
            'id'         => $id,
            'tenant_id'  => $tenantId
        ]);

        return [
            'success' => true,
            'message' => 'Provider deleted successfully.'
        ];
    }

    /**
     * Validate provider input.
     */
    private function validate(array $data, int $tenantId): array
    {
        $errors = [];

        $required = ['first_name', 'last_name', 'specialty', 'email', 'phone', 'department_id'];

        foreach ($required as $field) {
            if (empty($data[$field])) {
                $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
            }
        }

        if (!empty($errors)) {
            return $errors;
        }

        if ((new Provider())->where('tenant_id', $tenantId)->where('email', $data['email'])->first()) {
            $errors['email'] = 'Email is already registered.';
        }

        if (!empty($data['npi_number']) && (new Provider())->where('tenant_id', $tenantId)->where('npi_number', $data['npi_number'])->first()) {
            $errors['npi_number'] = 'NPI number is already registered.';
        }

        if (!(new Department())->find((int) $data['department_id'])) {
            $errors['department_id'] = 'Selected department does not exist.';
        }

        return $errors;
    }
}
