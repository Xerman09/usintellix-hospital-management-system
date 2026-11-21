<?php

declare(strict_types=1);

/**
 * Automated Verification: AI analysis of reports (AI-1)
 *
 *   php tests/build_test_database.php --fresh   (once)
 *   php tests/test_ai_analysis.php
 *
 * NO PROVIDER IS EVER CALLED. `AiProvider` is an interface and this suite
 * substitutes a double for it, so every path through the orchestrator runs
 * without a key, a network or a bill. The assertions check the double was used
 * -- a change that reached past the seam and called a real provider would fail
 * here rather than quietly start spending.
 *
 * What it is mostly about:
 *
 * ONE: THE PATIENT-LEVEL ROWS NEVER LEAVE. The claim-denial-pareto endpoint
 * returns seven branches and one of them is 50 rows of SELECT d.* over
 * billing_claim_denials. The suite captures exactly what the provider was
 * handed and asserts those columns are not in it. That is the assertion the
 * whole feature stands on.
 *
 * TWO: THE GUARD RUNS BEFORE THE PROVIDER, NOT AFTER. Each refusal is checked
 * by confirming the double was never called, because a guard that refuses
 * after the call has already cost the money it exists to save.
 *
 * THREE: A FAILURE IS RECORDED AND SHOWN. Including a failure that burned
 * tokens, which is still spend.
 */

require_once __DIR__ . '/lib/test_fixtures.php';

use App\Core\Database;
use App\Modules\AiAnalysis\Services\AiAnalysisService;
use App\Modules\AiAnalysis\Services\AiGuardService;
use App\Modules\AiAnalysis\Services\AiProvider;
use App\Modules\AiAnalysis\Services\AiReports;

try {
    $database = TestDatabase::use();
} catch (Throwable $e) {
    echo "REFUSED: " . $e->getMessage() . "\n";
    exit(1);
}

/**
 * The provider, replaced by something that records what it was asked and
 * answers whatever this test wants it to.
 */
final class ProviderDouble implements AiProvider
{
    public int $calls = 0;

    /** @var array<int, array{system: string, user: string, max_tokens: int}> */
    public array $seen = [];

    public array $next = [];

    public function __construct(private string $modelName = 'zz-test-model')
    {
    }

    public function model(): string
    {
        return $this->modelName;
    }

    public function generate(string $system, string $user, int $maxTokens): array
    {
        $this->calls++;
        $this->seen[] = ['system' => $system, 'user' => $user, 'max_tokens' => $maxTokens];

        return $this->next !== [] ? $this->next : [
            'ok' => true,
            'text' => json_encode([
                'summary' => 'Denied money concentrates in two categories.',
                'findings' => ['Prior authorisation is the largest single cause.'],
                'watch' => ['One month is not a trend.'],
            ]),
            'stop_reason' => 'end_turn',
            'model' => $this->modelName,
            'usage' => ['input_tokens' => 900, 'output_tokens' => 220, 'cache_read_tokens' => 0],
            'error' => null,
            'status' => 200,
        ];
    }

    /** Everything the provider was handed on its last call, as one string. */
    public function lastPayload(): string
    {
        $last = end($this->seen);

        return $last === false ? '' : $last['user'];
    }

    public function reset(): void
    {
        $this->calls = 0;
        $this->seen = [];
        $this->next = [];
    }
}

echo "==================================================\n";
echo "   Automated Verification: AI analysis (AI-1)\n";
echo "==================================================\n";
echo "  database: {$database}\n";
echo "  live database (untouched): " . TestDatabase::liveDatabaseName() . "\n";
echo "  provider: stubbed -- this suite never calls one and costs nothing\n";

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

TestFixtures::world();

const REPORT = 'claim_denial_pareto';

function settings(array $values): void
{
    global $db;

    $sets = [];

    foreach (array_keys($values) as $column) {
        $sets[] = "`{$column}` = :{$column}";
    }

    $db->prepare('UPDATE general_settings SET ' . implode(', ', $sets) . ' ORDER BY id LIMIT 1')->execute($values);
}

function clearRuns(): void
{
    global $db;

    $db->exec("DELETE FROM ai_analysis_runs");
    $db->exec("DELETE FROM ai_analysis_cache");
}

$settingsWere = $db->query('SELECT * FROM general_settings ORDER BY id LIMIT 1')->fetch(PDO::FETCH_ASSOC);

$roleName = 'clinician';
$roleId = (int) $db->query("SELECT id FROM roles WHERE name = '{$roleName}' LIMIT 1")->fetchColumn();
$userId = (int) $db->query('SELECT id FROM users ORDER BY id LIMIT 1')->fetchColumn();

check('a role and a user exist to run as', $roleId > 0 && $userId > 0);

