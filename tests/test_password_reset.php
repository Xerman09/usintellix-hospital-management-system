<?php

declare(strict_types=1);

/**
 * Automated Verification: Forgot Password
 *
 * Runs against the disposable database from tests/build_test_database.php and
 * refuses to run anywhere else. It changes passwords, so there is nowhere else
 * it could honestly run.
 *
 *   php tests/build_test_database.php --fresh   (once)
 *   php tests/test_password_reset.php
 *
 * NO MAIL IS EVER SENT BY THIS SUITE. PasswordResetService::send() and
 * notifyChanged() are protected static and reached through `static::`, so the
 * double below overrides them and captures the code instead of posting it.
 * Without that, the only way to exercise the path where a code is actually
 * issued would be to put real email through the hospital's SMTP server on every
 * run. The assertions check the double was used, so a change that routed around
 * it would fail here rather than quietly start sending.
 *
 * What the suite is mostly about:
 *
 * ONE: THE ANSWER NEVER REVEALS WHETHER AN ACCOUNT EXISTS. A real username, one
 * that does not exist, a suspended account and an account with no address on
 * file must all produce the identical reply. If they do not, this endpoint is a
 * tool for finding out which usernames are worth attacking.
 *
 * TWO: A CODE IS SINGLE-USE, SHORT-LIVED, GUESS-LIMITED AND NEVER STORED IN THE
 * CLEAR. Six digits is a million combinations, which an unbounded attacker gets
 * through comfortably inside the TTL.
 *
 * THREE: A RESET CANNOT GET AROUND RULES THAT APPLY ELSEWHERE -- complexity and
 * the no-reuse history are checked before anything changes.
 */

require_once __DIR__ . '/lib/test_fixtures.php';

use App\Core\Database;
use App\Core\PasswordSecurity;
use App\Modules\Auth\Services\PasswordResetService;
use App\Modules\Users\Models\User;

try {
    $database = TestDatabase::use();
} catch (Throwable $e) {
    echo "REFUSED: " . $e->getMessage() . "\n";
    exit(1);
}

/**
 * The service with its two mail calls replaced by capture.
 *
 * Everything else -- rate limits, hashing, attempt counting, expiry,
 * single-use, complexity, history, the audit rows -- is the real code.
 */
final class ResetUnderTest extends PasswordResetService
{
    /** @var array<int, array{email: string, code: string}> */
    public static array $sent = [];

    /** @var int */
    public static int $changeNotices = 0;

    /** Make the next send fail, to prove there is no "here is the code" fallback. */
    public static bool $failNextSend = false;

    protected static function send(string $email, string $code, ?array $user): bool
    {
        if (self::$failNextSend) {
            self::$failNextSend = false;

            return false;
        }

        self::$sent[] = ['email' => $email, 'code' => $code];

        return true;
    }

    protected static function notifyChanged(int $userId): void
    {
        self::$changeNotices++;
    }

    public static function lastCode(): ?string
    {
        $last = end(self::$sent);

        return $last === false ? null : $last['code'];
    }

    public static function reset_(): void
    {
        self::$sent = [];
        self::$changeNotices = 0;
        self::$failNextSend = false;
    }
}

echo "==================================================\n";
echo "   Automated Verification: Forgot Password\n";
echo "==================================================\n";
echo "  database: {$database}\n";
echo "  live database (untouched): " . TestDatabase::liveDatabaseName() . "\n";
echo "  mail: stubbed -- this suite never sends\n";

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

$world = TestFixtures::world();

// --------------------------------------------------------------------------
// The accounts this suite needs. Built here rather than in TestFixtures
// because they exist only to be reset, and giving the shared fixture patient a
// working password would make every other suite's "no account can be used to
// sign in" guarantee false.
// --------------------------------------------------------------------------
const U_NORMAL = 'zz_reset_normal';
const U_NOEMAIL = 'zz_reset_noemail';
const U_SUSPENDED = 'zz_reset_suspended';
const U_BADEMAIL = 'zz_reset_bademail';
const START_PASSWORD = 'ZzReset#Start-1';

