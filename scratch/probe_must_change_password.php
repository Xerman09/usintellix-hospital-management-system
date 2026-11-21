<?php

declare(strict_types=1);

/**
 * Does `must_change_password` actually stop anything server-side?
 *
 * docs/TODO.md § 3.3 makes two claims. They are checked here by logging in
 * rather than by reading the code, because § 3.3 was itself written from a
 * reading and one of its two claims looks wrong on inspection.
 *
 *   CLAIM A: a user with the flag set gets a fully working session from the
 *            API and is never asked to change anything.
 *   CLAIM B: when the breach check matches, AuthService sets the flag, logs
 *            "immediate credential change required", "then lets the login
 *            through. A known-compromised password keeps working."
 *
 * Nothing here writes to a live database: TestDatabase::use() refuses unless
 * the target name differs from the live one and contains "test".
 */

require_once __DIR__ . '/../tests/lib/test_fixtures.php';

use App\Core\Session;
use App\Modules\Auth\Services\AuthService;

try {
    $database = TestDatabase::use();
} catch (Throwable $e) {
    echo "REFUSED: " . $e->getMessage() . "\n";
    exit(1);
}

$db = App\Core\Database::connection();
echo "database: " . $db->query('SELECT DATABASE()')->fetchColumn() . "\n\n";

const PROBE_USER = 'zz_mcp_probe';
const GOOD_PASSWORD = 'Tg7!qZr4-Vxn2Lme';   // strong, not in the local dictionary
const BREACHED_PASSWORD = 'Hospital123!';    // in COMMON_BREACHED_PASSWORDS

/** A user with a known password and whatever flags this probe needs. */
function makeUser(PDO $db, string $password, array $flags): int
{
    $db->prepare('DELETE FROM users WHERE username = :u')->execute(['u' => PROBE_USER]);

    $roleId = (int) $db->query("SELECT id FROM roles ORDER BY id LIMIT 1")->fetchColumn();

    $columns = array_merge([
        'username' => PROBE_USER,
        'password' => password_hash($password, PASSWORD_BCRYPT),
        'role_id' => $roleId,
        'status' => 'active',
        'is_locked' => 0,
        'failed_login_attempts' => 0,
    ], $flags);

    $names = implode(', ', array_map(static fn ($c) => "`{$c}`", array_keys($columns)));
    $binds = implode(', ', array_map(static fn ($c) => ":{$c}", array_keys($columns)));

    $db->prepare("INSERT INTO users ({$names}, created_at) VALUES ({$binds}, NOW())")->execute($columns);

    return (int) $db->lastInsertId();
}

function clearSession(): void
{
    $_SESSION = [];
}

// =========================================================================
// CLAIM A: the flag is set, the password is fine. Does a session come back?
// =========================================================================
echo "=== CLAIM A: must_change_password = 1, good password ===\n";

$userId = makeUser($db, GOOD_PASSWORD, [
    'must_change_password' => 1,
    'password_changed_at' => date('Y-m-d H:i:s'),   // so the 90-day check does not fire
]);

clearSession();

$result = (new AuthService())->login(PROBE_USER, GOOD_PASSWORD);

echo "  login success:          " . var_export($result['success'] ?? null, true) . "\n";
echo "  must_change_password:   " . var_export($result['user']['must_change_password'] ?? ($result['data']['user']['must_change_password'] ?? 'absent'), true) . "\n";

$sessionUser = Session::get('user');

echo "  session granted:        " . ($sessionUser ? 'YES' : 'no') . "\n";

if ($sessionUser) {
    echo "  session flag:           " . var_export($sessionUser['must_change_password'] ?? 'absent', true) . "\n";
}

// Now the thing that matters: would the middleware let that session through
// to an ordinary protected route?
if ($sessionUser) {
    require_once __DIR__ . '/../backend/app/Middleware/AuthMiddleware.php';

    ob_start();
    $passed = false;

    try {
        $passed = (new AuthMiddleware())->handle() === true;
    } catch (Throwable $e) {
        $passed = false;
    }

    $printed = trim((string) ob_get_clean());

    echo "  AuthMiddleware passed:  " . ($passed ? 'YES -- full access' : 'no') . "\n";

    if ($printed !== '') {
        echo "  middleware said:        {$printed}\n";
    }
}

// =========================================================================
// CLAIM B: a known-breached password. Is the login let through?
// =========================================================================
echo "\n=== CLAIM B: password on the breach list ===\n";

$userId = makeUser($db, BREACHED_PASSWORD, [
    'must_change_password' => 0,
    'password_breached' => 0,
    'password_changed_at' => date('Y-m-d H:i:s'),
]);

clearSession();

$breach = (new AuthService())->login(PROBE_USER, BREACHED_PASSWORD);

echo "  login success:          " . var_export($breach['success'] ?? null, true) . "\n";
echo "  password_breached flag: " . var_export($breach['password_breached'] ?? 'absent', true) . "\n";
echo "  session granted:        " . (Session::get('user') ? 'YES -- claim B holds' : 'no -- CLAIM B IS WRONG') . "\n";

$row = $db->prepare('SELECT must_change_password, password_breached FROM users WHERE username = :u');
$row->execute(['u' => PROBE_USER]);
$after = $row->fetch(PDO::FETCH_ASSOC) ?: [];

echo "  db must_change_password:" . var_export($after['must_change_password'] ?? null, true) . "\n";
echo "  db password_breached:   " . var_export($after['password_breached'] ?? null, true) . "\n";

// =========================================================================
// Which routes would a flagged user need, and which should be shut?
// =========================================================================
echo "\n=== Routes behind AuthMiddleware (count) ===\n";

$routeFiles = glob(__DIR__ . '/../backend/app/Modules/*/routes.php') ?: [];
$behindAuth = 0;

foreach ($routeFiles as $file) {
    $src = (string) file_get_contents($file);
    $behindAuth += preg_match_all('/AuthMiddleware::class/', $src);
}

echo "  route files:            " . count($routeFiles) . "\n";
echo "  routes behind auth:     {$behindAuth}\n";

$db->prepare('DELETE FROM users WHERE username = :u')->execute(['u' => PROBE_USER]);

echo "\nDone. Probe user removed.\n";
