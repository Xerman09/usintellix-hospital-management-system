<?php

declare(strict_types=1);

/**
 * Automated Verification: must_change_password is enforced on the SERVER
 * (docs/TODO.md § 3.3, HIPAA § 164.308(a)(5)(ii)(D))
 *
 *   php tests/build_test_database.php --fresh   (once)
 *   php tests/test_password_change_gate.php
 *
 * WHAT WAS WRONG. The flag was honoured in one place: auth.js:547, which shows
 * the forced-change screen after sign-in. AuthService authenticated, granted a
 * session and returned it regardless, and neither middleware looked at the flag
 * again. A client that ignored the field -- the mobile app, curl, anything --
 * got a working session across every route behind AuthMiddleware and was never
 * asked to change anything.
 *
 * THE ASSERTION THIS SUITE EXISTS FOR is section 2: a flagged user signs in for
 * real, and the request a flagged user must not be able to make is refused,
 * while the one that clears the flag is not.
 *
 * SECTION 5 IS THE ONE THAT PROTECTS THE USERS. An allowlist of routes is one
 * rename away from turning "change your password" into "your account stopped
 * working", so every allowed entry is checked against the real route table.
 *
 * AND SECTION 6 CORRECTS THE RECORD. § 3.3 also claimed that a breached
 * password "keeps working" because AuthService logs that a change is required
 * and then lets the login through. That is wrong -- the branch returns before
 * grantSession() -- and a defect list that overstates one thing gets trusted
 * less about the next. It is asserted here so the correction cannot quietly rot
 * back into being true.
 */

require_once __DIR__ . '/lib/test_fixtures.php';
require_once __DIR__ . '/../backend/app/Middleware/AuthMiddleware.php';

use App\Core\Database;
use App\Core\PasswordChangeGuard;
use App\Core\Router;
use App\Core\Session;
use App\Modules\Auth\Services\AuthService;

try {
    $database = TestDatabase::use();
} catch (Throwable $e) {
    echo "REFUSED: " . $e->getMessage() . "\n";
    exit(1);
}

echo "==================================================\n";
echo "   Automated Verification: the password-change gate\n";
echo "==================================================\n";
echo "  database: {$database}\n";
echo "  live database (untouched): " . TestDatabase::liveDatabaseName() . "\n";

if (!TestDatabase::exists()) {
    echo "\n  {$database} does not exist yet. Run:\n";
    echo "    php tests/build_test_database.php --fresh\n";
    exit(1);
}

$pass = 0;
$fail = 0;

function check(string $what, bool $ok, string $detail = ''): void
{
    global $pass, $fail;

    if ($ok) {
        $pass++;
        echo "  [PASS] {$what}\n";
    } else {
        $fail++;
        echo "  [FAIL] {$what}" . ($detail !== '' ? " -- {$detail}" : '') . "\n";
    }
}

$db = Database::connection();

echo "\n-- Running against the right database --\n";

$connectedTo = (string) $db->query('SELECT DATABASE()')->fetchColumn();

check('connected to the test database', $connectedTo === $database, "connected to {$connectedTo}");
check('that is not the live database', strcasecmp($connectedTo, TestDatabase::liveDatabaseName()) !== 0);

if ($connectedTo !== $database) {
    echo "\n  Stopping: refusing to write to {$connectedTo}.\n";
    exit(1);
}

// A password strong enough for validateComplexity and absent from
// PasswordSecurity::COMMON_BREACHED_PASSWORDS, so the breach branch does not
// fire and change what this suite is measuring.
const GATE_USER = 'zz_gate_user';
const GATE_PASSWORD = 'Tg7!qZr4-Vxn2Lme';
const GATE_BREACHED = 'Hospital123!';

/**
 * A user with a known password and whatever flags a section needs.
 */
