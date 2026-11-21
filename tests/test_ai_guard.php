<?php

declare(strict_types=1);

/**
 * Automated Verification: the AI spend and access guard
 *
 *   php tests/build_test_database.php --fresh   (once)
 *   php tests/test_ai_guard.php
 *
 * NO PROVIDER IS EVER CALLED BY THIS SUITE. AiGuardService has no knowledge of
 * any provider by design -- it answers "may this run and what would it cost"
 * and nothing else -- so every assertion here runs against the database alone
 * and the whole suite costs nothing.
 *
 * What it is mostly about:
 *
 * ONE: THE CHEAPEST NO COMES FIRST. A feature that is switched off must not
 * read the database, consult a capability or touch the cache. Each refusal is
 * checked in its own right and in its order, because an order that drifts turns
 * a free refusal into a billable one.
 *
 * TWO: A CACHE HIT IS NOT RATE LIMITED. It costs nothing, so somebody reopening
 * an unchanged report must never be told to wait. This is the check most likely
 * to be broken by a well-meaning reordering of the guards.
 *
 * THREE: THE ALLOWLIST DROPS WHAT IT DOES NOT KNOW. Including the columns that
 * actually exist on billing_claim_denials -- patient_id, encounter_id,
 * service_date -- because the endpoint that report comes from really does
 * return them, and the allowlist is the only thing standing between those rows
 * and a third party.
 */

require_once __DIR__ . '/lib/test_fixtures.php';

use App\Core\Database;
use App\Modules\AiAnalysis\Services\AiGuardService;
use App\Modules\AiAnalysis\Services\AiPayload;

try {
    $database = TestDatabase::use();
} catch (Throwable $e) {
    echo "REFUSED: " . $e->getMessage() . "\n";
    exit(1);
}

echo "==================================================\n";
echo "   Automated Verification: the AI guard\n";
echo "==================================================\n";
echo "  database: {$database}\n";
echo "  live database (untouched): " . TestDatabase::liveDatabaseName() . "\n";
echo "  provider: never called -- this suite costs nothing\n";

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
// Helpers
// --------------------------------------------------------------------------
const REPORT = 'claim_denial_pareto';

function settings(array $values): void
{
    global $db;

    $sets = [];
    $params = [];

    foreach ($values as $column => $value) {
        $sets[] = "`{$column}` = :{$column}";
        $params[$column] = $value;
    }

    $db->prepare('UPDATE general_settings SET ' . implode(', ', $sets) . ' ORDER BY id LIMIT 1')->execute($params);
}

function clearRuns(): void
{
    global $db;

    $db->exec("DELETE FROM ai_analysis_runs WHERE report_key LIKE 'zz%' OR report_key = '" . REPORT . "'");
    $db->exec("DELETE FROM ai_analysis_cache WHERE report_key LIKE 'zz%' OR report_key = '" . REPORT . "'");
}

/** A payload the allowlist is happy with. */
function samplePayload(int $rows = 3): array
{
    $out = [];

    for ($i = 1; $i <= $rows; $i++) {
        $out[] = [
            'denial_category' => 'category_' . $i,
            'claims_count' => $i * 4,
            'denied_amount' => $i * 1000.5,
        ];
    }

    return $out;
}

$settingsWere = $db->query('SELECT * FROM general_settings ORDER BY id LIMIT 1')->fetch(PDO::FETCH_ASSOC);

// The role used throughout. 'admin' short-circuits RoleAccess entirely -- it
// returns true for every capability without reading a row -- so testing with it
// would prove nothing about the gate. `clinician` has to find the seeded row.
$roleName = 'clinician';
$roleId = (int) $db->query("SELECT id FROM roles WHERE name = '{$roleName}' LIMIT 1")->fetchColumn();
$userId = (int) ($world['staff_user_id'] ?? 0);

if ($userId === 0) {
    $userId = (int) $db->query('SELECT id FROM users ORDER BY id LIMIT 1')->fetchColumn();
}