if ($roleId === 0 || $userId === 0) {
    exit(1);
}

$db->prepare(
    "INSERT IGNORE INTO role_permissions (role_id, module, capability, is_granted)
     VALUES (:r, 'ai_analysis', 'ai_analysis', 1)"
)->execute(['r' => $roleId]);

$provider = new ProviderDouble();

try {

settings([
    'allow_ai_analysis' => 1,
    'ai_cap_daily_usd' => 5.00,
    'ai_cap_monthly_usd' => 100.00,
    'ai_cap_user_daily_usd' => 1.00,
    'ai_max_runs_per_user_per_hour' => 20,
    'ai_min_seconds_between_runs' => 0,
    'ai_cache_ttl_minutes' => 30,
    'ai_max_payload_bytes' => 60000,
    'ai_max_output_tokens' => 1200,
]);

// Denials to analyse. Deliberately carrying a patient_id and an encounter_id,
// because the point of the suite is that those do not travel.
$db->exec("DELETE FROM billing_claim_denials WHERE denial_number LIKE 'ZZAI-%'");

$categories = ['prior_auth_missing', 'medical_necessity', 'coding_billing_error'];

foreach ($categories as $i => $category) {
    $db->prepare(
        "INSERT INTO billing_claim_denials
            (denial_number, claim_number, patient_id, payer_name, encounter_id, service_date, denial_date,
             billed_amount, denied_amount, carc_code, carc_description, denial_category, status,
             recovered_amount, written_off_amount, created_at)
         VALUES (:dn, :cn, :pid, 'ZZ Payer', :enc, '2026-10-01', '2026-10-05',
                 :billed, :denied, :carc, 'ZZ reason', :cat, 'open', 0, 0, NOW())"
    )->execute([
        'dn' => 'ZZAI-' . $i,
        'cn' => 'ZZAICLAIM-' . $i,
        'pid' => 4242 + $i,
        'enc' => 9090 + $i,
        'billed' => 10000 * ($i + 1),
        'denied' => 5000 * ($i + 1),
        'carc' => 'CO' . (50 + $i),
        'cat' => $category,
    ]);
}

// ==========================================================================
// 1. The report registry.
// ==========================================================================
echo "\n-- What may be analysed --\n";

check('the pareto report is known', AiReports::knows(REPORT));
check('an unknown report is not', !AiReports::knows('zz_not_a_report'));
check('it is offered to the client', array_key_exists(REPORT, AiReports::available()));

check('the system prompt forbids inventing figures',
    str_contains(AiReports::SYSTEM_PROMPT, 'MUST APPEAR IN THE DATA'));
check('and says the model is not deciding anything',
    str_contains(AiReports::SYSTEM_PROMPT, 'NOT DECIDING'));

// ==========================================================================
// 2. THE ASSERTION THE WHOLE FEATURE STANDS ON.
// ==========================================================================
echo "\n-- What actually reaches the provider --\n";

clearRuns();
$provider->reset();

$result = (new AiAnalysisService($provider))->analyse(REPORT, [], $userId, $roleName, '127.0.0.1');

check('the analysis succeeded', !empty($result['success']), $result['message'] ?? '');
check('and the provider was called exactly once', $provider->calls === 1, (string) $provider->calls);

$sent = $provider->lastPayload();

check('something was actually sent', strlen($sent) > 50, (string) strlen($sent));

foreach (['4242', '4243', '9090', 'ZZAICLAIM', 'patient_id', 'encounter_id',
          'service_date', 'denial_worklist', 'patient_responsibility'] as $mustNotAppear) {
    check("\"{$mustNotAppear}\" is NOT in what was sent", !str_contains($sent, $mustNotAppear));
}

foreach (['denial_category', 'claims_count', 'denied_amount'] as $mustAppear) {
    check("\"{$mustAppear}\" is in what was sent", str_contains($sent, $mustAppear));
}

check('the hospital\'s own canned advice is not sent and echoed back as insight',
    !str_contains($sent, 'immediate_correction') && !str_contains($sent, 'recommended_strategy'));

check('the output ceiling came from settings', ($provider->seen[0]['max_tokens'] ?? 0) === 1200,
    (string) ($provider->seen[0]['max_tokens'] ?? 0));

// ==========================================================================
// 3. The answer, and the ledger.
// ==========================================================================
echo "\n-- The answer --\n";

check('the summary came through', ($result['data']['analysis']['summary'] ?? '') !== '');
check('the findings came through', count($result['data']['analysis']['findings'] ?? []) === 1);
check('and it is not reported as cached', ($result['data']['from_cache'] ?? true) === false);

$run = $db->query("SELECT * FROM ai_analysis_runs ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);

check('a ledger row was written', is_array($run));
check('marked allowed', ($run['status'] ?? '') === 'allowed');
check('with the tokens the provider reported', (int) ($run['input_tokens'] ?? 0) === 900);
check('and a cost', (float) ($run['estimated_cost_usd'] ?? 0) > 0);
check('THE LEDGER STORES A HASH, NOT THE PAYLOAD',
    strlen((string) ($run['payload_sha256'] ?? '')) === 64
    && !str_contains((string) ($run['payload_sha256'] ?? ''), 'denial'));

// ==========================================================================
// 4. Every guard refusal happens BEFORE the provider is called.
// ==========================================================================
echo "\n-- Refusals cost nothing --\n";

$refusals = [
    'switched off' => ['allow_ai_analysis' => 0],
    'over the daily cap' => ['ai_cap_daily_usd' => 0.000001],
    'over the monthly cap' => ['ai_cap_monthly_usd' => 0.000001],
    'inside the cooldown' => ['ai_min_seconds_between_runs' => 3600],
    'past the hourly ceiling' => ['ai_max_runs_per_user_per_hour' => 1],
    'payload too large' => ['ai_max_payload_bytes' => 10],
];

$baseline = [
    'allow_ai_analysis' => 1,
    'ai_cap_daily_usd' => 5.00,
    'ai_cap_monthly_usd' => 100.00,
    'ai_min_seconds_between_runs' => 0,
    'ai_max_runs_per_user_per_hour' => 20,
    'ai_max_payload_bytes' => 60000,
];

foreach ($refusals as $label => $override) {
    clearRuns();
    $provider->reset();
    settings($baseline);

    // Something on the clock, so the cooldown and hourly checks have a
    // previous run to measure against.
    AiGuardService::record(REPORT, $userId, $roleName, 'allowed', null, 'zz-test-model',
        str_repeat('a', 64), 100, ['input_tokens' => 10, 'output_tokens' => 10]);

    settings($override);

    $refused = (new AiAnalysisService($provider))->analyse(REPORT, [], $userId, $roleName, '127.0.0.1');

    check("{$label}: refused", empty($refused['success']), $refused['message'] ?? '');
    check("{$label}: THE PROVIDER WAS NEVER CALLED", $provider->calls === 0, (string) $provider->calls);
    check("{$label}: the person is told why", trim((string) ($refused['message'] ?? '')) !== '');
}

settings($baseline);

// A role without the capability.
clearRuns();
$provider->reset();

$strangerRole = 'zz_ai_stranger_' . time();
$db->prepare('INSERT INTO roles (name, created_at) VALUES (:n, NOW())')->execute(['n' => $strangerRole]);

$denied = (new AiAnalysisService($provider))->analyse(REPORT, [], $userId, $strangerRole, '127.0.0.1');

check('a role without the capability is refused', empty($denied['success']));
check('and the provider was never called', $provider->calls === 0);
check('the denial is in the ledger exactly once, not twice',
    (int) $db->query("SELECT COUNT(*) FROM ai_analysis_runs WHERE reason = 'not_permitted'")->fetchColumn() === 1);

$db->prepare('DELETE FROM roles WHERE name = :n')->execute(['n' => $strangerRole]);

// ==========================================================================
// 5. The cache: a second identical ask costs nothing.
// ==========================================================================
echo "\n-- The second ask --\n";

clearRuns();
$provider->reset();
settings($baseline);

$service = new AiAnalysisService($provider);

$first = $service->analyse(REPORT, [], $userId, $roleName, '127.0.0.1');
check('the first ask calls the provider', $provider->calls === 1 && !empty($first['success']));

$second = $service->analyse(REPORT, [], $userId, $roleName, '127.0.0.1');

check('THE SECOND IDENTICAL ASK DOES NOT', $provider->calls === 1, (string) $provider->calls);
check('but still answers', !empty($second['success']));
check('with the same summary',
    ($second['data']['analysis']['summary'] ?? 'a') === ($first['data']['analysis']['summary'] ?? 'b'));
check('and says it came from the cache', ($second['data']['from_cache'] ?? false) === true);
check('the cached run is in the ledger as cached, costing nothing',
    (int) $db->query("SELECT COUNT(*) FROM ai_analysis_runs WHERE status = 'cached'")->fetchColumn() === 1);
check('and the day\'s spend counted only the first',
    abs(AiGuardService::spendSummary()['today'] - (float) $db->query(
        "SELECT estimated_cost_usd FROM ai_analysis_runs WHERE status = 'allowed' LIMIT 1"
    )->fetchColumn()) < 0.000001);

// ==========================================================================
// 6. When the provider fails.
// ==========================================================================
echo "\n-- When the provider fails --\n";

clearRuns();
$provider->reset();
$provider->next = [
    'ok' => false,
    'text' => '',
    'stop_reason' => null,
    'model' => 'zz-test-model',
    'usage' => ['input_tokens' => 400, 'output_tokens' => 0, 'cache_read_tokens' => 0],
    'error' => 'authentication_error: invalid x-api-key',
    'status' => 401,
];

$failed = (new AiAnalysisService($provider))->analyse(REPORT, [], $userId, $roleName, '127.0.0.1');

check('the caller is told it failed', empty($failed['success']));
check('without being shown the provider\'s internals',
    !str_contains(strtolower((string) $failed['message']), 'x-api-key'), (string) $failed['message']);

$failedRun = $db->query("SELECT * FROM ai_analysis_runs ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);

check('the ledger records the failure', ($failedRun['status'] ?? '') === 'failed');
check('WITH THE PROVIDER\'S REASON, so it is diagnosable',
    str_contains((string) ($failedRun['reason'] ?? ''), 'authentication_error'),
    (string) ($failedRun['reason'] ?? ''));
check('A FAILURE THAT BURNED TOKENS IS STILL SPEND',
    (int) ($failedRun['input_tokens'] ?? 0) === 400 && (float) ($failedRun['estimated_cost_usd'] ?? 0) > 0);
check('and nothing was cached from it',
    (int) $db->query('SELECT COUNT(*) FROM ai_analysis_cache')->fetchColumn() === 0);

// A refusal from the provider is a 200 with no content, and is its own case.
clearRuns();
$provider->reset();
$provider->next = [
    'ok' => false, 'text' => '', 'stop_reason' => 'refusal', 'model' => 'zz-test-model',
    'usage' => ['input_tokens' => 300, 'output_tokens' => 0, 'cache_read_tokens' => 0],
    'error' => 'The provider declined to answer this request.', 'status' => 200,
];

$declined = (new AiAnalysisService($provider))->analyse(REPORT, [], $userId, $roleName, '127.0.0.1');
check('a provider refusal is handled like any other failure', empty($declined['success']));
check('and is recorded as one',
    ($db->query("SELECT status FROM ai_analysis_runs ORDER BY id DESC LIMIT 1")->fetchColumn()) === 'failed');

// ==========================================================================
// 7. Reading whatever shape the answer arrives in.
// ==========================================================================
echo "\n-- Parsing the answer --\n";

$clean = AiAnalysisService::parse('{"summary":"S","findings":["a","b"],"watch":[]}');
check('plain JSON parses', $clean['summary'] === 'S' && count($clean['findings']) === 2);

$fenced = AiAnalysisService::parse("```json\n{\"summary\":\"F\",\"findings\":[]}\n```");
check('a fenced answer parses', $fenced['summary'] === 'F');

$prose = AiAnalysisService::parse('Denials are concentrated in prior authorisation.');
check('PROSE IS NOT LOST -- a parse failure still shows the answer',
    str_contains($prose['summary'], 'prior authorisation'));
check('and yields no invented findings', $prose['findings'] === []);

$messy = AiAnalysisService::parse('{"summary":"M","findings":["a", 42, "", null, "b"]}');
check('non-strings in a list are dropped rather than rendered',
    $messy['findings'] === ['a', '42', 'b'], json_encode($messy['findings']));

// ==========================================================================
// 8. An unknown report builds nothing.
// ==========================================================================
echo "\n-- An unknown report --\n";

clearRuns();
$provider->reset();

$unknown = (new AiAnalysisService($provider))->analyse('zz_not_a_report', [], $userId, $roleName, '127.0.0.1');

check('it is refused', empty($unknown['success']));
check('the provider was never called', $provider->calls === 0);
check('and no report query ran for it',
    (int) $db->query('SELECT COUNT(*) FROM ai_analysis_runs')->fetchColumn() === 0);

} finally {
    $db->exec("DELETE FROM billing_claim_denials WHERE denial_number LIKE 'ZZAI-%'");
    clearRuns();

    if (is_array($settingsWere)) {
        $restore = [];

        foreach (['allow_ai_analysis', 'ai_cap_daily_usd', 'ai_cap_monthly_usd', 'ai_cap_user_daily_usd',
                  'ai_max_runs_per_user_per_hour', 'ai_min_seconds_between_runs', 'ai_cache_ttl_minutes',
                  'ai_max_payload_bytes', 'ai_max_output_tokens'] as $column) {
            if (array_key_exists($column, $settingsWere)) {
                $restore[$column] = $settingsWere[$column];
            }
        }

        if ($restore !== []) {
            settings($restore);
        }
    }
}

echo "\n==================================================\n";
echo "  {$pass} passed, {$fail} failed\n";
echo "==================================================\n";

exit($fail === 0 ? 0 : 1);
