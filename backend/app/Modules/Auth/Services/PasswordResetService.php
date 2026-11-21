<?php

namespace App\Modules\Auth\Services;

use App\Core\AuditLogger;
use App\Core\Database;
use App\Core\Mailer;
use App\Core\PasswordSecurity;
use App\Modules\GeneralSettings\Services\GeneralSettingService;
use App\Modules\Users\Models\User;
use PDO;

/**
 * "Forgot Password?" -- the part behind the link.
 *
 * Read schema 344's header for why this is a six-digit code by email and not a
 * reset link. The short version: there is no public base URL that resolves for
 * both a hash-routed SPA and a React Native binary, and a reset link that opens
 * nothing is a locked-out user with no way back. This mirrors the 2FA flow the
 * system already has and already delivers.
 *
 * Three rules govern everything here.
 *
 * ONE: THE ANSWER NEVER SAYS WHETHER THE ACCOUNT EXISTS.
 *
 * request() returns the same message and the same shape for a real username, a
 * username that does not exist, a suspended account and an account with no email
 * on file. Anything else turns this endpoint into a tool for finding out which
 * usernames are real, which is the first step of attacking them. It is why a row
 * is written even when nothing is sent, and why there is no "no such user" error
 * anywhere in this file.
 *
 * TWO: A FAILED SEND IS A FAILED RESET, UNLESS YOU ARE SITTING AT THE SERVER.
 *
 * AuthService hands the 2FA code back in the response when mail fails, for staff
 * only, with its reasoning written down: the caller has already proved the
 * password, so it degrades two factors to one. That reasoning does not carry
 * here. A reset caller has proved nothing except that they can type a username,
 * so returning the code over the network would hand the account to anyone who
 * knows one.
 *
 * There is one exception, added deliberately and fenced tightly: a request from
 * the machine the system runs on, for a staff account, whose email failed, gets
 * the code back in `dev_code` -- because somebody at that machine can already
 * read the users table directly, and because an install with no working mail
 * server otherwise has no way back into a locked account. devCodeAllowed()
 * holds the three conditions and schema 345 holds the argument. Everything
 * about that path is audited as a security event, by name.
 *
 * THREE: THE NEW PASSWORD GOES THROUGH THE SAME DOOR AS EVERY OTHER ONE.
 *
 * PasswordSecurity::recordPasswordChange() hashes it, writes the old hash to
 * history, clears must_change_password, password_breached, the failed-attempt
 * count and the lock, and writes a PASSWORD_CHANGED row to the HIPAA audit
 * trail. Complexity and no-reuse are checked first, so a reset cannot be used to
 * get around rules that apply everywhere else -- including setting the password
 * back to the one the account just lost.
 */
class PasswordResetService
{
    /** How long a code is good for. Shorter than a login code: this one changes a credential. */
    public const CODE_TTL_MINUTES = 15;

    /**
     * Wrong guesses one code tolerates before it is dead.
     *
     * Six digits is a million combinations, which sounds ample and is not --
     * without a cap an attacker gets all million inside the TTL.
     */
    public const MAX_ATTEMPTS = 5;

    /** Minimum gap between codes for one account, so the button cannot flood an inbox. */
    public const RESEND_COOLDOWN_SECONDS = 60;

    /** Requests for one account in a rolling day. */
    public const MAX_PER_USER_PER_DAY = 5;

    /**
     * Requests from one address in a rolling hour.
     *
     * The per-account limit cannot carry this on its own: a request naming a
     * username that does not exist has no account to count against, and that is
     * exactly what someone enumerating usernames would be sending.
     */
    public const MAX_PER_IP_PER_HOUR = 10;

    /**
     * Said to everybody, whatever actually happened.
     *
     * Deliberately "if": it promises nothing about whether the account is real,
     * and still tells a legitimate user exactly what to expect.
     */
    public const UNIFORM_REPLY = 'If that account exists and we have an email address for it, a code is on its way. '
        . 'It expires in 15 minutes. Check your spam folder before asking again.';

