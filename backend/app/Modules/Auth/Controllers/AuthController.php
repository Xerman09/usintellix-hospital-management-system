<?php

namespace App\Modules\Auth\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Auth\Services\AuthService;

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
            $this->error($result['message'], 401, $result['errors'] ?? null);
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
}