function gateUser(array $flags, string $password = GATE_PASSWORD): int
{
    global $db;

    $db->prepare('DELETE FROM users WHERE username = :u')->execute(['u' => GATE_USER]);

    $roleId = (int) $db->query("SELECT id FROM roles WHERE name = 'clinician' LIMIT 1")->fetchColumn();

    if ($roleId === 0) {
        $roleId = (int) $db->query('SELECT id FROM roles ORDER BY id LIMIT 1')->fetchColumn();
    }

    $columns = array_merge([
        'username' => GATE_USER,
        'password' => password_hash($password, PASSWORD_BCRYPT),
        'role_id' => $roleId,
        'status' => 'active',
        'is_locked' => 0,
        'failed_login_attempts' => 0,
        'password_changed_at' => (string) $db->query('SELECT NOW()')->fetchColumn(),
    ], $flags);

    $names = implode(', ', array_map(static fn ($c) => "`{$c}`", array_keys($columns)));
    $binds = implode(', ', array_map(static fn ($c) => ":{$c}", array_keys($columns)));

    $db->prepare("INSERT INTO users ({$names}, created_at) VALUES ({$binds}, NOW())")->execute($columns);

    return (int) $db->lastInsertId();
}

/** Pretend to be the router, so the guard sees a request the way it really would. */
function requesting(string $method, string $path): void
{
    Router::$current = ['method' => strtoupper($method), 'path' => $path];
}

function freshSession(): void
{
    $_SESSION = [];
}

