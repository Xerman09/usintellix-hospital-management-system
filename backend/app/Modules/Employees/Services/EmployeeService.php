<?php

namespace App\Modules\Employees\Services;

use App\Core\Database;
use App\Modules\Departments\Models\Department;
use App\Modules\Employees\Models\Employee;
use App\Modules\Roles\Models\Role;
use App\Modules\Users\Models\User;
use PDO;
use Throwable;

class EmployeeService
{
    /**
     * List active (non-deleted) employees, optionally filtered by role name.
     */
    public function list(?string $role = null): array
    {
        $sql = "SELECT e.*, r.name AS role_name, d.name AS department_name
                FROM employees e
                JOIN users u ON u.id = e.user_id
                JOIN roles r ON r.id = u.role_id
                LEFT JOIN departments d ON d.id = e.department_id
                WHERE e.deleted_at IS NULL";

        $params = [];

        if ($role !== null) {
            $sql .= " AND r.name = :role";
            $params['role'] = $role;
        }

        $sql .= " ORDER BY e.last_name, e.first_name";

        $stmt = Database::connection()->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Register a new employee account (admin-only).
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

        $db = Database::connection();
        $db->beginTransaction();

        try {
            $userId = (new User())->create([
                'username'   => $data['username'],
                'password'   => User::hashPassword($data['password']),
                'role_id'    => $data['role_id'],
                'created_at' => date('Y-m-d H:i:s'),
                'created_by' => $createdBy
            ]);

            if (!$userId) {
                throw new \RuntimeException('Failed to create user account.');
            }

            $employeeNo = $this->generateEmployeeNo();

            $employeeId = (new Employee())->create([
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
    private function validate(array $data): array
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

        if (strtotime($data['birthdate']) === false) {
            $errors['birthdate'] = 'Birthdate is not a valid date.';
        } elseif ($data['birthdate'] > date('Y-m-d')) {
            $errors['birthdate'] = 'Birthdate cannot be in the future.';
        }

        if ((new User())->where('username', $data['username'])->first()) {
            $errors['username'] = 'Username is already taken.';
        }

        if ((new Employee())->where('email', $data['email'])->first()) {
            $errors['email'] = 'Email is already registered.';
        }

        if ((new Employee())->where('phone', $data['phone'])->first()) {
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
     * Generate a sequential employee number.
     */
    private function generateEmployeeNo(): string
    {
        $count = count((new Employee())->get());

        return 'EMP-' . str_pad((string) ($count + 1), 6, '0', STR_PAD_LEFT);
    }
}
