<?php

namespace App\Modules\Auth\Controllers;

use App\Core\Controller;
use App\Core\Request;
use App\Core\Session;
use App\Modules\Auth\Services\AuthService;
use App\Modules\Auth\Services\PasswordResetService;
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

            if (!empty($result['password_breached'])) {
                $payload['password_breached'] = true;
                $payload['user_id']           = $result['user_id'] ?? null;
                $payload['username']          = $result['username'] ?? $username;
                $payload['breach_count']      = $result['breach_count'] ?? 1;
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
     * Issue a new 2FA code for the pending login.
     */
    public function resendTwoFactor(): void
    {
        $result = $this->authService->resendTwoFactor();

        if (!$result['success']) {
            $this->error($result['message'], 429, $result['errors'] ?? null);
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
     * Return the currently authenticated user with fresh database-resolved role and profile.
     */
    public function me(): void
    {
        $sessionUser = Session::get('user');

        if (!$sessionUser || empty($sessionUser['id'])) {
            $this->error('Unauthenticated.', 401);
            return;
        }

        $freshUser = $this->authService->getCurrentUser((int) $sessionUser['id']);

        if (!$freshUser) {
            Session::destroy();
            $this->error('User account not found.', 401);
            return;
        }

        Session::put('user', $freshUser);
        $this->success(['user' => $freshUser], 'Current user session verified.');
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

        // updateExpiredPassword() returns grantSession()'s shape, so the granted
        // user is at data.user -- not at the top level.
        $grantedUser = $result['data']['user'] ?? null;

        $this->success([
            'user' => $grantedUser,
            'role' => $grantedUser['role'] ?? null
        ], 'Password successfully updated. You are now logged in.');
    }

    /**
     * Update a compromised/breached password and complete login (HIPAA § 164.308 & NIST SP 800-63B).
     */
    public function updateBreachedPassword(): void
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

        $result = $this->authService->updateBreachedPassword(
            $userId,
            (string) $request->input('current_password', ''),
            (string) $request->input('new_password', ''),
            (string) $request->input('confirm_password', '')
        );

        if (!$result['success']) {
            $this->error($result['message'], 422, $result['errors'] ?? null);
            return;
        }

        // Same as updateExpiredPassword: the granted user is at data.user.
        $grantedUser = $result['data']['user'] ?? null;

        $this->success([
            'user' => $grantedUser,
            'role' => $grantedUser['role'] ?? null
        ], 'Compromised password successfully updated. You are now logged in.');
    }

    /**
     * Real-time password breach evaluation endpoint (k-Anonymity & local lists).
     */
    public function checkPasswordBreach(): void
    {
        $request = new Request();
        $password = (string) $request->input('password', '');

        if ($password === '') {
            $this->success([
                'breached' => false,
                'count'    => 0,
                'message'  => 'No password provided.'
            ]);
            return;
        }

        $result = \App\Core\PasswordSecurity::checkBreached($password);
        $this->success($result);
    }

    /**
     * Acknowledge Notice of Privacy Practices (HIPAA § 164.520).
     */
    public function acknowledgeNpp(): void
    {
        $user = Session::get('user');
        if (!$user || empty($user['id'])) {
            $this->error('Unauthorized', 401);
            return;
        }

        $request = new Request();
        $signatureData = trim((string) $request->input('signature_data', ''));
        $signatureType = trim((string) $request->input('signature_type', 'electronic'));
        $nppVersion = trim((string) $request->input('npp_version', '2026-09'));

        $result = $this->authService->acknowledgeNpp((int) $user['id'], [
            'signature_data' => $signatureData,
            'signature_type' => $signatureType,
            'npp_version'    => $nppVersion,
        ]);

        if (!$result['success']) {
            $this->error($result['message'], 422);
            return;
        }

        $this->success($result['data'], $result['message']);
    }

    // ---------------------------------------------------------------
    // Forgot Password.
    //
    // All three are unauthenticated, because somebody who could
    // authenticate would not need them. The protection is inside
    // PasswordResetService: rate limits by account and by address,
    // attempt counting on each code, and a reply that is identical
    // whether or not the username is real.
    // ---------------------------------------------------------------

    /**
     * POST /auth/password-reset/request -- send a code.
     *
     * Always answers 200 with the same message. A 404 for an unknown username
     * would turn this into a way of finding out which ones are real.
     */
    public function requestPasswordReset(): void
    {
        $request = new Request();

        $result = PasswordResetService::request(
            (string) $request->input('username', ''),
            $this->callerIp()
        );

        if (empty($result['success'])) {
            $this->json(['success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null], 422);
            return;
        }

        $this->success($result['data'] ?? null, $result['message']);
    }

    /** POST /auth/password-reset/verify -- is this code good? Does not spend it. */
    public function verifyPasswordResetCode(): void
    {
        $request = new Request();

        $result = PasswordResetService::verify(
            (string) $request->input('username', ''),
            (string) $request->input('code', '')
        );

        if (empty($result['success'])) {
            $this->json(['success' => false, 'message' => $result['message']], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /** POST /auth/password-reset/complete -- spend the code and set the password. */
    public function completePasswordReset(): void
    {
        $request = new Request();

        $result = PasswordResetService::reset(
            (string) $request->input('username', ''),
            (string) $request->input('code', ''),
            (string) $request->input('password', '')
        );

        if (empty($result['success'])) {
            $this->json(['success' => false, 'message' => $result['message'], 'errors' => $result['errors'] ?? null], 422);
            return;
        }

        $this->success(null, $result['message']);
    }

    /**
     * The caller's address, for rate limiting.
     *
     * Proxy headers are read only when the deployment says it is behind one,
     * the same rule PortalAudit uses -- otherwise a client can put anything in
     * them and rate limiting by address becomes rate limiting by whatever the
     * attacker last typed.
     */
    private function callerIp(): ?string
    {
        $direct = $_SERVER['REMOTE_ADDR'] ?? null;

        if (empty($_ENV['APP_TRUSTED_PROXY']) && empty($_SERVER['APP_TRUSTED_PROXY'])) {
            return $direct;
        }

        $forwarded = (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? '');

        if ($forwarded === '') {
            return $direct;
        }

        $first = trim(explode(',', $forwarded)[0]);

        return $first !== '' ? $first : $direct;
    }
}