    /**
     * Why the last send() failed, for the audit line only.
     *
     * It never reaches the caller. The uniform reply above is the whole of what
     * a requester is told, and "the mail server rejected that address" would
     * answer the question the uniform reply exists to refuse. It goes in the
     * audit trail because somebody who is not receiving codes needs a staff
     * member to be able to see why without reading a socket by hand.
     */
    protected static ?string $lastSendError = null;

    // ==================================================================
    // Step 1: ask for a code
    // ==================================================================

    public static function request(string $username, ?string $ip = null): array
    {
        $db = Database::connection();
        $username = trim($username);
        $ip = self::cleanIp($ip);

        if ($username === '') {
            return self::fail('Enter your username or email address.', ['username' => 'Required.']);
        }

        if (!self::enabled()) {
            // Said plainly rather than hidden behind the uniform reply: this is
            // a property of the hospital, not of the account, so saying it
            // reveals nothing and saves the user waiting for an email that is
            // never coming.
            return self::fail('This hospital does not offer password resets through the app. Please contact the service desk.');
        }

        $now = self::now($db);

        // Rate limits first, and by IP before anything is looked up, so a
        // stream of guesses at usernames is stopped before it touches the
        // users table.
        if (self::ipRequestsInLastHour($db, $ip, $now) >= self::MAX_PER_IP_PER_HOUR) {
            return self::fail('Too many password reset requests from this device. Please wait an hour, or contact the service desk.');
        }

        $user = self::findUser($db, $username);
        $userId = $user ? (int) $user['id'] : null;

        // Everything below writes a row and returns UNIFORM_REPLY. The row is
        // the only place the difference is visible.
        $blocked = null;

        if ($userId !== null) {
            if (self::userRequestsToday($db, $userId, $now) >= self::MAX_PER_USER_PER_DAY) {
                $blocked = 'daily limit reached for this account';
            } elseif (($recent = self::secondsSinceLastCode($db, $userId, $now)) !== null
                && $recent < self::RESEND_COOLDOWN_SECONDS) {
                $blocked = 'still inside the resend cooldown';
            }
        }

        $code = null;
        $sent = false;
        $contactEmail = null;
        $addressUsable = false;
        $devCode = null;
        $devAllowed = false;
        self::$lastSendError = null;

        if ($userId !== null && $blocked === null) {
            $contact = AuthService::contactForUser($userId);
            $contactEmail = $contact['email'] ?? null;

            // Checked, not just non-empty. Accounts in this database have
            // carried addresses like "someone@gmail.com@intellix.hospital" --
            // a username with a domain stapled on by some long-gone bootstrap
            // script. Handing that to the mailer produces a rejected RCPT TO
            // and an audit line reading "the email could not be sent", which
            // points at the mail server and hides the real fault. An address
            // that cannot be delivered to is the same thing as no address.
            $addressUsable = is_string($contactEmail)
                && filter_var($contactEmail, FILTER_VALIDATE_EMAIL) !== false;

            // Decided before anything is generated, so the one case where a
            // code is issued with no address at all -- staff, at the server,
            // with nothing on file to email -- is reachable. Without that this
            // fallback would not help the install it exists for.
            $devAllowed = self::devCodeAllowed($ip, $contact);

            if ($addressUsable || $devAllowed) {
                $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

                // Any code still open for this account stops working the moment
                // a new one is issued, so two codes are never live at once.
                $db->prepare(
                    "UPDATE password_reset_codes SET expires_at = :set_exp
                      WHERE user_id = :u AND consumed_at IS NULL AND expires_at > :cur_exp"
                )->execute(['set_exp' => $now, 'cur_exp' => $now, 'u' => $userId]);

                if ($addressUsable) {
                    $sent = static::send($contactEmail, $code, $user);
                }

                // Only ever as a fallback. A working send never shows the code,
                // so fixing MAIL_PASSWORD switches this off by itself.
                if (!$sent && $devAllowed) {
                    $devCode = $code;
                }
            }
        }

        // Either route counts as issued: the code exists, somebody has it, and
        // it has to be hashed, dated and rate-limited the same way.
        $delivered = $sent || $devCode !== null;

        $db->prepare(
            "INSERT INTO password_reset_codes
                (user_id, requested_username, code_hash, method, expires_at, was_sent, requested_ip, created_at)
             VALUES (:u, :name, :hash, :method, :expires, :sent, :ip, :now)"
        )->execute([
            'u' => $userId,
            'name' => mb_substr($username, 0, 190),
            // Only written when a code was actually made AND reached somebody.
            // A hash for a code nobody received would be a live credential for
            // an email that does not exist.
            'hash' => ($code !== null && $delivered) ? hash('sha256', $code) : null,
            'expires' => ($code !== null && $delivered)
                ? date('Y-m-d H:i:s', strtotime($now) + (self::CODE_TTL_MINUTES * 60))
                : null,
            // 'on_screen' so that "was this emailed, or read off a screen at
            // the server" stays answerable later. was_sent means what it says:
            // no email went out, so it stays 0.
            'method' => $devCode !== null ? 'on_screen' : 'email',
            'sent' => $sent ? 1 : 0,
            'ip' => $ip,
            'now' => $now,
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'PASSWORD_RESET_REQUESTED',
            sprintf(
                'Password reset requested for "%s" from %s. %s',
                mb_substr($username, 0, 100),
                $ip ?? 'an unknown address',
                $userId === null
                    ? 'No account matched; nothing was sent.'
                    : ($blocked !== null
                        ? "Account #{$userId} matched but nothing was sent: {$blocked}."
                        : ($sent
                            ? "A code was sent to the address on file for account #{$userId}."
                            : ($devCode !== null
                                ? "No email could be sent for account #{$userId}, so the code was shown on screen to a caller at the server itself ({$ip}). See schema 345."
                                : (!$addressUsable
                                ? (empty($contactEmail)
                                    ? "Account #{$userId} matched but has no email address on file; nothing was sent."
                                    : "Account #{$userId} matched but the email address on file is not a valid address; nothing was sent. Correct the address on the staff or patient record.")
                                    : "Account #{$userId} matched but the email could not be sent."
                                        . (self::$lastSendError !== null ? ' Mail server said: ' . self::$lastSendError : ''))))),
            ),
            null,
            $userId,
            $user['role_name'] ?? null
        );

        // A row of its own, under its own action, because this is the one path
        // in the file where a credential leaves the building without an inbox
        // in between. Somebody auditing this system should be able to find
        // every use of it with one WHERE clause rather than by reading
        // descriptions.
        if ($devCode !== null) {
            AuditLogger::log(
                AuditLogger::CATEGORY_SECURITY,
                'PASSWORD_RESET_CODE_SHOWN_ON_SCREEN',
                sprintf(
                    'A password reset code for account #%d was displayed to the caller instead of emailed, '
                        . 'because mail delivery failed and the request came from the server itself (%s). '
                        . 'This is the fallback described in schema 345 and is only available to staff accounts '
                        . 'from loopback. Turn off general_settings.allow_password_reset_dev_code to remove it.',
                    $userId,
                    $ip ?? 'unknown address'
                ),
                null,
                $userId,
                $user['role_name'] ?? null
            );
        }

        $data = [
            'expires_in' => self::CODE_TTL_MINUTES * 60,
            'resend_in' => self::RESEND_COOLDOWN_SECONDS,
        ];

        // Same two keys the sign-in page already understands, so both clients
        // can show this the way they already show the 2FA fallback.
        if ($devCode !== null) {
            $data['dev_mode'] = true;
            $data['dev_code'] = $devCode;
        }

        return [
            'success' => true,
            'message' => $devCode !== null
                // The uniform reply would be a lie here -- nothing is on its
                // way. Saying so is safe for the same reason the code itself
                // is: this answer only ever reaches the server's own console.
                ? 'Mail could not be sent, so your code is shown below. It expires in '
                    . self::CODE_TTL_MINUTES . ' minutes.'
                : self::UNIFORM_REPLY,
            'data' => $data,
        ];
    }

    // ==================================================================
    // Step 2: check the code, without spending it
    // ==================================================================

    /**
     * Is this code good?
     *
     * Separate from reset() so the clients can tell somebody the code is wrong
     * before making them think up and type a new password twice. A wrong guess
     * costs an attempt here exactly as it would there, so splitting the steps
     * buys an attacker nothing.
     */
    public static function verify(string $username, string $code): array
    {
        $db = Database::connection();
        $found = self::match($db, trim($username), trim($code));

        if (!$found['ok']) {
            return self::fail($found['message']);
        }

        return ['success' => true, 'message' => 'Code accepted. Choose a new password.'];
    }

    // ==================================================================
    // Step 3: set the new password
    // ==================================================================

    public static function reset(string $username, string $code, string $newPassword): array
    {
        $db = Database::connection();
        $username = trim($username);

        if (!self::enabled()) {
            return self::fail('This hospital does not offer password resets through the app. Please contact the service desk.');
        }

        // The code is checked BEFORE the password is looked at, so a caller
        // without a valid code learns nothing about the password rules in force.
        $found = self::match($db, $username, trim($code));

        if (!$found['ok']) {
            return self::fail($found['message']);
        }

        $row = $found['row'];
        $userId = (int) $row['user_id'];

        $complexity = PasswordSecurity::validateComplexity($newPassword);

        if (empty($complexity['valid'])) {
            // Deliberately does NOT consume the code. The caller has proved they
            // hold it; making them ask for a new one because their first choice
            // of password was too short would be punishing the wrong mistake.
            return self::fail($complexity['message'] ?? 'That password is not strong enough.', [
                'password' => $complexity['message'] ?? null,
            ]);
        }

        $history = PasswordSecurity::checkHistory($userId, $newPassword);

        if (empty($history['allowed'])) {
            return self::fail(
                $history['message'] ?? 'That password has been used on this account recently. Please choose another.',
                ['password' => $history['message'] ?? null]
            );
        }

        $now = self::now($db);

        // Spend the code first. If anything below fails the code is still gone,
        // which is the safe direction: a spent code someone has to re-request
        // beats a live code that has already changed a password once.
        $spend = $db->prepare(
            "UPDATE password_reset_codes SET consumed_at = :now
              WHERE id = :id AND consumed_at IS NULL"
        );
        $spend->execute(['now' => $now, 'id' => (int) $row['id']]);

        if ($spend->rowCount() !== 1) {
            // Two requests arrived with the same code at the same moment. The
            // other one won.
            return self::fail('That code has already been used. Please request a new one.');
        }

        PasswordSecurity::recordPasswordChange(
            $userId,
            $newPassword,
            $userId,
            'Self-service password reset by emailed code'
        );

        AuditLogger::log(
            AuditLogger::CATEGORY_SECURITY,
            'PASSWORD_RESET_COMPLETED',
            sprintf('Password reset completed for account #%d via an emailed code (request #%d).', $userId, (int) $row['id']),
            null,
            $userId,
            null
        );

        // Told after the fact, to the address on file. Somebody whose password
        // was reset without their knowing needs to hear about it, and this is
        // the only message in the flow that reaches an account that was taken.
        static::notifyChanged($userId);

        return [
            'success' => true,
            'message' => 'Your password has been changed. You can sign in with it now.',
        ];
    }

    // ==================================================================
    // Matching a code
    // ==================================================================

    /**
     * Find the live code row for this username and code, counting the attempt.
     *
     * Every failure returns the SAME message. Distinguishing "no such account"
     * from "wrong code" from "expired" would answer the question the uniform
     * reply in request() exists to avoid, one step further along.
     *
     * @return array{ok: bool, message: string, row: ?array}
     */
    private static function match(PDO $db, string $username, string $code): array
    {
        $no = static fn(string $m = 'That code is not right, or it has expired. Please request a new one.')
            => ['ok' => false, 'message' => $m, 'row' => null];

        if ($username === '' || !preg_match('/^\d{6}$/', $code)) {
            return $no();
        }

        $user = self::findUser($db, $username);

        if (!$user) {
            return $no();
        }

        $now = self::now($db);

        $stmt = $db->prepare(
            "SELECT * FROM password_reset_codes
              WHERE user_id = :u AND consumed_at IS NULL AND code_hash IS NOT NULL
                AND expires_at > :now
              ORDER BY id DESC LIMIT 1"
        );
        $stmt->execute(['u' => (int) $user['id'], 'now' => $now]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            return $no();
        }

        if ((int) $row['attempts'] >= self::MAX_ATTEMPTS) {
            return $no('Too many wrong attempts on that code. Please request a new one.');
        }

        // Counted before the comparison, so a crash or a disconnect mid-check
        // cannot be used to get a free guess.
        $db->prepare('UPDATE password_reset_codes SET attempts = attempts + 1 WHERE id = :id')
            ->execute(['id' => (int) $row['id']]);

        // hash_equals, not ===, so the comparison does not leak how much of the
        // code was right through how long it took.
        if (!hash_equals((string) $row['code_hash'], hash('sha256', $code))) {
            if ((int) $row['attempts'] + 1 >= self::MAX_ATTEMPTS) {
                AuditLogger::log(
                    AuditLogger::CATEGORY_SECURITY,
                    'PASSWORD_RESET_FAILED',
                    sprintf('Password reset code for account #%d was retired after %d wrong attempts.', (int) $user['id'], self::MAX_ATTEMPTS),
                    null,
                    (int) $user['id'],
                    null
                );
            }

            return $no();
        }

        $row['attempts'] = (int) $row['attempts'] + 1;

        return ['ok' => true, 'message' => '', 'row' => $row];
    }

    // ==================================================================
    // Plumbing
    // ==================================================================

    /**
     * The account for a typed identifier.
     *
     * Only live, active accounts. A suspended or deleted one resolves to
     * nothing, so a reset cannot quietly bring back an account an administrator
     * switched off -- and because it resolves to nothing rather than to an
     * error, the caller cannot tell that from a username that never existed.
     *
     * A LOCKED account does resolve, on purpose: lockout is what too many wrong
     * passwords produces, and this is how somebody gets back in.
     * recordPasswordChange() clears the lock.
     */
    private static function findUser(PDO $db, string $username): ?array
    {
        $stmt = $db->prepare(
            "SELECT u.*, r.name AS role_name
               FROM users u LEFT JOIN roles r ON r.id = u.role_id
              WHERE u.username = :u AND u.deleted_at IS NULL AND u.status = 'active'
              LIMIT 1"
        );
        $stmt->execute(['u' => $username]);

        return $stmt->fetch(PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Send the code.
     *
     * `protected static`, and called through `static::`, for one reason: the
     * test suite subclasses this service and overrides this method to capture
     * the code instead of posting it. Without that seam the only way to exercise
     * the path where a code is actually issued would be to send real email to
     * whatever address the fixture carries, through the hospital's real SMTP
     * server, on every test run.
     *
     * It is a seam for tests and nothing else. Production calls it exactly as if
     * it were private, and overriding it anywhere outside tests would mean
     * silently disabling password reset delivery.
     */
    protected static function send(string $email, string $code, ?array $user): bool
    {
        $name = trim((string) ($user['username'] ?? ''));

        try {
            $mailer = new Mailer();

            $ok = $mailer->send(
                $email,
                'Your Intellix Hospital System password reset code',
                "Someone asked to reset the password for your account"
                    . ($name !== '' ? " ({$name})" : '') . ".\n\n"
                    . "Your reset code is: {$code}\n\n"
                    . 'It expires in ' . self::CODE_TTL_MINUTES . " minutes and can be used once.\n\n"
                    . "If this was not you, you do not need to do anything -- your password has not been\n"
                    . "changed and this code is useless to anybody who does not have this email. If you\n"
                    . "keep getting these, tell the service desk."
            );

            if (!$ok) {
                self::$lastSendError = $mailer->lastError() ?: 'no reason given';
            }

            return $ok;
        } catch (\Throwable $e) {
            // Mail being misconfigured must not turn into a 500 that tells the
            // caller their username was real.
            self::$lastSendError = $e->getMessage();

            return false;
        }
    }

    /** Tell the account holder, after the fact, that the password changed. Overridable for the same reason as send(). */
    protected static function notifyChanged(int $userId): void
    {
        try {
            $contact = AuthService::contactForUser($userId);

            if (empty($contact['email'])) {
                return;
            }

            (new Mailer())->send(
                $contact['email'],
                'Your Intellix Hospital System password was changed',
                "Your password was just changed using a reset code sent to this address.\n\n"
                    . "If that was you, there is nothing to do.\n\n"
                    . "If it was NOT you, somebody else has access to this mailbox or to your account.\n"
                    . "Contact the service desk straight away."
            );
        } catch (\Throwable $e) {
            // The change is done and audited; this is a courtesy.
        }
    }

    /**
     * The three conditions under which a failed send may show the code instead.
     *
     * All three, every time. Schema 345 argues each one; the short version is
     * that this is the whole of the authentication rather than a second factor,
     * so the only caller who may have it is one who could have read the
     * database directly anyway.
     *
     * The proxy-header check is not belt-and-braces. Behind nginx or any other
     * reverse proxy, REMOTE_ADDR is the proxy, which is usually loopback, and
     * every caller on earth would satisfy condition one. A request carrying any
     * forwarding header did not originate at this machine, whatever the socket
     * says.
     */
    private static function devCodeAllowed(?string $ip, array $contact): bool
    {
        if (!self::devCodeEnabled()) {
            return false;
        }

        // Staff only, the same line the sign-in page draws.
        if (!empty($contact['is_patient'])) {
            return false;
        }

        if (!in_array($ip, ['127.0.0.1', '::1'], true)) {
            return false;
        }

        foreach (['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_FORWARDED', 'HTTP_CLIENT_IP'] as $header) {
            if (!empty($_SERVER[$header])) {
                return false;
            }
        }

        return true;
    }

    private static function devCodeEnabled(): bool
    {
        try {
            $settings = (new GeneralSettingService())->get();

            return (int) ($settings['allow_password_reset_dev_code'] ?? 1) === 1;
        } catch (\Throwable $e) {
            // A reset is not the place to discover that general_settings is
            // unreadable, and the other two conditions still have to hold.
            return true;
        }
    }

    private static function enabled(): bool
    {
        try {
            $settings = (new GeneralSettingService())->get();

            return (int) ($settings['allow_self_password_reset'] ?? 1) === 1;
        } catch (\Throwable $e) {
            return true;
        }
    }

    private static function ipRequestsInLastHour(PDO $db, ?string $ip, string $now): int
    {
        if ($ip === null) {
            return 0;
        }

        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM password_reset_codes
              WHERE requested_ip = :ip AND created_at >= :since'
        );
        $stmt->execute(['ip' => $ip, 'since' => date('Y-m-d H:i:s', strtotime($now) - 3600)]);

        return (int) $stmt->fetchColumn();
    }

    private static function userRequestsToday(PDO $db, int $userId, string $now): int
    {
        $stmt = $db->prepare(
            'SELECT COUNT(*) FROM password_reset_codes
              WHERE user_id = :u AND created_at >= :since'
        );
        $stmt->execute(['u' => $userId, 'since' => date('Y-m-d H:i:s', strtotime($now) - 86400)]);

        return (int) $stmt->fetchColumn();
    }

    private static function secondsSinceLastCode(PDO $db, int $userId, string $now): ?int
    {
        // code_hash IS NOT NULL, not was_sent = 1: the question is whether a
        // code was issued, and one shown on screen was issued without an email
        // going out. Keying this on was_sent would let the on-screen path be
        // asked for again and again with no gap at all.
        $stmt = $db->prepare(
            'SELECT created_at FROM password_reset_codes
              WHERE user_id = :u AND code_hash IS NOT NULL ORDER BY id DESC LIMIT 1'
        );
        $stmt->execute(['u' => $userId]);
        $last = $stmt->fetchColumn();

        if ($last === false) {
            return null;
        }

        return max(0, strtotime($now) - strtotime((string) $last));
    }

    /** The database's clock. PHP's is seven hours out on the machine this was written on. */
    private static function now(PDO $db): string
    {
        return (string) $db->query('SELECT NOW()')->fetchColumn();
    }

    private static function cleanIp(?string $ip): ?string
    {
        $ip = trim((string) ($ip ?? ''));

        if ($ip === '' || !filter_var($ip, FILTER_VALIDATE_IP)) {
            return null;
        }

        return mb_substr($ip, 0, 45);
    }

    private static function fail(string $message, ?array $errors = null): array
    {
        return array_filter([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], static fn($v) => $v !== null);
    }
}
