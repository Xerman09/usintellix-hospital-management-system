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
        $sql = "SELECT e.*, u.username, u.role_id, r.name AS role_name, d.name AS department_name
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
     * Update an existing employee account and record (admin-only).
     *
     * Password is optional here -- an empty value leaves the current
     * password untouched, since re-entering it on every edit would be
     * an unreasonable ask.
     */
    public function update(int $id, array $data, int $updatedBy): array
    {
        $employee = (new Employee())->where('id', $id)->first();

        if (!$employee || $employee['deleted_at'] !== null) {
            return [
                'success' => false,
                'message' => 'Employee not found.'
            ];
        }

        $errors = $this->validate($data, $id, (int) $employee['user_id']);

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
            $userUpdate = [
                'username'   => $data['username'],
                'role_id'    => $data['role_id'],
                'updated_at' => date('Y-m-d H:i:s'),
                'updated_by' => $updatedBy
            ];

            if (!empty($data['password'])) {
                $userUpdate['password'] = User::hashPassword($data['password']);
            }

            (new User())->update($userUpdate, (int) $employee['user_id']);

            (new Employee())->update([
                'first_name'    => $data['first_name'],
                'middle_name'   => $data['middle_name'] ?? null,
                'last_name'     => $data['last_name'],
                'suffix'        => $data['suffix'] ?? null,
                'sex'           => $data['sex'],
                'birthdate'     => $data['birthdate'],
                'email'         => $data['email'],
                'phone'         => $data['phone'],
                'department_id' => $data['department_id'],
                'updated_at'    => date('Y-m-d H:i:s'),
                'updated_by'    => $updatedBy
            ], $id);

            $db->commit();

            return [
                'success' => true,
                'message' => 'Employee updated successfully.'
            ];
        } catch (Throwable $e) {
            $db->rollBack();

            return [
                'success' => false,
                'message' => 'Failed to update employee.'
            ];
        }
    }

    /**
     * Validate registration/update input. When $ignoreEmployeeId is set
     * (an update) the password is optional and uniqueness checks skip
     * the record's own user/employee row.
     */
    private function validate(array $data, ?int $ignoreEmployeeId = null, ?int $ignoreUserId = null): array
    {
        $errors = [];

        $required = [
            'username', 'role_id', 'first_name', 'last_name',
            'sex', 'birthdate', 'email', 'phone', 'department_id'
        ];

        if ($ignoreEmployeeId === null) {
            $required[] = 'password';
        }

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

        $existingUser = (new User())->where('username', $data['username'])->first();

        if ($existingUser && (int) $existingUser['id'] !== (int) $ignoreUserId) {
            $errors['username'] = 'Username is already taken.';
        }

        $existingEmail = (new Employee())->where('email', $data['email'])->first();

        if ($existingEmail && (int) $existingEmail['id'] !== (int) $ignoreEmployeeId) {
            $errors['email'] = 'Email is already registered.';
        }

        $existingPhone = (new Employee())->where('phone', $data['phone'])->first();

        if ($existingPhone && (int) $existingPhone['id'] !== (int) $ignoreEmployeeId) {
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
