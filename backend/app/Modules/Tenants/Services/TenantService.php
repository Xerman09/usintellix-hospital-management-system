<?php

namespace App\Modules\Tenants\Services;

use App\Core\Database;
use App\Modules\Departments\Models\Department;
use App\Modules\Employees\Models\Employee;
use App\Modules\Roles\Models\Role;
use App\Modules\Tenants\Models\Tenant;
use App\Modules\Users\Models\User;
use Throwable;

class TenantService
{
    /**
     * Register a new company (tenant) along with its first admin account.
     */
    public function register(array $data): array
    {
        $errors = $this->validate($data);

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Validation failed.',
                'errors' => $errors
            ];
        }

        $db = Database::connection();
        $db->beginTransaction();

        try {
            $tenantId = (new Tenant())->create([
                'subdomain'  => strtolower($data['subdomain']),
                'name'       => $data['company_name'],
                'email'      => $data['company_email'],
                'phone'      => $data['company_phone'],
                'created_at' => date('Y-m-d H:i:s')
            ]);

            if (!$tenantId) {
                throw new \RuntimeException('Failed to create tenant.');
            }

            $roleId = $this->findOrCreateAdminRole();

            $departmentId = (new Department())->create([
                'tenant_id'  => $tenantId,
                'name'       => 'Administration',
                'created_at' => date('Y-m-d H:i:s')
            ]);

            if (!$departmentId) {
                throw new \RuntimeException('Failed to create default department.');
            }

            $userId = (new User())->create([
                'tenant_id'  => $tenantId,
                'username'   => $data['username'],
                'password'   => User::hashPassword($data['password']),
                'role_id'    => $roleId,
                'created_at' => date('Y-m-d H:i:s')
            ]);

            if (!$userId) {
                throw new \RuntimeException('Failed to create admin account.');
            }

            $employeeId = (new Employee())->create([
                'tenant_id'     => $tenantId,
                'user_id'       => $userId,
                'employee_no'   => 'EMP-000001',
                'first_name'    => $data['first_name'],
                'middle_name'   => $data['middle_name'] ?? null,
                'last_name'     => $data['last_name'],
                'suffix'        => $data['suffix'] ?? null,
                'sex'           => $data['sex'],
                'birthdate'     => $data['birthdate'],
                'email'         => $data['email'],
                'phone'         => $data['phone'],
                'department_id' => $departmentId,
                'created_at'    => date('Y-m-d H:i:s')
            ]);

            if (!$employeeId) {
                throw new \RuntimeException('Failed to create admin employee record.');
            }

            $db->commit();

            return [
                'success' => true,
                'message' => 'Company registered successfully.',
                'data' => [
                    'tenant_id'   => $tenantId,
                    'user_id'     => $userId,
                    'employee_id' => $employeeId
                ]
            ];
        } catch (Throwable $e) {
            $db->rollBack();

            return [
                'success' => false,
                'message' => 'Failed to register company.'
            ];
        }
    }

    /**
     * Validate registration input.
     */
    private function validate(array $data): array
    {
        $errors = [];

        $required = [
            'subdomain', 'company_name', 'company_email', 'company_phone',
            'username', 'password', 'first_name', 'last_name',
            'sex', 'birthdate', 'email', 'phone'
        ];

        foreach ($required as $field) {
            if (empty($data[$field])) {
                $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
            }
        }

        if (!empty($errors)) {
            return $errors;
        }

        if (!preg_match('/^[a-z0-9-]+$/', strtolower($data['subdomain']))) {
            $errors['subdomain'] = 'Subdomain may only contain letters, numbers, and hyphens.';
        }

        if (!in_array($data['sex'], ['male', 'female'], true)) {
            $errors['sex'] = 'Sex must be male or female.';
        }

        if ((new Tenant())->where('subdomain', strtolower($data['subdomain']))->first()) {
            $errors['subdomain'] = 'Subdomain is already taken.';
        }

        if ((new Tenant())->where('email', $data['company_email'])->first()) {
            $errors['company_email'] = 'Company email is already registered.';
        }

        return $errors;
    }

    /**
     * Find the global admin role, creating it if it doesn't exist yet.
     */
    private function findOrCreateAdminRole(): int
    {
        $role = (new Role())->where('name', 'admin')->first();

        if ($role) {
            return (int) $role['id'];
        }

        return (int) (new Role())->create([
            'name'       => 'admin',
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }
}
