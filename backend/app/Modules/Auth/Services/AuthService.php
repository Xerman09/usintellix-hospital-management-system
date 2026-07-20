<?php

namespace App\Modules\Auth\Services;

use App\Core\Session;
use App\Modules\Users\Models\User;

class AuthService
{
    /**
     * Authenticate a user.
     */
    public function login(string $username, string $password): array
    {
        // Basic validation
        if (empty($username) || empty($password)) {
            return [
                'success' => false,
                'message' => 'Username and password are required.'
            ];
        }

        // Find user using ORM
        $user = (new User())
            ->where('username', $username)
            ->first();

        if (!$user) {
            return [
                'success' => false,
                'message' => 'Invalid username or password.'
            ];
        }

        // Verify password
        if (!password_verify($password, $user['password'])) {
            return [
                'success' => false,
                'message' => 'Invalid username or password.'
            ];
        }

        // Regenerate session ID
        Session::regenerate();

        // Store logged-in user
        Session::put('user', [
            'id'        => $user['id'],
            'tenant_id' => $user['tenant_id'],
            'username'  => $user['username']
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
}