try {

// ==========================================================================
// 1. The hole, reproduced -- so what follows is measuring something real.
//
// A flagged user with a perfectly good password signs in. Before this change
// AuthMiddleware returned true here and the session reached all 1,343 routes
// behind it.
// ==========================================================================
echo "\n-- 1. A flagged user still signs in (that part is correct) --\n";

$userId = gateUser(['must_change_password' => 1]);
freshSession();

$login = (new AuthService())->login(GATE_USER, GATE_PASSWORD);

check('the sign-in itself succeeds', !empty($login['success']),
    (string) ($login['message'] ?? 'no message'));

$sessionUser = Session::get('user');

check('a session is granted', is_array($sessionUser));

check('and it carries the flag, so the web client can act on it',
    !empty($sessionUser['must_change_password']));

check('the database says the same', (int) $db->query(
    'SELECT must_change_password FROM users WHERE id = ' . $userId
)->fetchColumn() === 1);

// ==========================================================================
// 2. THE ASSERTION THIS SUITE EXISTS FOR.
//
// The same session, asking for something a flagged user must not have, and
// then asking for the one thing that gets them out of it.
// ==========================================================================
echo "\n-- 2. THE SESSION CANNOT REACH A PROTECTED ROUTE --\n";

requesting('GET', '/patients');
$verdict = PasswordChangeGuard::check($userId, $sessionUser);

check('GET /patients IS REFUSED', $verdict['blocked'], $verdict['reason']);
check('and the reason says why', $verdict['reason'] === 'password_change_required', $verdict['reason']);
check('read from the users row, not the session copy', $verdict['source'] === 'database', $verdict['source']);

requesting('POST', '/ai/analyse');
check('POST /ai/analyse is refused too -- it is not about one route',
    PasswordChangeGuard::check($userId, $sessionUser)['blocked']);

requesting('PUT', '/auth/first-login');
$clearing = PasswordChangeGuard::check($userId, $sessionUser);

check('BUT THE ROUTE THAT CLEARS THE FLAG IS ALLOWED', !$clearing['blocked'], $clearing['reason']);
check('and says so explicitly', $clearing['reason'] === 'route_allowed', $clearing['reason']);

requesting('POST', '/logout');
check('logout is allowed -- nobody is trapped in a session',
    !PasswordChangeGuard::check($userId, $sessionUser)['blocked']);

requesting('GET', '/auth/me');
check('auth/me is allowed -- the client must be able to ask why',
    !PasswordChangeGuard::check($userId, $sessionUser)['blocked']);

requesting('GET', '/ping');
check('the heartbeat is allowed -- blocked should not look like dead',
    !PasswordChangeGuard::check($userId, $sessionUser)['blocked']);

requesting('POST', '/auth/npp-acknowledge');
check('the privacy notice is NOT allowed yet -- the password comes first',
    PasswordChangeGuard::check($userId, $sessionUser)['blocked']);

// A method is half of a route. /logout is a POST; a GET of the same path is
// not the logout route and must not be a way through the gate.
requesting('GET', '/logout');
check('the allowlist is method-aware: GET /logout is not POST /logout',
    PasswordChangeGuard::check($userId, $sessionUser)['blocked']);

requesting('PUT', '/auth/first-login/');
check('a trailing slash does not matter -- Router strips it, so this does too',
    !PasswordChangeGuard::check($userId, $sessionUser)['blocked']);

// ==========================================================================
// 3. An unflagged user is not affected. The gate has to be invisible when
//    there is nothing to enforce, or it is a 1,343-route outage.
// ==========================================================================
echo "\n-- 3. An unflagged user is untouched --\n";

$cleanId = gateUser(['must_change_password' => 0]);
freshSession();

$cleanLogin = (new AuthService())->login(GATE_USER, GATE_PASSWORD);
$cleanSession = Session::get('user');

check('they sign in', !empty($cleanLogin['success']));

requesting('GET', '/patients');
$cleanVerdict = PasswordChangeGuard::check($cleanId, $cleanSession);

check('and GET /patients is allowed', !$cleanVerdict['blocked'], $cleanVerdict['reason']);
check('for the right reason', $cleanVerdict['reason'] === 'not_flagged', $cleanVerdict['reason']);

// The middleware itself, end to end, for the case where nothing is wrong.
// It cannot be run for the blocked case in-process -- enforce() exits by
// design -- so section 4 checks the wiring instead.
$middlewarePassed = false;
ob_start();

try {
    $middlewarePassed = (new AuthMiddleware())->handle() === true;
} catch (Throwable $e) {
    $middlewarePassed = false;
}

$printed = trim((string) ob_get_clean());

check('AuthMiddleware lets an unflagged session straight through',
    $middlewarePassed && $printed === '', $printed);

// ==========================================================================
// 4. THE FLAG COMES FROM THE DATABASE.
//
// The session copy is written once, at sign-in. If the gate trusted it, an
// administrator forcing a change on somebody already signed in would not
// reach them until they next logged out -- which is the opposite of the point.
// ==========================================================================
echo "\n-- 4. An administrator can force a change mid-session --\n";

// Same live session as section 3, which has must_change_password = false in it.
$db->prepare('UPDATE users SET must_change_password = 1 WHERE id = :id')->execute(['id' => $cleanId]);

check('the session copy still says no change is needed',
    empty(Session::get('user')['must_change_password']));

requesting('GET', '/patients');
$midSession = PasswordChangeGuard::check($cleanId, Session::get('user'));

check('BUT THE REQUEST IS REFUSED ANYWAY', $midSession['blocked'], $midSession['reason']);
check('because the flag was read from the row', $midSession['source'] === 'database');

// And the reverse: a stale 1 in the session must not outlive the row, or
// clearing the flag would not release the user.
$db->prepare('UPDATE users SET must_change_password = 0 WHERE id = :id')->execute(['id' => $cleanId]);

requesting('GET', '/patients');
check('and clearing the row releases the user, whatever the session holds',
    !PasswordChangeGuard::check($cleanId, ['must_change_password' => true])['blocked']);

echo "\n-- 4b. The wiring, which is the part a refactor can silently remove --\n";

$middlewareSrc = (string) file_get_contents(__DIR__ . '/../backend/app/Middleware/AuthMiddleware.php');

check('AuthMiddleware calls the guard',
    str_contains($middlewareSrc, 'PasswordChangeGuard::enforce'));

// enforce() is what writes the 403 and stops. The decision it acts on is
// check(), which everything above exercises; this asserts the two are joined.
$guardSrc = (string) file_get_contents(__DIR__ . '/../backend/app/Core/PasswordChangeGuard.php');

check('and enforce() refuses on the verdict check() produced',
    str_contains($guardSrc, 'self::check($userId, $sessionUser)'));

check('with a 403, not a 401 -- a 401 would tear down the session that has to '
    . 'survive to call /auth/first-login',
    str_contains($guardSrc, 'http_response_code(403)')
    && !str_contains($guardSrc, 'http_response_code(401)'));

check('and the client switches on the same code the guard sends',
    str_contains(
        (string) file_get_contents(__DIR__ . '/../frontend/src/core/api.js'),
        PasswordChangeGuard::CODE
    ));

// ==========================================================================
// 5. THE ALLOWLIST MUST NAME REAL ROUTES.
//
// This is the test that protects the users rather than the system. Every
// entry is a promise that a flagged person can still get out of the state.
// Rename /auth/first-login and the gate silently becomes a lockout: the flag
// is set, the route that clears it 404s, and the account is finished.
// ==========================================================================
echo "\n-- 5. Every allowed route exists --\n";

$routeSrc = '';

foreach (glob(__DIR__ . '/../backend/app/Modules/*/routes.php') ?: [] as $file) {
    $routeSrc .= (string) file_get_contents($file);
}

check('the route files were readable', $routeSrc !== '');

foreach (PasswordChangeGuard::ALLOWED as $allowed) {
    [$method, $path] = explode(' ', $allowed, 2);

    $pattern = '/\$router->' . strtolower($method) . '\(\s*[\'"]' . preg_quote($path, '/') . '[\'"]/';

    check("{$allowed} is a real route", preg_match($pattern, $routeSrc) === 1);
}

check('the allowlist is short -- five routes, and each one is argued for in the class',
    count(PasswordChangeGuard::ALLOWED) === 5, (string) count(PasswordChangeGuard::ALLOWED));

// ==========================================================================
// 5b. AN ALLOWED ROUTE MUST ALSO WORK, AND ONE OF THEM DOES NOT FOR STAFF.
//
// This is why the allowlist has two change routes rather than the one the web
// client uses, and it was very nearly a lockout.
//
// auth.js sends every flagged user to the first-login screen, which calls
// PUT /auth/first-login. AuthService::completeFirstLogin() requires the caller
// to confirm an email address held in patient_contacts -- so it can never
// succeed for a nurse, who has no patient record. With only that route open, an
// administrator setting the flag on a staff account would have produced an
// account that could do nothing and had no way to repair itself: strictly worse
// than the hole this guard closes.
//
// Both halves are asserted, so neither the reason nor the remedy can be
// removed by somebody tidying the allowlist.
// ==========================================================================
echo "\n-- 5b. The allowed route has to work for the user who is flagged --\n";

$staffId = gateUser(['must_change_password' => 1]);
freshSession();
(new AuthService())->login(GATE_USER, GATE_PASSWORD);

$viaFirstLogin = (new AuthService())->completeFirstLogin(
    $staffId,
    GATE_PASSWORD,
    GATE_USER,
    'Qp4%wLd8-Zrt6Kfs',
    'Qp4%wLd8-Zrt6Kfs',
    'nurse@intellix.hospital'
);

check('A STAFF USER CANNOT USE /auth/first-login -- it wants a patient email on file',
    empty($viaFirstLogin['success']), (string) ($viaFirstLogin['message'] ?? ''));

check('and it says so plainly, which is why the profile route is allowlisted',
    str_contains(strtolower((string) ($viaFirstLogin['message'] ?? '')), 'email'),
    (string) ($viaFirstLogin['message'] ?? ''));

check('so the flag is still set -- that route is a dead end for staff',
    (int) $db->query('SELECT must_change_password FROM users WHERE id = ' . $staffId)->fetchColumn() === 1);

// The route that does work for them.
check('PUT /profile/password is on the allowlist',
    PasswordChangeGuard::allows('PUT', '/profile/password'));

$viaProfile = (new App\Modules\Profile\Services\ProfileService())->changePassword(
    $staffId,
    GATE_PASSWORD,
    'Qp4%wLd8-Zrt6Kfs'
);

check('A STAFF USER CAN CHANGE THEIR PASSWORD THROUGH THE PROFILE ROUTE',
    !empty($viaProfile['success']), (string) ($viaProfile['message'] ?? ''));

check('AND THAT CLEARS THE FLAG, so the gate releases them',
    (int) $db->query('SELECT must_change_password FROM users WHERE id = ' . $staffId)->fetchColumn() === 0);

requesting('GET', '/patients');
check('after which the user may use the system again',
    !PasswordChangeGuard::check($staffId, Session::get('user'))['blocked']);

// Every route on the allowlist that is a password change must be able to clear
// the flag for SOMEBODY. Asserted as a property so a future entry cannot be
// added without the same question being asked.
$changeRoutes = array_values(array_filter(
    PasswordChangeGuard::ALLOWED,
    static fn (string $r): bool => str_contains($r, 'password') || str_contains($r, 'first-login')
));

check('the allowlist contains exactly two credential-change routes, one of which '
    . 'works for anybody', count($changeRoutes) === 2, implode(' | ', $changeRoutes));

// ==========================================================================
// 5c. enforce() ITSELF, in a child process.
//
// enforce() writes the 403 and calls exit. That is right for middleware and
// means this suite can only exercise check(), the decision -- leaving the half
// that actually refuses a request to run for the first time in production.
//
// So it is run for real in a subprocess and the output is read back. What is
// being checked is not the decision again: it is the status code, the body the
// client switches on, and the audit row.
// ==========================================================================
echo "\n-- 5c. The refusal itself --\n";

$child = __DIR__ . '/lib/password_gate_enforce_child.php';

check('the child script is there', is_file($child));

// A freshly created user, so the audit count below starts at zero without
// anything having to be cleaned up afterwards -- which is just as well:
// hipaa_audit_logs carries a trigger enforcing the six-year immutable
// retention of § 164.316(b)(2)(i), and a DELETE here is refused by the
// database. That is the retention guard working, and it is the reason this
// section counts rows for one user id rather than emptying a table.
$enforceId = gateUser(['must_change_password' => 1]);

$cmd = escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($child) . ' '
    . escapeshellarg((string) $enforceId) . ' GET ' . escapeshellarg('/patients');

$out = (string) shell_exec($cmd . ' 2>&1');

check('it refused with 403', str_contains($out, '__STATUS__=403'), trim($out));

check('it did not fall through', !str_contains($out, '__NOT_BLOCKED__'));

$body = json_decode(trim(explode('__STATUS__', $out)[0]), true);

check('the body is JSON', is_array($body), trim($out));
check('it says the request failed', ($body['success'] ?? true) === false);
check('it carries the code the client switches on',
    ($body['code'] ?? '') === PasswordChangeGuard::CODE, (string) ($body['code'] ?? ''));
check('and the boolean, for a client that prefers one',
    ($body['password_change_required'] ?? false) === true);
check('and a message a person can act on',
    is_string($body['message'] ?? null) && str_contains(strtolower($body['message']), 'password'));

check('THE REFUSAL IS AUDITED -- so "a change was required" is no longer a claim '
    . 'the log makes while nothing enforces it',
    (int) $db->query(
        "SELECT COUNT(*) FROM hipaa_audit_logs WHERE action = 'PASSWORD_CHANGE_ENFORCED' AND user_id = " . $enforceId
    )->fetchColumn() === 1);

// And an allowed route through the same path, so the above is not passing
// because the child refuses everything.
$allowedOut = (string) shell_exec(
    escapeshellarg(PHP_BINARY) . ' ' . escapeshellarg($child) . ' '
    . escapeshellarg((string) $enforceId) . ' PUT ' . escapeshellarg('/profile/password') . ' 2>&1'
);

check('an allowed route is NOT refused by the same code path',
    str_contains($allowedOut, '__NOT_BLOCKED__'), trim($allowedOut));

check('and nothing extra was audited for it',
    (int) $db->query(
        "SELECT COUNT(*) FROM hipaa_audit_logs WHERE action = 'PASSWORD_CHANGE_ENFORCED' AND user_id = " . $enforceId
    )->fetchColumn() === 1);

// ==========================================================================
// 6. CORRECTING § 3.3's SECOND CLAIM.
//
// "when AuthService matches a password against the HIBP list it sets
// must_change_password = 1 and logs PASSWORD_BREACH_DETECTED ... then lets the
// login through. A known-compromised password keeps working."
//
// It does not. The branch returns success: false before grantSession() is
// reached, so no session is created at all. Asserted here because a wrong
// entry on a defect list is worse than a missing one.
// ==========================================================================
echo "\n-- 6. A breached password was never letting anyone in --\n";

$breachedId = gateUser(['must_change_password' => 0, 'password_breached' => 0], GATE_BREACHED);
freshSession();

$breachLogin = (new AuthService())->login(GATE_USER, GATE_BREACHED);

check('the breach is detected', !empty($breachLogin['password_breached']));
check('THE LOGIN IS REFUSED', empty($breachLogin['success']));
check('AND NO SESSION IS CREATED -- the compromised password does not work',
    Session::get('user') === null);

$afterBreach = $db->query(
    'SELECT must_change_password, password_breached FROM users WHERE id = ' . $breachedId
)->fetch(PDO::FETCH_ASSOC) ?: [];

check('the flag is set, so the gate would also hold if a session existed',
    (int) ($afterBreach['must_change_password'] ?? 0) === 1);

check('and the breach is recorded on the row',
    (int) ($afterBreach['password_breached'] ?? 0) === 1);

check('the audit trail recorded it', (int) $db->query(
    "SELECT COUNT(*) FROM hipaa_audit_logs WHERE action = 'PASSWORD_BREACH_DETECTED' AND user_id = " . $breachedId
)->fetchColumn() > 0);

// ==========================================================================
// 7. Edge cases that would each be a way through.
// ==========================================================================
echo "\n-- 7. Edges --\n";

check('an unauthenticated request is not this guard\'s business',
    !PasswordChangeGuard::check(0, null)['blocked']);

$db->prepare('DELETE FROM users WHERE username = :u')->execute(['u' => GATE_USER]);

requesting('GET', '/patients');
// The row was just deleted, so the database answers "no such user". The guard
// must not turn that into a password-change refusal: AuthMiddleware's own status
// check owns deleted and suspended accounts, and the right refusal with the
// wrong reason sends somebody to change a password on an account that is gone.
$goneVerdict = PasswordChangeGuard::check($staffId, ['must_change_password' => true]);

check('a user row that no longer exists is left to the status check, not reported '
    . 'as needing a password change',
    !$goneVerdict['blocked'] && $goneVerdict['reason'] === 'not_flagged', $goneVerdict['reason']);

check('allows() is case-insensitive about the method, as HTTP is',
    PasswordChangeGuard::allows('post', '/logout'));

check('and an unknown route is never allowed',
    !PasswordChangeGuard::allows('GET', '/zz-not-a-route'));

} finally {
    $db->prepare('DELETE FROM users WHERE username = :u')->execute(['u' => GATE_USER]);
    Router::$current = ['method' => '', 'path' => ''];
}

echo "\n==================================================\n";
echo "  {$pass} passed, {$fail} failed\n";
echo "==================================================\n";

exit($fail === 0 ? 0 : 1);
