<?php

namespace App\Modules\Auth\Services;

use App\Core\Session;
use App\Modules\Employees\Models\Employee;
use App\Modules\Patients\Models\Patient;
use App\Modules\Roles\Models\Role;
use App\Modules\Users\Models\User;

class AuthService
{
    /**
     * Authenticate a user.
     */
    public function login(string $username, string $password): array
    {
        // Basic validation
        $errors = [];

        if (empty($username)) {
            $errors['username'] = 'Username is required.';
        }

        if (empty($password)) {
            $errors['password'] = 'Password is required.';
        }

        if (!empty($errors)) {
            return [
                'success' => false,
                'message' => 'Please fill in all required fields.',
                'errors' => $errors
            ];
        }

        // Username/password failures are kept as one generic error
        // (not split per field) to avoid leaking which usernames exist.
        $user = (new User())
            ->where('username', $username)
            ->first();

        if (!$user || !password_verify($password, $user['password'])) {
            return [
                'success' => false,
                'message' => 'Invalid username or password.',
                'errors' => [
                    'username' => 'Invalid username or password.',
                    'password' => 'Invalid username or password.'
                ]
            ];
        }

        // Regenerate session ID
        Session::regenerate();

        $employee = (new Employee())->where('user_id', $user['id'])->first();
        $resolvedRole = $this->resolveRole($user, $employee);
        $name = $this->resolveName($user, $employee);

        // Store logged-in user
        Session::put('user', [
            'id'         => $user['id'],
            'username'   => $user['username'],
            'role'       => $resolvedRole,
            'first_name' => $name['first_name'],
            'last_name'  => $name['last_name']
        ]);

        return [
            'success' => true,
            'message' => 'Login successful.',
            'data' => [
                'user' => Session::get('user')
            ]
        ];
    }

    /**
     * Logout the current user.
     */
    public function logout(): void
    {
        Session::destroy();
    }

    private function resolveRole(array $user, ?array $employee): string
    {
        if (!$employee || empty($user['role_id'])) {
            return 'patient';
        }

        $role = (new Role())
            ->where('id', $user['role_id'])
            ->first();

        if (!$role) {
            return 'patient';
        }

        return strtolower((string) $role['name']);
    }

    /**
     * Resolve the logged-in user's display name from their employee
     * record, falling back to their patient record.
     */
    private function resolveName(array $user, ?array $employee): array
    {
        if ($employee) {
            return [
                'first_name' => $employee['first_name'],
                'last_name'  => $employee['last_name']
            ];
        }

        $patient = (new Patient())->where('user_id', $user['id'])->first();

        if ($patient) {
            return [
                'first_name' => $patient['first_name'],
                'last_name'  => $patient['last_name']
            ];
        }

        return [
            'first_name' => null,
            'last_name'  => null
        ];
    }
}