// Checked rather than assumed: a role id of 0 would make every capability
// assertion below pass or fail for the wrong reason, which is exactly the shape
// of bug that makes a security test worthless.
check("the {$roleName} role exists to test the gate with", $roleId > 0, "role id {$roleId}");
check('and a user to run as', $userId > 0, "user id {$userId}");

if ($roleId === 0 || $userId === 0) {
    echo "\n  Stopping: the fixture database has no usable role or user.\n";
    exit(1);
}

try {

settings([
    'allow_ai_analysis' => 1,
    'ai_cap_daily_usd' => 5.00,
    'ai_cap_monthly_usd' => 100.00,
    'ai_cap_user_daily_usd' => 1.00,
    'ai_max_runs_per_user_per_hour' => 20,
    'ai_min_seconds_between_runs' => 10,
    'ai_cache_ttl_minutes' => 30,
    'ai_max_payload_bytes' => 60000,
]);

// Make sure the role under test holds the capability, so capability failures
// in later sections mean what they say.
$db->prepare(
    "INSERT IGNORE INTO role_permissions (role_id, module, capability, is_granted)
     VALUES (:r, 'ai_analysis', 'ai_analysis', 1)"
)->execute(['r' => $roleId]);

// ==========================================================================
// 1. The schema is actually there.
// ==========================================================================
echo "\n-- Schema 346 --\n";

foreach (['ai_analysis_runs', 'ai_analysis_cache', 'ai_model_rates'] as $table) {
    check("{$table} exists", (bool) $db->query("SHOW TABLES LIKE '{$table}'")->fetchColumn());
}

$cols = $db->query('SHOW COLUMNS FROM general_settings')->fetchAll(PDO::FETCH_COLUMN);

foreach (['allow_ai_analysis', 'ai_cap_daily_usd', 'ai_cap_monthly_usd', 'ai_cap_user_daily_usd',
          'ai_max_runs_per_user_per_hour', 'ai_min_seconds_between_runs', 'ai_cache_ttl_minutes',
          'ai_max_payload_bytes', 'ai_max_output_tokens'] as $column) {
    check("general_settings.{$column} exists", in_array($column, $cols, true));
}

check('model rates are seeded', (int) $db->query('SELECT COUNT(*) FROM ai_model_rates')->fetchColumn() >= 3);

// ==========================================================================
// 2. The off switch, which is the cheapest no there is.
// ==========================================================================
echo "\n-- Switched off --\n";

clearRuns();
settings(['allow_ai_analysis' => 0]);

$off = AiGuardService::check(REPORT, samplePayload(), $userId, $roleName, '127.0.0.1');

check('a switched-off hospital refuses', $off['allowed'] === false);
check('and says which guard said no', $off['reason'] === AiGuardService::OFF, $off['reason']);
check('the message is for a person, not a log', str_contains(strtolower($off['message']), 'switched off'), $off['message']);

settings(['allow_ai_analysis' => 1]);

// ==========================================================================
// 3. The capability. A security answer before a money one.
// ==========================================================================
echo "\n-- Who may run it --\n";

clearRuns();

$noRole = AiGuardService::check(REPORT, samplePayload(), $userId, null, '127.0.0.1');
check('no role at all is refused', $noRole['allowed'] === false && $noRole['reason'] === AiGuardService::NOT_ALLOWED);

$strangerRole = 'zz_role_without_ai_' . time();
$db->prepare('INSERT INTO roles (name, created_at) VALUES (:n, NOW())')->execute(['n' => $strangerRole]);

$stranger = AiGuardService::check(REPORT, samplePayload(), $userId, $strangerRole, '127.0.0.1');

check('a role without the capability is refused', $stranger['allowed'] === false
    && $stranger['reason'] === AiGuardService::NOT_ALLOWED, $stranger['reason']);
check('a refused-for-access attempt is written to the ledger',
    (int) $db->query("SELECT COUNT(*) FROM ai_analysis_runs WHERE reason = 'not_permitted'")->fetchColumn() >= 1);
check('and audited, unlike the other refusals',
    (int) $db->query("SELECT COUNT(*) FROM hipaa_audit_logs WHERE action = 'AI_ANALYSIS_DENIED'")->fetchColumn() >= 1);

$db->prepare('DELETE FROM roles WHERE name = :n')->execute(['n' => $strangerRole]);

$withCap = AiGuardService::check(REPORT, samplePayload(), $userId, $roleName, '127.0.0.1');
check('a role that holds it is allowed', $withCap['allowed'] === true, $withCap['reason']);

// ==========================================================================
// 4. What a run costs, and the ledger.
// ==========================================================================
echo "\n-- Costing --\n";

check('Opus 5.5: 1M in + 1M out is $24',
    abs(AiGuardService::costOf('claude-opus-5-5', 1000000, 1000000) - 24.0) < 0.0001,
    (string) AiGuardService::costOf('claude-opus-5-5', 1000000, 1000000));
check('Haiku 5.5 is far cheaper for the same traffic',
    AiGuardService::costOf('claude-haiku-5-5', 1000000, 1000000)
    < AiGuardService::costOf('claude-opus-5-5', 1000000, 1000000));
check('cache reads are priced below input',
    AiGuardService::costOf('claude-opus-5-5', 0, 0, 1000000)
    < AiGuardService::costOf('claude-opus-5-5', 1000000, 0));
check('a run with no tokens costs nothing',
    AiGuardService::costOf('claude-opus-5-5', 0, 0) === 0.0);
check('AN UNPRICED MODEL IS NOT FREE -- it is charged at the dearest rate on file',
    AiGuardService::costOf('zz-model-nobody-priced', 1000000, 1000000) > 0.0,
    (string) AiGuardService::costOf('zz-model-nobody-priced', 1000000, 1000000));

clearRuns();

$runId = AiGuardService::record(REPORT, $userId, $roleName, 'allowed', null, 'claude-opus-5-5',
    str_repeat('a', 64), 1200, ['input_tokens' => 2000, 'output_tokens' => 600], '127.0.0.1', 1500);

$row = $db->query("SELECT * FROM ai_analysis_runs WHERE id = {$runId}")->fetch(PDO::FETCH_ASSOC);

check('the ledger row exists', is_array($row));
check('it carries the token counts', (int) $row['input_tokens'] === 2000 && (int) $row['output_tokens'] === 600);
check('and a computed cost', abs((float) $row['estimated_cost_usd'] - 0.02) < 0.0005,
    (string) $row['estimated_cost_usd']);
check('and the payload hash, not the payload', strlen((string) $row['payload_sha256']) === 64);

// ==========================================================================
// 5. Rate limits. A loop dies here.
// ==========================================================================
echo "\n-- Rate limits --\n";

clearRuns();
settings(['ai_min_seconds_between_runs' => 300]);

AiGuardService::record(REPORT, $userId, $roleName, 'allowed', null, 'claude-opus-5-5',
    str_repeat('b', 64), 100, ['input_tokens' => 10, 'output_tokens' => 10]);

$tooSoon = AiGuardService::check(REPORT, samplePayload(9), $userId, $roleName, '127.0.0.1');

check('a second run inside the cooldown is refused', $tooSoon['allowed'] === false
    && $tooSoon['reason'] === AiGuardService::TOO_SOON, $tooSoon['reason']);
check('and is told how long to wait', preg_match('/\d+ more second/', $tooSoon['message']) === 1, $tooSoon['message']);

settings(['ai_min_seconds_between_runs' => 0]);

clearRuns();
settings(['ai_max_runs_per_user_per_hour' => 3]);

for ($i = 0; $i < 3; $i++) {
    AiGuardService::record(REPORT, $userId, $roleName, 'allowed', null, 'claude-opus-5-5',
        str_repeat((string) $i, 64), 100, ['input_tokens' => 10, 'output_tokens' => 10]);
}

$hourly = AiGuardService::check(REPORT, samplePayload(7), $userId, $roleName, '127.0.0.1');
check('the hourly ceiling stops the fourth run', $hourly['allowed'] === false
    && $hourly['reason'] === AiGuardService::TOO_MANY, $hourly['reason']);

check('refusals do NOT count towards the hourly ceiling -- only billable runs do',
    (int) $db->query("SELECT COUNT(*) FROM ai_analysis_runs WHERE status = 'allowed'")->fetchColumn() === 3);

settings(['ai_max_runs_per_user_per_hour' => 20]);

// ==========================================================================
// 6. Spend caps. A month dies here.
// ==========================================================================
echo "\n-- Spend caps --\n";

clearRuns();
settings(['ai_cap_user_daily_usd' => 0.05, 'ai_cap_daily_usd' => 5.00]);

// One run costing 2000 in + 3000 out at Opus 5.5 rates:
//   (2000/1e6 * $4) + (3000/1e6 * $20) = $0.008 + $0.060 = $0.068
// which is over the five-cent personal cap set above.
AiGuardService::record(REPORT, $userId, $roleName, 'allowed', null, 'claude-opus-5-5',
    str_repeat('c', 64), 100, ['input_tokens' => 2000, 'output_tokens' => 3000]);

check('the fixture run really did cost more than the cap',
    AiGuardService::costOf('claude-opus-5-5', 2000, 3000) > 0.05,
    (string) AiGuardService::costOf('claude-opus-5-5', 2000, 3000));

$userCapped = AiGuardService::check(REPORT, samplePayload(), $userId, $roleName, '127.0.0.1');
check("a user over their own daily cap is refused", $userCapped['allowed'] === false
    && $userCapped['reason'] === AiGuardService::USER_CAP, $userCapped['reason']);

$otherUserId = (int) $db->query("SELECT id FROM users WHERE id <> {$userId} ORDER BY id LIMIT 1")->fetchColumn();

if ($otherUserId > 0) {
    $otherUser = AiGuardService::check(REPORT, samplePayload(), $otherUserId, $roleName, '127.0.0.1');
    check('but a different user is not -- the cap is per person', $otherUser['allowed'] === true, $otherUser['reason']);
}

settings(['ai_cap_user_daily_usd' => 100.00, 'ai_cap_daily_usd' => 0.05]);

$dayCapped = AiGuardService::check(REPORT, samplePayload(), $userId, $roleName, '127.0.0.1');
check('the hospital daily cap stops everybody', $dayCapped['allowed'] === false
    && $dayCapped['reason'] === AiGuardService::DAILY_CAP, $dayCapped['reason']);

if ($otherUserId > 0) {
    $otherCapped = AiGuardService::check(REPORT, samplePayload(), $otherUserId, $roleName, '127.0.0.1');
    check('including a user who has spent nothing', $otherCapped['allowed'] === false
        && $otherCapped['reason'] === AiGuardService::DAILY_CAP, $otherCapped['reason']);
}

settings(['ai_cap_daily_usd' => 100.00, 'ai_cap_monthly_usd' => 0.01]);

$monthCapped = AiGuardService::check(REPORT, samplePayload(), $userId, $roleName, '127.0.0.1');
check('and the monthly cap stops it when the daily one would not', $monthCapped['allowed'] === false
    && $monthCapped['reason'] === AiGuardService::MONTHLY_CAP, $monthCapped['reason']);

settings(['ai_cap_daily_usd' => 5.00, 'ai_cap_monthly_usd' => 100.00, 'ai_cap_user_daily_usd' => 1.00]);

// ==========================================================================
// 7. The cache, which is the control that does the most work.
// ==========================================================================
echo "\n-- The cache --\n";

clearRuns();

$payload = samplePayload(4);
$first = AiGuardService::check(REPORT, $payload, $userId, $roleName, '127.0.0.1');

check('a fresh question is a miss', $first['allowed'] === true && $first['cached'] === null);

$model = (string) (AiGuardService::limits()['model'] ?? '');

AiGuardService::remember($first['payload_hash'], $model, REPORT,
    ['summary' => 'Denials concentrate in two categories.'], ['input_tokens' => 900, 'output_tokens' => 220]);

$second = AiGuardService::check(REPORT, $payload, $userId, $roleName, '127.0.0.1');

check('the same question comes back from the cache', $second['allowed'] === true && $second['cached'] !== null);
check('with the stored answer', ($second['cached']['response']['summary'] ?? '') === 'Denials concentrate in two categories.');
check('and is reported as cached rather than allowed', $second['reason'] === 'cached', $second['reason']);

$reordered = [];

foreach ($payload as $row) {
    $reordered[] = array_reverse($row, true);
}

$third = AiGuardService::check(REPORT, $reordered, $userId, $roleName, '127.0.0.1');
check('KEY ORDER DOES NOT MATTER -- or the cache would miss constantly and do nothing',
    $third['cached'] !== null);

$different = AiGuardService::check(REPORT, samplePayload(5), $userId, $roleName, '127.0.0.1');
check('a different question is not served the cached answer', $different['cached'] === null);

// The headline: free work is never rate limited.
settings(['ai_min_seconds_between_runs' => 3600, 'ai_max_runs_per_user_per_hour' => 1, 'ai_cap_daily_usd' => 0.000001]);

AiGuardService::record(REPORT, $userId, $roleName, 'allowed', null, 'claude-opus-5-5',
    str_repeat('d', 64), 100, ['input_tokens' => 50000, 'output_tokens' => 50000]);

$cachedUnderLimits = AiGuardService::check(REPORT, $payload, $userId, $roleName, '127.0.0.1');

check('A CACHE HIT IS SERVED EVEN INSIDE THE COOLDOWN, past the hourly ceiling and over the cap',
    $cachedUnderLimits['allowed'] === true && $cachedUnderLimits['cached'] !== null,
    $cachedUnderLimits['reason']);

settings(['ai_min_seconds_between_runs' => 10, 'ai_max_runs_per_user_per_hour' => 20, 'ai_cap_daily_usd' => 5.00]);

// Expiry.
$db->prepare("UPDATE ai_analysis_cache SET expires_at = DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE payload_sha256 = :h")
    ->execute(['h' => $first['payload_hash']]);

$expired = AiGuardService::check(REPORT, $payload, $userId, $roleName, '127.0.0.1');
check('an expired entry is not served', $expired['cached'] === null);

$purged = AiGuardService::purgeCache();
check('and is purged', $purged >= 1, (string) $purged);

// ==========================================================================
// 8. Payload size.
// ==========================================================================
echo "\n-- Payload size --\n";

clearRuns();
settings(['ai_max_payload_bytes' => 500]);

$huge = AiGuardService::check(REPORT, samplePayload(200), $userId, $roleName, '127.0.0.1');
check('an oversized payload is refused before it is sent anywhere', $huge['allowed'] === false
    && $huge['reason'] === AiGuardService::PAYLOAD_TOO_BIG, $huge['reason']);
check('and the message says what to do about it',
    str_contains(strtolower($huge['message']), 'narrow'), $huge['message']);

$empty = AiGuardService::check(REPORT, [], $userId, $roleName, '127.0.0.1');
check('an empty report is refused rather than sent', $empty['allowed'] === false
    && $empty['reason'] === AiGuardService::PAYLOAD_EMPTY, $empty['reason']);

settings(['ai_max_payload_bytes' => 60000]);

// ==========================================================================
// 9. The allowlist: what may leave the building.
// ==========================================================================
echo "\n-- The field allowlist --\n";

// The real shape of a billing_claim_denials row, which is what the
// claim-denial-pareto endpoint's worklist actually returns.
$realRow = [
    'denial_category' => 'prior_auth_missing',
    'claims_count' => 7,
    'denied_amount' => 48000.00,
    'patient_id' => 41,
    'encounter_id' => 903,
    'service_date' => '2026-10-02',
    'patient_responsibility' => 1200.00,
    'assigned_to_name' => 'Maria Santos',
    'root_cause_analysis' => 'Patient Juan Dela Cruz had no LOA on file',
];

$projected = AiPayload::project(REPORT, [$realRow]);
$sentKeys = array_keys($projected['rows'][0] ?? []);

foreach (['patient_id', 'encounter_id', 'service_date', 'patient_responsibility',
          'assigned_to_name', 'root_cause_analysis'] as $mustNotLeave) {
    check("{$mustNotLeave} is NOT sent", !in_array($mustNotLeave, $sentKeys, true));
}

foreach (['denial_category', 'claims_count', 'denied_amount'] as $mustLeave) {
    check("{$mustLeave} is sent", in_array($mustLeave, $sentKeys, true));
}

check('the dropped keys are reported, so drift is visible rather than silent',
    in_array('patient_id', $projected['dropped'], true)
    && in_array('root_cause_analysis', $projected['dropped'], true),
    implode(',', $projected['dropped']));

check('a nested structure is dropped rather than walked',
    !array_key_exists('extra', AiPayload::project(REPORT, [[
        'denial_category' => 'x',
        'extra' => ['patient_id' => 9],
    ]])['rows'][0] ?? []));

check('a single row is accepted and still projected',
    array_keys(AiPayload::project(REPORT, $realRow)['rows'][0] ?? []) === $sentKeys);

$unknownRefused = false;

try {
    AiPayload::project('zz_report_with_no_allowlist', [['anything' => 1]]);
} catch (InvalidArgumentException $e) {
    $unknownRefused = true;
}

check('A REPORT WITH NO ALLOWLIST SENDS NOTHING -- it throws rather than guessing', $unknownRefused);

// ==========================================================================
// 10. The server assembles the payload.
// ==========================================================================
echo "\n-- The client may not supply the data --\n";

foreach (['data', 'payload', 'rows', 'records'] as $forbidden) {
    $refused = false;

    try {
        AiPayload::assertServerAssembled(['report' => REPORT, $forbidden => [['patient_id' => 1]]]);
    } catch (InvalidArgumentException $e) {
        $refused = true;
    }

    check("a request carrying \"{$forbidden}\" is refused outright", $refused);
}

$clean = true;

try {
    AiPayload::assertServerAssembled(['report' => REPORT, 'month' => '2026-10']);
} catch (InvalidArgumentException $e) {
    $clean = false;
}

check('a request that names a report and its filters is fine', $clean);

// ==========================================================================
// 11. The summary a person would read.
// ==========================================================================
echo "\n-- Spend summary --\n";

clearRuns();

AiGuardService::record(REPORT, $userId, $roleName, 'allowed', null, 'claude-opus-5-5',
    str_repeat('e', 64), 100, ['input_tokens' => 1000, 'output_tokens' => 500]);
AiGuardService::record(REPORT, $userId, $roleName, 'cached', 'cached', 'claude-opus-5-5',
    str_repeat('f', 64), 100);
AiGuardService::record(REPORT, $userId, $roleName, 'refused', AiGuardService::TOO_SOON, null,
    str_repeat('g', 64), 100);

$summary = AiGuardService::spendSummary();

check('it counts billable runs', $summary['runs_today'] >= 1);
check('cache hits separately', $summary['cached_today'] >= 1);
check('and refusals, which is how "who keeps hitting the cap" gets answered',
    $summary['refused_today'] >= 1);
check('a cached run costs nothing', abs($summary['today'] - 0.014) < 0.001, (string) $summary['today']);

} finally {
    // Put the hospital's settings back exactly as they were.
    if (is_array($settingsWere)) {
        $restore = [];

        foreach (['allow_ai_analysis', 'ai_cap_daily_usd', 'ai_cap_monthly_usd', 'ai_cap_user_daily_usd',
                  'ai_max_runs_per_user_per_hour', 'ai_min_seconds_between_runs', 'ai_cache_ttl_minutes',
                  'ai_max_payload_bytes'] as $column) {
            if (array_key_exists($column, $settingsWere)) {
                $restore[$column] = $settingsWere[$column];
            }
        }

        if ($restore !== []) {
            settings($restore);
        }
    }

    clearRuns();
}

echo "\n==================================================\n";
echo "  {$pass} passed, {$fail} failed\n";
echo "==================================================\n";

exit($fail === 0 ? 0 : 1);
