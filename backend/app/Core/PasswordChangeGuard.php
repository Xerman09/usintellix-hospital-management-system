<?php

namespace App\Core;

/**
 * `must_change_password`, enforced on the server.
 *
 * THE HOLE THIS CLOSES. The flag has existed since M0 and was honoured in
 * exactly one place: `frontend/src/modules/auth/auth.js:547`, which shows the
 * forced-change screen after sign-in. `AuthService` authenticated, granted a
 * session and returned it regardless, and nothing in `backend/app/Core/` or
 * either middleware looked at the flag again. So the mobile app, a direct API
 * call, or any client that simply ignores the field got a working session and
 * was never asked to change anything -- across 1,343 routes behind
 * `AuthMiddleware`. A control enforced only by the client that is asked to
 * obey it is not a control.
 *
 * Verified by logging in rather than by reading: see
 * `scratch/probe_must_change_password.php`, which creates a flagged user with
 * a good password, signs in, and watches `AuthMiddleware` wave the session
 * through.
 *
 * THE FLAG COMES FROM THE DATABASE, NOT THE SESSION. The session copy is
 * written at sign-in, so an administrator who sets the flag on a user who is
 * already signed in would otherwise not reach them until they next logged out
 * -- which is the opposite of what forcing a password change is for. The
 * session copy is used only when the database cannot be read, where it is
 * better than nothing.
 *
 * WHAT STAYS OPEN, and why each one has to:
 *
 *   PUT  /profile/password   the change that works for ANYONE. See below.
 *   PUT  /auth/first-login   the forced first-login setup, which is where the
 *                            web client sends a flagged user.
 *   POST /logout             always. Nobody is trapped in a session.
 *   GET  /auth/me            the client has to be able to ask why it is being
 *                            refused, and the answer is in its own user row.
 *   GET  /ping               the heartbeat. Blocking it makes the web UI look
 *                            dead rather than blocked.
 *
 * TWO CHANGE ROUTES, BECAUSE ONE OF THEM DOES NOT WORK FOR STAFF. This was
 * nearly a lockout. `auth.js` sends every flagged user to the first-login
 * screen, which calls `PUT /auth/first-login` -- and
 * `AuthService::completeFirstLogin()` requires the caller to confirm an email
 * address held in `patient_contacts`:
 *
 *     $patient = (new Patient())->where('user_id', $userId)->first();
 *     ...
 *     if (empty($onFileEmail) || strcasecmp(...) !== 0) { return failure; }
 *
 * A nurse has no patient record, so that route can never succeed for one. With
 * only it on the allowlist, an administrator setting the flag on a staff
 * account would have produced an account that could do nothing at all and had
 * no way to fix itself -- strictly worse than the hole this closes. So the
 * authenticated profile change, which verifies the current password and cares
 * nothing about patients, is allowed too. The test suite asserts both halves:
 * that /profile/password clears the flag for a staff user, and that
 * /auth/first-login refuses one.
 *
 * Deliberately NOT open: `/auth/npp-acknowledge`. The web UI takes the
 * password change first and the privacy notice second, so a flagged user has
 * no business acknowledging anything yet.
 *
 * WHAT THIS IS NOT. It is not the breach gate. `docs/TODO.md` § 3.3 said that
 * `AuthService` "lets the login through" when a password matches the breach
 * list, and that a known-compromised password keeps working. That part is
 * wrong: the breach branch returns `success: false` before `grantSession()` is
 * reached, so no session is ever created. The probe above checks that too, and
 * § 3.3 has been corrected. This guard is about the flag only.
 */
class PasswordChangeGuard
{
    /**
     * `METHOD path` pairs reachable while a password change is outstanding.
     *
     * Paths are as `Router::normalize()` produces them: no trailing slash.
     * The test suite asserts every one of these is a real route, because a
     * rename here would silently convert "change your password" into "your
     * account no longer works".
     */
    public const ALLOWED = [
        'PUT /profile/password',
        'PUT /auth/first-login',
        'POST /logout',
        'GET /auth/me',
        'GET /ping',
    ];

    /** The code the client switches on, following the break-glass precedent. */
    public const CODE = 'PASSWORD_CHANGE_REQUIRED';