function makeUser(string $username, string $status, ?string $email): int
{
    global $db;

    $roleId = $db->query("SELECT id FROM roles WHERE name = 'doctor' LIMIT 1")->fetchColumn()
        ?: $db->query('SELECT id FROM roles ORDER BY id LIMIT 1')->fetchColumn();

    $stmt = $db->prepare('SELECT id FROM users WHERE username = ? LIMIT 1');
    $stmt->execute([$username]);
    $id = $stmt->fetchColumn();

    if ($id === false) {
        $db->prepare('INSERT INTO users (username, password, role_id, status, created_at) VALUES (?, ?, ?, ?, NOW())')
            ->execute([$username, password_hash(START_PASSWORD, PASSWORD_DEFAULT), $roleId, $status]);
        $id = (int) $db->lastInsertId();
    } else {
        $id = (int) $id;
        $db->prepare('UPDATE users SET password = ?, status = ?, is_locked = 0, failed_login_attempts = 0, deleted_at = NULL WHERE id = ?')
            ->execute([password_hash(START_PASSWORD, PASSWORD_DEFAULT), $status, $id]);
    }

    // An address lives on employees for staff; no row means no address, which
    // is one of the cases that must still answer identically.
    $db->prepare('DELETE FROM employees WHERE user_id = ?')->execute([$id]);

    if ($email !== null) {
        $dept = $db->query('SELECT id FROM departments ORDER BY id LIMIT 1')->fetchColumn();
        // employees.phone carries a unique key, so each fixture employee needs
        // its own -- two of them sharing a placeholder fails the insert.
        $db->prepare(
            "INSERT INTO employees (user_id, employee_no, first_name, last_name, email, phone, department_id, created_at)
             VALUES (?, ?, 'Zz', 'Reset', ?, ?, ?, NOW())"
        )->execute([$id, 'ZZRESET-' . $id, $email, '000-' . str_pad((string) $id, 7, '0', STR_PAD_LEFT), $dept]);
    }

    $db->prepare('DELETE FROM password_reset_codes WHERE user_id = ?')->execute([$id]);
    $db->prepare('DELETE FROM user_password_history WHERE user_id = ?')->execute([$id]);

    return $id;
}

function clearResetRows(): void
{
    global $db;

    $db->exec("DELETE FROM password_reset_codes WHERE requested_username LIKE 'zz_reset%' OR requested_ip LIKE '203.0.113.%'");
}

$settingWas = $db->query('SELECT allow_self_password_reset FROM general_settings ORDER BY id LIMIT 1')->fetchColumn();

