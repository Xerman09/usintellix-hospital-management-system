<?php

namespace App\Modules\Auth\Services;

use App\Core\Session;
use App\Modules\Tenants\Models\Tenant;
use App\Modules\Users\Models\User;

class AuthService
{
    /**
     * Authenticate a user scoped to their company (tenant).
     */
    public function login(string $subdomain, string $username, string $password): array
    {
        // Basic validation
        $errors = [];

        if (empty($subdomain)) {
            $errors['subdomain'] = 'Company code is required.';
        }

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

        // Resolve the tenant by subdomain
        $tenant = (new Tenant())
            ->where('subdomain', strtolower($subdomain))
            ->first();

        if (!$tenant) {
            return [
                'success' => false,
                'message' => 'Company not found.',
                'errors' => ['subdomain' => 'Company not found.']
            ];
        }

        // Find user scoped to this tenant. Username/password failures are kept
        // as one generic error (not split per field) to avoid leaking which
        // usernames exist within a known tenant.
        $user = (new User())
            ->where('tenant_id', $tenant['id'])
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

        $resolvedRole = $this->resolveRole($user);

        // Store logged-in user
        Session::put('user', [
            'id'        => $user['id'],
            'tenant_id' => $user['tenant_id'],
            'username'  => $user['username'],
            'role'      => $resolvedRole
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

    private function resolveRole(array $user): string
    {
        $employee = (new \App\Modules\Employees\Models\Employee())
            ->where('user_id', $user['id'])
            ->first();

        if (!$employee || empty($user['role_id'])) {
            return 'patient';
        }

        $role = (new \App\Modules\Roles\Models\Role())
            ->where('id', $user['role_id'])
            ->first();

        if (!$role) {
            return 'patient';
        }

        return strtolower((string) $role['name']);
    }
}