    /**
     * Is this request one a flagged user may still make?
     */
    public static function allows(string $method, string $path): bool
    {
        $needle = strtoupper(trim($method)) . ' ' . (rtrim(trim($path), '/') ?: '/');

        return in_array($needle, self::ALLOWED, true);
    }

    /**
     * Should this request be refused?
     *
     * Pure decision, no output, so the whole of it is testable. `enforce()`
     * is the half that writes a response and stops.
     *
     * @param array|null $sessionUser The session's copy, used only as a
     *                                fallback when the row cannot be read.
     *
     * @return array{blocked: bool, reason: string, source: string}
     */
    public static function check(int $userId, ?array $sessionUser = null, ?string $method = null, ?string $path = null): array
    {
        $method ??= (string) (Router::$current['method'] ?? '');
        $path ??= (string) (Router::$current['path'] ?? '');

        if ($userId <= 0) {
            return ['blocked' => false, 'reason' => 'no_user', 'source' => 'none'];
        }

        $flagged = null;
        $source = 'database';

        try {
            $stmt = Database::connection()->prepare(
                'SELECT must_change_password FROM users WHERE id = :id AND deleted_at IS NULL LIMIT 1'
            );
            $stmt->execute(['id' => $userId]);
            $value = $stmt->fetchColumn();

            // A missing row is not this guard's business -- AuthMiddleware's
            // own status check deals with deleted and suspended accounts, and
            // answering "must change password" for a user who no longer exists
            // would send a confusing reason for the right refusal.
            $flagged = $value === false ? false : ((int) $value === 1);
        } catch (\Throwable $e) {
            $flagged = null;
        }

        if ($flagged === null) {
            // The database could not be read. The session copy is stale by
            // definition, but a stale 1 is still a reason to refuse, and the
            // alternative is ignoring the flag entirely.
            $flagged = (bool) ($sessionUser['must_change_password'] ?? false);
            $source = 'session_fallback';
        }

        if (!$flagged) {
            return ['blocked' => false, 'reason' => 'not_flagged', 'source' => $source];
        }

        if (self::allows($method, $path)) {
            return ['blocked' => false, 'reason' => 'route_allowed', 'source' => $source];
        }

        return ['blocked' => true, 'reason' => 'password_change_required', 'source' => $source];
    }

    /**
     * Refuse the request, and say so in a way a client can act on.
     *
     * 403 rather than 401 on purpose: a 401 makes the browser client tear down
     * the session and bounce to the sign-in screen, and the one route that can
     * clear this state needs the session to still be there. The distinct
     * `code` is what `frontend/src/core/api.js` switches on, exactly as it
     * already does for break-glass.
     *
     * Audited ONCE per session. A blocked client may poll, and a guard that
     * writes an audit row per refusal is a guard that fills the audit log --
     * which is the table HIPAA § 164.312(b) cares most about keeping readable.
     */
    public static function enforce(int $userId, ?array $sessionUser = null): void
    {
        $verdict = self::check($userId, $sessionUser);

        if (!$verdict['blocked']) {
            return;
        }

        if (!Session::get('_password_gate_audited')) {
            Session::put('_password_gate_audited', true);

            try {
                AuditLogger::log(
                    AuditLogger::CATEGORY_SECURITY,
                    'PASSWORD_CHANGE_ENFORCED',
                    'Access refused for user ID ' . $userId . ': a password change is outstanding '
                    . '(must_change_password = 1). Requested '
                    . (Router::$current['method'] ?? '?') . ' ' . (Router::$current['path'] ?? '?')
                    . '. Only the credential-change, logout, identity and heartbeat routes remain '
                    . 'reachable (§ 164.308(a)(5)(ii)(D)).',
                    null,
                    $userId,
                    'user'
                );
            } catch (\Throwable $e) {
                // An audit failure must not become an access grant.
            }
        }

        http_response_code(403);
        header('Content-Type: application/json');

        echo json_encode([
            'success' => false,
            'code' => self::CODE,
            'password_change_required' => true,
            'message' => 'You must change your password before using the system. '
                . 'Sign in again to set a new one.',
        ]);

        exit;
    }
}
