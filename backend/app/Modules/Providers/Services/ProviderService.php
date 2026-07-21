<?php

namespace App\Modules\Providers\Services;

use App\Core\Database;
use App\Modules\Employees\Models\Employee;
use App\Modules\Providers\Models\Provider;
use App\Modules\Roles\Models\Role;
use App\Modules\Users\Models\User;
use PDO;
use Throwable;

class ProviderService
{
    /**
     * List all active (non-deleted) providers for a tenant, with their employee identity.
     */
    public function list(int $tenantId): array
    {
        $stmt = Database::connection()->prepare(
            "SELECT p.id, p.employee_id, p.specialty, p.npi_number, p.license_number, p.dea_number,
                    p.created_at, p.deleted_at,
                    e.first_name, e.middle_name, e.last_name, e.suffix, e.email, e.phone,
                    d.name AS department_name
             FROM providers p
             JOIN employees e ON e.id = p.employee_id
             LEFT JOIN departments d ON d.id = e.department_id
             WHERE p.tenant_id = :tenant_id AND p.deleted_at IS NULL
             ORDER BY e.last_name, e.first_name"
        );

        $stmt->execute(['tenant_id' => $tenantId]);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new provider from an existing employee (admin-only).
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
                'employee_id'    => (int) $data['employee_id'],
                'specialty'      => $data['specialty'],
                'npi_number'     => $data['npi_number'] ?? null,
                'license_number' => $data['license_number'] ?? null,
                'dea_number'     => $data['dea_number'] ?? null,
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

        if (empty($data['employee_id'])) {
            $errors['employee_id'] = 'Employee is required.';
        }

        if (empty($data['specialty'])) {
            $errors['specialty'] = 'Specialty is required.';
        }

        if (!empty($errors)) {
            return $errors;
        }

        $employee = (new Employee())
            ->where('id', (int) $data['employee_id'])
            ->where('tenant_id', $tenantId)
            ->first();

        if (!$employee || $employee['deleted_at'] !== null) {
            $errors['employee_id'] = 'Selected employee does not exist.';
            return $errors;
        }

        $user = (new User())->find((int) $employee['user_id']);
        $role = ($user && !empty($user['role_id'])) ? (new Role())->find((int) $user['role_id']) : null;

        if (!$role || strtolower((string) $role['name']) !== 'doctor') {
            $errors['employee_id'] = 'Selected employee does not have the doctor role.';
            return $errors;
        }

        if ((new Provider())->where('employee_id', (int) $data['employee_id'])->first()) {
            $errors['employee_id'] = 'This employee is already registered as a provider.';
        }

        if (!empty($data['npi_number']) && (new Provider())->where('tenant_id', $tenantId)->where('npi_number', $data['npi_number'])->first()) {
            $errors['npi_number'] = 'NPI number is already registered.';
        }

        return $errors;
    }
}