try {

$db->exec('UPDATE general_settings SET allow_self_password_reset = 1 ORDER BY id LIMIT 1');

$normalId = makeUser(U_NORMAL, 'active', 'zz.reset.normal@example.invalid');
$noEmailId = makeUser(U_NOEMAIL, 'active', null);
$suspendedId = makeUser(U_SUSPENDED, 'suspended', 'zz.reset.suspended@example.invalid');

// A real shape of broken data, not an invented one: accounts in this system
// have carried a username with a domain stapled on the end, which is two @
// signs and deliverable nowhere.
$badEmailId = makeUser(U_BADEMAIL, 'active', 'zz.reset.bad@example.invalid@intellix.hospital');

check('four test accounts exist', $normalId > 0 && $noEmailId > 0 && $suspendedId > 0 && $badEmailId > 0);

// ==========================================================================
// 1. THE ANSWER MUST NOT REVEAL WHETHER THE ACCOUNT EXISTS.
// ==========================================================================
echo "\n-- No account enumeration --\n";

clearResetRows();
ResetUnderTest::reset_();

$real = ResetUnderTest::request(U_NORMAL, '203.0.113.1');
$unknown = ResetUnderTest::request('zz_reset_nobody_at_all', '203.0.113.2');
$suspended = ResetUnderTest::request(U_SUSPENDED, '203.0.113.3');
$noEmail = ResetUnderTest::request(U_NOEMAIL, '203.0.113.4');

check('a real account gets the uniform reply', $real['message'] === PasswordResetService::UNIFORM_REPLY);
check('an unknown username gets the SAME reply', $unknown['message'] === $real['message'], $unknown['message']);
check('a suspended account gets the SAME reply', $suspended['message'] === $real['message'], $suspended['message']);
check('an account with no address gets the SAME reply', $noEmail['message'] === $real['message'], $noEmail['message']);

check('all four report success, so the status code cannot be read either',
    !empty($real['success']) && !empty($unknown['success']) && !empty($suspended['success']) && !empty($noEmail['success']));
check('and all four carry the identical payload shape',
    json_encode($real['data']) === json_encode($unknown['data'])
    && json_encode($real['data']) === json_encode($suspended['data'])
    && json_encode($real['data']) === json_encode($noEmail['data']));

check('only the real account was actually sent anything', count(ResetUnderTest::$sent) === 1,
    count(ResetUnderTest::$sent) . ' sends');
check('and it went to the address on that account',
    (ResetUnderTest::$sent[0]['email'] ?? '') === 'zz.reset.normal@example.invalid');

check('a row is written even when nothing was sent, so the attempt is visible and rate-limited',
    (int) $db->query("SELECT COUNT(*) FROM password_reset_codes WHERE requested_username = 'zz_reset_nobody_at_all'")->fetchColumn() === 1);
check('the unknown-username row has no account attached',
    $db->query("SELECT user_id FROM password_reset_codes WHERE requested_username = 'zz_reset_nobody_at_all' LIMIT 1")->fetchColumn() === null);
check('a suspended account is never sent a code',
    (int) $db->query("SELECT was_sent FROM password_reset_codes WHERE user_id = {$suspendedId} ORDER BY id DESC LIMIT 1")->fetchColumn() === 0);

// ==========================================================================
// 1b. An address that cannot be delivered to is the same as no address.
//
// This is here because of a real failure: a reset was requested, the account
// matched, a code was generated and handed to the mailer, and the audit line
// read "the email could not be sent" -- which reads as a mail server problem
// when the actual fault was the address on the staff record. Worse, a code
// hash would have been stored for a code nobody could ever receive.
// ==========================================================================
echo "\n-- An unusable address --\n";

$sentBefore = count(ResetUnderTest::$sent);
$bad = ResetUnderTest::request(U_BADEMAIL, '203.0.113.9');

check('an account with a malformed address gets the SAME reply', $bad['message'] === $real['message'], $bad['message']);
check('the mailer is never handed a malformed address', count(ResetUnderTest::$sent) === $sentBefore,
    (count(ResetUnderTest::$sent) - $sentBefore) . ' unexpected sends');

$badRow = $db->query("SELECT was_sent, code_hash, expires_at FROM password_reset_codes WHERE user_id = {$badEmailId} ORDER BY id DESC LIMIT 1")
    ->fetch(PDO::FETCH_ASSOC);

check('a row is still written, so the attempt is visible and counts against the limits', $badRow !== false);
check('it is marked as not sent', (int) ($badRow['was_sent'] ?? 1) === 0);
// array_key_exists, not ??: `null ?? 'x'` is 'x', so a `?? 'x'` comparison can
// never assert that a column IS null -- it would pass on a missing key and fail
// on the very thing it means to check.
check('and it stores no code hash, because a hash for an undeliverable code is a live credential nobody can use',
    is_array($badRow) && array_key_exists('code_hash', $badRow) && $badRow['code_hash'] === null);
check('and no expiry either',
    is_array($badRow) && array_key_exists('expires_at', $badRow) && $badRow['expires_at'] === null);

check('the audit line names the address as the fault, not the mail server',
    (bool) $db->query(
        "SELECT COUNT(*) FROM hipaa_audit_logs
          WHERE action = 'PASSWORD_RESET_REQUESTED'
            AND description LIKE '%" . U_BADEMAIL . "%'
            AND description LIKE '%not a valid address%'"
    )->fetchColumn());

// ==========================================================================
// 2. What is stored.
// ==========================================================================
echo "\n-- What lands in the table --\n";

$code = ResetUnderTest::lastCode();
$row = $db->query("SELECT * FROM password_reset_codes WHERE user_id = {$normalId} ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);

check('the code is six digits', is_string($code) && preg_match('/^\d{6}$/', $code) === 1);
check('the code is NOT stored in the clear', $row && strpos(json_encode($row), (string) $code) === false,
    'the plaintext code appears in the row');
check('a SHA-256 of it is stored instead', $row && $row['code_hash'] === hash('sha256', (string) $code));
check('it has an expiry', $row && $row['expires_at'] !== null);
check('the expiry is the documented TTL',
    $row && abs((strtotime($row['expires_at']) - strtotime($row['created_at'])) - PasswordResetService::CODE_TTL_MINUTES * 60) <= 2,
    (string) ($row['expires_at'] ?? ''));
check('it is unconsumed', $row && $row['consumed_at'] === null);
check('with no attempts yet', $row && (int) $row['attempts'] === 0);
check('the requesting address is kept', $row && $row['requested_ip'] === '203.0.113.1');

check('no code hash is stored for an account with no address -- it would be a live credential for nobody',
    $db->query("SELECT code_hash FROM password_reset_codes WHERE user_id = {$noEmailId} ORDER BY id DESC LIMIT 1")->fetchColumn() === null);

// ==========================================================================
// 3. Guessing.
// ==========================================================================
echo "\n-- Guessing the code --\n";

$wrong = $code === '000000' ? '111111' : '000000';

$res = ResetUnderTest::verify(U_NORMAL, $wrong);
check('a wrong code is refused', empty($res['success']));
check('and the message does not say whether the account exists',
    stripos((string) $res['message'], 'not right') !== false && stripos((string) $res['message'], 'no such') === false,
    (string) $res['message']);
check('the attempt is counted',
    (int) $db->query("SELECT attempts FROM password_reset_codes WHERE id = {$row['id']}")->fetchColumn() === 1);

$res = ResetUnderTest::verify('zz_reset_nobody_at_all', '123456');
check('a code for an account that does not exist fails the same way',
    empty($res['success']) && stripos((string) $res['message'], 'not right') !== false);

$res = ResetUnderTest::verify(U_NORMAL, 'abcdef');
check('a non-numeric code is refused', empty($res['success']));
check('and costs no attempt, because it was never a candidate',
    (int) $db->query("SELECT attempts FROM password_reset_codes WHERE id = {$row['id']}")->fetchColumn() === 1);

// Burn through the remaining attempts.
for ($i = 0; $i < PasswordResetService::MAX_ATTEMPTS; $i++) {
    ResetUnderTest::verify(U_NORMAL, $wrong);
}

$res = ResetUnderTest::verify(U_NORMAL, $code);
check('after too many wrong guesses even the RIGHT code is refused', empty($res['success']), json_encode($res));
check('and says the code is retired rather than that it was wrong',
    stripos((string) $res['message'], 'too many') !== false, (string) $res['message']);

check('a PASSWORD_RESET_FAILED row was written when the code was retired',
    (int) $db->query("SELECT COUNT(*) FROM hipaa_audit_logs WHERE action = 'PASSWORD_RESET_FAILED' AND user_id = {$normalId}")->fetchColumn() >= 1);

// ==========================================================================
// 4. The happy path.
// ==========================================================================
echo "\n-- Resetting the password --\n";

clearResetRows();
ResetUnderTest::reset_();

ResetUnderTest::request(U_NORMAL, '203.0.113.10');
$code = ResetUnderTest::lastCode();

$res = ResetUnderTest::verify(U_NORMAL, $code);
check('the right code verifies', !empty($res['success']), json_encode($res));

check('verifying does NOT spend the code',
    $db->query("SELECT consumed_at FROM password_reset_codes WHERE user_id = {$normalId} ORDER BY id DESC LIMIT 1")->fetchColumn() === null);

$newPassword = 'ZzReset#Fresh-2';
$res = ResetUnderTest::reset(U_NORMAL, $code, $newPassword);

check('the password can be reset with it', !empty($res['success']), json_encode($res));

$after = $db->query("SELECT * FROM users WHERE id = {$normalId}")->fetch(PDO::FETCH_ASSOC);

check('the new password authenticates', User::verifyPassword($newPassword, $after['password']));
check('the old one no longer does', !User::verifyPassword(START_PASSWORD, $after['password']));
check('it is bcrypt, through the normal hashing path',
    (password_get_info($after['password'])['algoName'] ?? '') === 'bcrypt');
check('password_changed_at was stamped', $after['password_changed_at'] !== null);
check('must_change_password is clear', (int) $after['must_change_password'] === 0);
check('password_breached is clear', (int) $after['password_breached'] === 0);

check('the old hash went into history, so it cannot be set back',
    (int) $db->query("SELECT COUNT(*) FROM user_password_history WHERE user_id = {$normalId}")->fetchColumn() >= 1);

check('the code is now spent',
    $db->query("SELECT consumed_at FROM password_reset_codes WHERE user_id = {$normalId} ORDER BY id DESC LIMIT 1")->fetchColumn() !== null);

$res = ResetUnderTest::reset(U_NORMAL, $code, 'ZzReset#Third-3');
check('the same code cannot be used twice', empty($res['success']), json_encode($res));
check('and the password did not change again',
    User::verifyPassword($newPassword, (string) $db->query("SELECT password FROM users WHERE id = {$normalId}")->fetchColumn()));

check('the account holder was told their password changed', ResetUnderTest::$changeNotices === 1);

check('a PASSWORD_RESET_COMPLETED row was written',
    (int) $db->query("SELECT COUNT(*) FROM hipaa_audit_logs WHERE action = 'PASSWORD_RESET_COMPLETED' AND user_id = {$normalId}")->fetchColumn() === 1);
check('and the normal PASSWORD_CHANGED row too, so a reset looks like any other change in the trail',
    (int) $db->query("SELECT COUNT(*) FROM hipaa_audit_logs WHERE action = 'PASSWORD_CHANGED' AND user_id = {$normalId}")->fetchColumn() >= 1);

// ==========================================================================
// 5. A reset cannot get around the rules.
// ==========================================================================
echo "\n-- The rules that apply everywhere else apply here --\n";

clearResetRows();
ResetUnderTest::reset_();
ResetUnderTest::request(U_NORMAL, '203.0.113.11');
$code = ResetUnderTest::lastCode();

$res = ResetUnderTest::reset(U_NORMAL, $code, 'short');
check('a weak password is refused', empty($res['success']), json_encode($res));
check('with the application\'s own complexity message', isset($res['errors']['password']));
check('and the code is NOT spent -- the wrong mistake would be punished',
    $db->query("SELECT consumed_at FROM password_reset_codes WHERE user_id = {$normalId} ORDER BY id DESC LIMIT 1")->fetchColumn() === null);

$res = ResetUnderTest::reset(U_NORMAL, $code, $newPassword);
check('the password it was just changed from is refused as a reuse', empty($res['success']), json_encode($res));
check('and that did not spend the code either',
    $db->query("SELECT consumed_at FROM password_reset_codes WHERE user_id = {$normalId} ORDER BY id DESC LIMIT 1")->fetchColumn() === null);

$res = ResetUnderTest::reset(U_NORMAL, $code, 'ZzReset#Fourth-4');
check('a fresh strong password is accepted on the same code', !empty($res['success']), json_encode($res));

// ==========================================================================
// 6. Expiry, retirement, and the absence of a fallback.
// ==========================================================================
echo "\n-- Expiry and failure --\n";

clearResetRows();
ResetUnderTest::reset_();

ResetUnderTest::request(U_NORMAL, '203.0.113.12');
$code = ResetUnderTest::lastCode();
$db->exec("UPDATE password_reset_codes SET expires_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE user_id = {$normalId}");

$res = ResetUnderTest::verify(U_NORMAL, $code);
check('an expired code is refused', empty($res['success']));

clearResetRows();
ResetUnderTest::reset_();

ResetUnderTest::request(U_NORMAL, '203.0.113.13');
$first = ResetUnderTest::lastCode();
$db->exec("UPDATE password_reset_codes SET created_at = DATE_SUB(created_at, INTERVAL 10 MINUTE) WHERE user_id = {$normalId}");
ResetUnderTest::request(U_NORMAL, '203.0.113.13');
$second = ResetUnderTest::lastCode();

check('asking again issues a different code', $first !== $second);
check('and the first one stops working the moment the second is issued',
    empty(ResetUnderTest::verify(U_NORMAL, $first)['success']));
check('while the new one works', !empty(ResetUnderTest::verify(U_NORMAL, $second)['success']));

clearResetRows();
ResetUnderTest::reset_();
ResetUnderTest::$failNextSend = true;

$res = ResetUnderTest::request(U_NORMAL, '203.0.113.14');

check('a failed send still answers with the uniform reply', $res['message'] === PasswordResetService::UNIFORM_REPLY);
check('THE CODE IS NOT HANDED BACK TO A CALLER OVER THE NETWORK -- unlike the 2FA fallback',
    stripos(json_encode($res), 'code') === false || !preg_match('/\d{6}/', json_encode($res['data'] ?? [])),
    json_encode($res));
check('nothing usable was stored, so nobody can complete a reset off a failed send',
    $db->query("SELECT code_hash FROM password_reset_codes WHERE user_id = {$normalId} ORDER BY id DESC LIMIT 1")->fetchColumn() === null);
check('and the row records that the send failed',
    (int) $db->query("SELECT was_sent FROM password_reset_codes WHERE user_id = {$normalId} ORDER BY id DESC LIMIT 1")->fetchColumn() === 0);

// ==========================================================================
// 6b. The one exception: a caller AT THE SERVER, when mail is down.
//
// Schema 345 is the argument. The assertions that matter here are the ones
// that say NO: every condition is tested by removing it and watching the code
// stay hidden, because a fence is only worth what its narrowest side is worth.
// ==========================================================================
echo "\n-- The on-screen fallback, and its three fences --\n";

$devSettingWas = $db->query('SELECT allow_password_reset_dev_code FROM general_settings ORDER BY id LIMIT 1')->fetchColumn();
$db->exec('UPDATE general_settings SET allow_password_reset_dev_code = 1 ORDER BY id LIMIT 1');

clearResetRows();
ResetUnderTest::reset_();
ResetUnderTest::$failNextSend = true;

$dev = ResetUnderTest::request(U_NORMAL, '127.0.0.1');
$devCode = $dev['data']['dev_code'] ?? null;

check('mail down + staff + at the server: the code comes back on screen',
    !empty($dev['data']['dev_mode']) && is_string($devCode) && preg_match('/^\d{6}$/', $devCode) === 1,
    json_encode($dev['data'] ?? []));
check('and the reply says so rather than claiming an email is on its way',
    ($dev['message'] ?? '') !== PasswordResetService::UNIFORM_REPLY);

$devRow = $db->query("SELECT code_hash, method, was_sent, expires_at FROM password_reset_codes WHERE user_id = {$normalId} ORDER BY id DESC LIMIT 1")
    ->fetch(PDO::FETCH_ASSOC);

check('the code is stored hashed, exactly as an emailed one would be',
    is_array($devRow) && $devRow['code_hash'] === hash('sha256', (string) $devCode));
check('it is marked method = on_screen, so this is answerable later',
    ($devRow['method'] ?? '') === 'on_screen');
check('was_sent stays 0, because no email went out',
    (int) ($devRow['was_sent'] ?? 1) === 0);
check('and it carries an expiry like any other code',
    is_array($devRow) && $devRow['expires_at'] !== null);

check('the code shown actually works',
    !empty(ResetUnderTest::verify(U_NORMAL, (string) $devCode)['success']));

check('every use is audited under its own action, not buried in a description',
    (int) $db->query(
        "SELECT COUNT(*) FROM hipaa_audit_logs
          WHERE action = 'PASSWORD_RESET_CODE_SHOWN_ON_SCREEN' AND user_id = {$normalId}"
    )->fetchColumn() >= 1);

// Fence 1: not from anywhere else. 127.0.0.2 is still loopback to the kernel
// and is deliberately not accepted -- the test is the literal address.
foreach (['203.0.113.14', '192.168.1.50', '127.0.0.2', null] as $where) {
    clearResetRows();
    ResetUnderTest::reset_();
    ResetUnderTest::$failNextSend = true;

    $off = ResetUnderTest::request(U_NORMAL, $where);

    check('no code on screen for a caller at ' . ($where ?? 'an unknown address'),
        empty($off['data']['dev_code']) && empty($off['data']['dev_mode']),
        json_encode($off['data'] ?? []));
}

// Fence 1 again, the part that matters in production: behind a proxy every
// caller looks like loopback, so a forwarding header disqualifies the request
// however local the socket appears.
foreach (['HTTP_X_FORWARDED_FOR' => '203.0.113.99', 'HTTP_X_REAL_IP' => '203.0.113.99',
          'HTTP_FORWARDED' => 'for=203.0.113.99', 'HTTP_CLIENT_IP' => '203.0.113.99'] as $header => $value) {
    clearResetRows();
    ResetUnderTest::reset_();
    ResetUnderTest::$failNextSend = true;

    $_SERVER[$header] = $value;
    $proxied = ResetUnderTest::request(U_NORMAL, '127.0.0.1');
    unset($_SERVER[$header]);

    check("no code on screen when the request carries {$header}",
        empty($proxied['data']['dev_code']) && empty($proxied['data']['dev_mode']),
        json_encode($proxied['data'] ?? []));
}

// Fence 2: staff only. The shared fixture patient has a patients row, which is
// what makes contactForUser() report is_patient.
$patientUserId = (int) $db->query(
    'SELECT u.id FROM users u JOIN patients p ON p.user_id = u.id
      WHERE u.deleted_at IS NULL AND p.deleted_at IS NULL ORDER BY u.id LIMIT 1'
)->fetchColumn();

if ($patientUserId > 0) {
    $patientName = (string) $db->query("SELECT username FROM users WHERE id = {$patientUserId}")->fetchColumn();

    $db->prepare("UPDATE users SET status = 'active' WHERE id = ?")->execute([$patientUserId]);
    $db->prepare('DELETE FROM password_reset_codes WHERE user_id = ?')->execute([$patientUserId]);

    ResetUnderTest::reset_();
    ResetUnderTest::$failNextSend = true;

    $patientTry = ResetUnderTest::request($patientName, '127.0.0.1');

    check('a PATIENT account gets no code on screen, even from the server itself',
        empty($patientTry['data']['dev_code']) && empty($patientTry['data']['dev_mode']),
        json_encode($patientTry['data'] ?? []));
    check('and nothing usable was stored for it either',
        $db->query("SELECT code_hash FROM password_reset_codes WHERE user_id = {$patientUserId} ORDER BY id DESC LIMIT 1")->fetchColumn() === null);

    $db->prepare('DELETE FROM password_reset_codes WHERE user_id = ?')->execute([$patientUserId]);
} else {
    check('a patient account exists to test the staff-only fence with', false, 'no patient user in the fixture database');
}

// Fence 3: the send actually failed. A working mail server must never show it.
clearResetRows();
ResetUnderTest::reset_();

$worked = ResetUnderTest::request(U_NORMAL, '127.0.0.1');

check('a SUCCESSFUL send never shows the code, even at the server',
    empty($worked['data']['dev_code']) && empty($worked['data']['dev_mode']),
    json_encode($worked['data'] ?? []));
check('and that one answers with the uniform reply again',
    $worked['message'] === PasswordResetService::UNIFORM_REPLY);
check('the emailed row is method = email',
    $db->query("SELECT method FROM password_reset_codes WHERE user_id = {$normalId} ORDER BY id DESC LIMIT 1")->fetchColumn() === 'email');

// And the off switch.
$db->exec('UPDATE general_settings SET allow_password_reset_dev_code = 0 ORDER BY id LIMIT 1');

clearResetRows();
ResetUnderTest::reset_();
ResetUnderTest::$failNextSend = true;

$switchedOff = ResetUnderTest::request(U_NORMAL, '127.0.0.1');

check('with allow_password_reset_dev_code = 0 there is no fallback at all',
    empty($switchedOff['data']['dev_code']) && empty($switchedOff['data']['dev_mode']),
    json_encode($switchedOff['data'] ?? []));
check('and the uniform reply comes back, as it did before any of this existed',
    $switchedOff['message'] === PasswordResetService::UNIFORM_REPLY);

$db->prepare('UPDATE general_settings SET allow_password_reset_dev_code = ? ORDER BY id LIMIT 1')
    ->execute([(int) $devSettingWas]);

// ==========================================================================
// 7. Rate limits.
// ==========================================================================
echo "\n-- Rate limits --\n";

clearResetRows();
ResetUnderTest::reset_();

ResetUnderTest::request(U_NORMAL, '203.0.113.20');
$sentAfterFirst = count(ResetUnderTest::$sent);
ResetUnderTest::request(U_NORMAL, '203.0.113.20');

check('a second request inside the cooldown sends nothing', count(ResetUnderTest::$sent) === $sentAfterFirst);
check('but still answers identically, so the cooldown is not observable',
    ResetUnderTest::request(U_NORMAL, '203.0.113.20')['message'] === PasswordResetService::UNIFORM_REPLY);

clearResetRows();
ResetUnderTest::reset_();

// Age each request so the cooldown is not what stops it.
for ($i = 0; $i < PasswordResetService::MAX_PER_USER_PER_DAY; $i++) {
    ResetUnderTest::request(U_NORMAL, '203.0.113.21');
    $db->exec("UPDATE password_reset_codes SET created_at = DATE_SUB(created_at, INTERVAL 10 MINUTE) WHERE user_id = {$normalId}");
}

$before = count(ResetUnderTest::$sent);
ResetUnderTest::request(U_NORMAL, '203.0.113.21');

check('the daily limit for one account stops further codes', count(ResetUnderTest::$sent) === $before,
    count(ResetUnderTest::$sent) . ' vs ' . $before);

clearResetRows();
ResetUnderTest::reset_();

for ($i = 0; $i < PasswordResetService::MAX_PER_IP_PER_HOUR; $i++) {
    ResetUnderTest::request('zz_reset_guess_' . $i, '203.0.113.30');
}

$res = ResetUnderTest::request('zz_reset_guess_final', '203.0.113.30');

check('an address hammering unknown usernames is cut off', empty($res['success']), json_encode($res));
check('which is the only limit that can stop username guessing, since there is no account to count against',
    stripos((string) $res['message'], 'too many') !== false, (string) $res['message']);

// ==========================================================================
// 8. A locked account can still recover; a switched-off hospital cannot.
// ==========================================================================
echo "\n-- Locked out, and switched off --\n";

clearResetRows();
ResetUnderTest::reset_();

$db->exec("UPDATE users SET is_locked = 1, failed_login_attempts = 9 WHERE id = {$normalId}");

ResetUnderTest::request(U_NORMAL, '203.0.113.40');
$code = ResetUnderTest::lastCode();

check('a LOCKED account can still be sent a code -- this is how somebody gets back in', is_string($code));

$res = ResetUnderTest::reset(U_NORMAL, (string) $code, 'ZzReset#Fifth-5');
check('and can complete the reset', !empty($res['success']), json_encode($res));

$after = $db->query("SELECT is_locked, failed_login_attempts FROM users WHERE id = {$normalId}")->fetch(PDO::FETCH_ASSOC);
check('the lock is cleared by it', (int) $after['is_locked'] === 0);
check('and the failed-attempt count with it', (int) $after['failed_login_attempts'] === 0);

clearResetRows();
ResetUnderTest::reset_();
$db->exec('UPDATE general_settings SET allow_self_password_reset = 0 ORDER BY id LIMIT 1');

$res = ResetUnderTest::request(U_NORMAL, '203.0.113.50');
check('with the feature off, the request is refused', empty($res['success']));
check('and says so plainly, because that is a fact about the hospital and not about the account',
    stripos((string) $res['message'], 'service desk') !== false, (string) $res['message']);
check('nothing was sent', count(ResetUnderTest::$sent) === 0);

$res = ResetUnderTest::reset(U_NORMAL, '123456', 'ZzReset#Sixth-6');
check('and completing a reset is refused too, not just requesting one', empty($res['success']));

$db->exec('UPDATE general_settings SET allow_self_password_reset = 1 ORDER BY id LIMIT 1');

// ==========================================================================
// 9. Constants and shape.
// ==========================================================================
echo "\n-- Constants --\n";

check('the TTL is short', PasswordResetService::CODE_TTL_MINUTES > 0 && PasswordResetService::CODE_TTL_MINUTES <= 30);
check('guesses are capped', PasswordResetService::MAX_ATTEMPTS >= 3 && PasswordResetService::MAX_ATTEMPTS <= 10);
check('there is a resend cooldown', PasswordResetService::RESEND_COOLDOWN_SECONDS >= 30);
check('there is a per-account daily cap', PasswordResetService::MAX_PER_USER_PER_DAY >= 1);
check('and a per-address hourly cap', PasswordResetService::MAX_PER_IP_PER_HOUR >= 1);
check('the uniform reply promises nothing about the account existing',
    stripos(PasswordResetService::UNIFORM_REPLY, 'if that account exists') !== false,
    PasswordResetService::UNIFORM_REPLY);

// Proved by reflection rather than by behaviour. `|| true` would pass whatever
// happened, and the thing being asserted -- that no real email left this
// machine -- is exactly the one worth a check that can actually fail.
$sendDeclaredIn = (new ReflectionMethod(ResetUnderTest::class, 'send'))->getDeclaringClass()->getName();
$notifyDeclaredIn = (new ReflectionMethod(ResetUnderTest::class, 'notifyChanged'))->getDeclaringClass()->getName();

check('send() really was overridden, so no real email left this machine',
    $sendDeclaredIn === ResetUnderTest::class, $sendDeclaredIn);
check('and so was the "your password changed" notice',
    $notifyDeclaredIn === ResetUnderTest::class, $notifyDeclaredIn);
check('the service calls them through static::, which is what makes the override take effect',
    str_contains((string) file_get_contents(__DIR__ . '/../backend/app/Modules/Auth/Services/PasswordResetService.php'), 'static::send(')
    && str_contains((string) file_get_contents(__DIR__ . '/../backend/app/Modules/Auth/Services/PasswordResetService.php'), 'static::notifyChanged('));

} finally {
    // Put everything back, pass or fail.
    $db->prepare('UPDATE general_settings SET allow_self_password_reset = ? ORDER BY id LIMIT 1')->execute([$settingWas]);

    clearResetRows();

    foreach ([U_NORMAL, U_NOEMAIL, U_SUSPENDED] as $u) {
        $stmt = $db->prepare('SELECT id FROM users WHERE username = ?');
        $stmt->execute([$u]);
        $id = $stmt->fetchColumn();

        if ($id !== false) {
            $id = (int) $id;
            $db->prepare('DELETE FROM password_reset_codes WHERE user_id = ?')->execute([$id]);
            $db->prepare('DELETE FROM user_password_history WHERE user_id = ?')->execute([$id]);
            $db->prepare('DELETE FROM employees WHERE user_id = ?')->execute([$id]);
            $db->prepare('DELETE FROM users WHERE id = ?')->execute([$id]);
        }
    }
}

echo "\n==================================================\n";
echo "  {$pass} passed, {$fail} failed\n";
echo "==================================================\n";

exit($fail === 0 ? 0 : 1);
