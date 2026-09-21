<?php

namespace App\Modules\Auth\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Users\Models\User;

class AuthController extends Controller
{
    private AuthService $authService;

    public function __construct()
    {
        $this->authService = new AuthService();
    }

    /**
     * Handle user login.
     */
    public function login(): void
    {
        $request = new Request();

        $username = trim($request->input('username', ''));
        $password = $request->input('password', '');

        $result = $this->authService->login($username, $password);

        if (!$result['success']) {
            $payload = [
                'success' => false,
                'message' => $result['message'],
                'errors'  => $result['errors'] ?? null
            ];

            if (!empty($result['locked'])) {
                $payload['locked'] = true;
                $payload['remaining_minutes'] = $result['remaining_minutes'] ?? 30;
            }

            if (!empty($result['password_expired'])) {
                $payload['password_expired'] = true;
                $payload['user_id']          = $result['user_id'] ?? null;
                $payload['username']         = $result['username'] ?? $username;
                $payload['days_old']         = $result['days_old'] ?? 90;
            }

            $this->json($payload, 401);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Verify a Two-Factor Authentication code for a pending login.
     */
    public function verifyTwoFactor(): void
    {
        $request = new Request();

        $code = trim($request->input('code', ''));

        $result = $this->authService->verifyTwoFactor($code);

        if (!$result['success']) {
            $this->error($result['message'], 401, $result['errors'] ?? null);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    /**
     * Handle user logout.
     */
    public function logout(): void
    {
        $this->authService->logout();

        $this->success(null, 'Logged out successfully.');
    }

    /**
     * Complete the logged-in user's forced first-login credential reset.
     */
    public function completeFirstLogin(): void
    {
        $user = Session::get('user');
        $request = new Request();

        $result = $this->authService->completeFirstLogin(
            (int) $user['id'],
            (string) $request->input('current_password', ''),
            (string) $request->input('username', ''),
            (string) $request->input('new_password', ''),
            (string) $request->input('confirm_password', ''),
            (string) $request->input('confirm_email', '')
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $updatedUser = array_merge($user, [
            'username'             => $result['data']['username'],
            'must_change_password' => false
        ]);

        Session::put('user', $updatedUser);

        $this->success(['user' => $updatedUser], $result['message']);
    }

    /**
     * Heartbeat / keepalive ping to maintain session activity.
     */
    public function ping(): void
    {
        $user = Session::get('user');
        $this->success(['active' => true, 'user_id' => $user['id'] ?? null], 'Session alive.');
    }

    /**
     * Update an expired password and complete login (HIPAA § 164.308(a)(5)(ii)(D)).
     */
    public function updateExpiredPassword(): void
    {
        $request = new Request();
        $userId = (int) $request->input('user_id', 0);
        $username = trim((string) $request->input('username', ''));

        if ($userId <= 0 && !empty($username)) {
            $user = (new User())->where('username', $username)->first();
            if ($user) {
                $userId = (int) $user['id'];
            }
        }

        if ($userId <= 0) {
            $sessionUser = Session::get('user');
            if (!empty($sessionUser['id'])) {
                $userId = (int) $sessionUser['id'];
            }
        }

        $result = $this->authService->updateExpiredPassword(
            $userId,
            (string) $request->input('current_password', ''),
            (string) $request->input('new_password', ''),
            (string) $request->input('confirm_password', '')
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        $this->success([
            'user' => $result['user'],
            'role' => $result['role']
        ], 'Password successfully updated. You are now logged in.');
    }
}