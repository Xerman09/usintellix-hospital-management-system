<?php

namespace App\Modules\Employees\Services;

use App\Core\Database;
use App\Modules\Departments\Models\Department;
use App\Modules\Employees\Models\Employee;
use App\Modules\Roles\Models\Role;
use App\Modules\Users\Models\User;
use Throwable;

class EmployeeService
{
    /**
     * Register a new employee account (admin-only).
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

        $db = Database::connection();
        $db->beginTransaction();

        try {
            $userId = (new User())->create([
                'tenant_id'  => $tenantId,
                'username'   => $data['username'],
                'password'   => User::hashPassword($data['password']),
                'role_id'    => $data['role_id'],
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $createdBy
            ]);

            if (!$userId) {
                throw new \RuntimeException('Failed to create user account.');
            }

            $employeeNo = $this->generateEmployeeNo($tenantId);

            $employeeId = (new Employee())->create([
                'tenant_id'     => $tenantId,
                'user_id'       => $userId,
                'employee_no'   => $employeeNo,
                'first_name'    => $data['first_name'],
                'middle_name'   => $data['middle_name'] ?? null,
                'last_name'     => $data['last_name'],
                'suffix'        => $data['suffix'] ?? null,
                'sex'           => $data['sex'],
                'birthdate'     => $data['birthdate'],
                'email'         => $data['email'],
                'phone'         => $data['phone'],
                'department_id' => $data['department_id'],
                'created_at'    => date('Y-m-d H:i:s'),
                'created_by'    => $createdBy
            ]);

            if (!$employeeId) {
                throw new \RuntimeException('Failed to create employee record.');
            }

            $db->commit();

            return [
                'success' => true,
                'message' => 'Employee account created successfully.',
                'data' => [
                    'user_id'     => $userId,
                    'employee_id' => $employeeId,
                    'employee_no' => $employeeNo
                ]
            ];
        } catch (Throwable $e) {
            $db->rollBack();

            return [
                'success' => false,
                'message' => 'Failed to register employee.'
            ];
        }
    }

    /**
     * Validate registration input.
     */
    private function validate(array $data, int $tenantId): array
    {
        $errors = [];

        $required = [
            'username', 'password', 'role_id', 'first_name', 'last_name',
            'sex', 'birthdate', 'email', 'phone', 'department_id'
        ];

        foreach ($required as $field) {
            if (empty($data[$field])) {
                $errors[$field] = ucfirst(str_replace('_', ' ', $field)) . ' is required.';
            }
        }

        if (!empty($errors)) {
            return $errors;
        }

        if (!in_array($data['sex'], ['male', 'female'], true)) {
            $errors['sex'] = 'Sex must be male or female.';
        }

        if ((new User())->where('tenant_id', $tenantId)->where('username', $data['username'])->first()) {
            $errors['username'] = 'Username is already taken.';
        }

        if ((new Employee())->where('tenant_id', $tenantId)->where('email', $data['email'])->first()) {
            $errors['email'] = 'Email is already registered.';
        }

        if ((new Employee())->where('tenant_id', $tenantId)->where('phone', $data['phone'])->first()) {
            $errors['phone'] = 'Phone number is already registered.';
        }

        if (!(new Role())->find((int) $data['role_id'])) {
            $errors['role_id'] = 'Selected role does not exist.';
        }

        if (!(new Department())->find((int) $data['department_id'])) {
            $errors['department_id'] = 'Selected department does not exist.';
        }

        return $errors;
    }

    /**
     * Generate a tenant-scoped sequential employee number.
     */
    private function generateEmployeeNo(int $tenantId): string
    {
        $count = count((new Employee())->where('tenant_id', $tenantId)->get());

        return 'EMP-' . str_pad((string) ($count + 1), 6, '0', STR_PAD_LEFT);
    }
}
