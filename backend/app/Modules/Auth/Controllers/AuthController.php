<?php

namespace App\Modules\Auth\Controllers;

use App\Core\Controller;
use App\Core\Request;
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

        $subdomain = trim($request->input('subdomain', ''));
        $username = trim($request->input('username', ''));
        $password = $request->input('password', '');

        $result = $this->authService->login($subdomain, $username, $password);

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
}