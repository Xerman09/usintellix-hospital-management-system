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
use App\Modules\AiAnalysis\Services\AiFigures;
use App\Modules\AiAnalysis\Services\AiGuardService;
use App\Modules\AiAnalysis\Services\AiPayload;
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
// 7a. The clinical analytics table, materialised (AI-5).
//
// `clinical_trends` reads analytics_clinical_quality_daily and does NOT create
// the days it reports on -- that is getSummaryMetrics' backfill, which is
// precisely why getSummaryMetrics is not a registered report. So the rows have
// to exist before 7b can assert anything about the shape of them: an empty
// payload passes every "nothing identifying leaked" check for free, and a
// suite that is reassured by zero rows is not checking anything.
// ==========================================================================
echo "\n-- Clinical analytics rows to observe --\n";

$analyticsTo = substr((string) $db->query('SELECT NOW()')->fetchColumn(), 0, 10);
$analyticsFrom = date('Y-m-d', strtotime('-29 days', strtotime($analyticsTo)));

(new App\Modules\Reports\Services\ClinicalQualityAnalyticsService())
    ->backfillRange($analyticsFrom, $analyticsTo, 'manual_recalc');

$analyticsRows = (int) $db->query(
    'SELECT COUNT(*) FROM analytics_clinical_quality_daily'
)->fetchColumn();

check('the clinical analytics table has days in it to report on', $analyticsRows > 0,
    (string) $analyticsRows);

check('so clinical_trends actually has rows, and 7b is checking something',
    count(AiReports::build('clinical_trends', [])['rows']) > 0);

// ==========================================================================
// 7b. EVERY REGISTERED REPORT, built from its real query (AI-3).
//
// This is the assertion that has to keep holding as reports are added. It
// takes whatever is in AiReports::REPORTS -- not a list written here, which
// would drift the moment somebody adds a report and forgets the test -- builds
// each one against the real database, and checks that nothing identifying came
// through.
// ==========================================================================
echo "\n-- Every registered report --\n";

$identifierish = [
    'patient_id', 'patient_no', 'patient_name', 'first_name', 'last_name', 'middle_name',
    'birthdate', 'date_of_birth', 'dob', 'mrn', 'email', 'phone', 'mobile_phone',
    'address_line', 'employee_id', 'employee_no', 'user_id', 'created_by', 'updated_by',
    'assigned_to', 'assigned_to_name', 'encounter_id', 'full_name',

    // Added in AI-6, which is the phase about employee names. A member of
    // staff is a data subject too, so the names they appear under belong on
    // the same list as a patient's rather than on a shorter one of their own.
    'custodian_name', 'counted_by', 'counted_by_name', 'approved_by', 'approved_by_name',
    'recorded_by', 'recorded_by_name', 'performed_by', 'performed_by_name',
    'operating_surgeon', 'surgeon_name', 'doctor_name', 'provider_name', 'staff_name',
    'transferred_by', 'destroyed_by', 'witness_name',
];

check('there is more than one report registered by now', count(AiReports::REPORTS) >= 6,
    (string) count(AiReports::REPORTS));

foreach (array_keys(AiReports::REPORTS) as $key) {
    $built = null;
    $threw = '';

    try {
        $built = AiReports::build($key, []);
    } catch (Throwable $e) {
        $threw = get_class($e) . ': ' . $e->getMessage();
    }

    check("{$key}: builds without throwing", $threw === '', $threw);

    if (!is_array($built)) {
        continue;
    }

    // Every key across every row, so a column that only appears on some rows
    // is still caught.
    $keysSeen = [];

    foreach ($built['rows'] as $row) {
        foreach (array_keys($row) as $k) {
            $keysSeen[strtolower($k)] = true;
        }
    }

    $leaked = array_intersect(array_keys($keysSeen), $identifierish);

    check("{$key}: NOTHING IDENTIFYING IN THE PAYLOAD", $leaked === [], implode(', ', $leaked));

    // Nothing nested either: project() drops those, so a nested value here
    // would mean something bypassed it.
    $nested = false;

    foreach ($built['rows'] as $row) {
        foreach ($row as $value) {
            if (is_array($value) || is_object($value)) {
                $nested = true;
            }
        }
    }

    check("{$key}: no nested structures survived projection", !$nested);
}

// ==========================================================================
// 7c. NO REGISTERED REPORT MAY CALL A METHOD THAT WRITES (AI-4),
//     DIRECTLY OR THROUGH ANYTHING IT CALLS (AI-5).
//
// This is here because of a near miss. NearExpiryQuarantineService::
// runQuarantineScan was on the Tier 1 "buildable now" report list, reads like
// a report, and contains UPDATE and INSERT -- it quarantines stock. It was
// caught by a check written into a throwaway probe, which is the wrong place
// for a check that matters.
//
// AI-5 found the next one, and found it because this check was too shallow to
// catch it. ClinicalQualityAnalyticsService::getSummaryMetrics contains no
// write word anywhere in its own body; its third statement is
//
//     $this->backfillRange($from, $to, 'realtime_snapshot');
//
// which reaches calculateForDate(), which contains INSERT INTO
// analytics_clinical_quality_daily. It materialises every missing day in the
// requested range before reporting on it. The body-only version of this check
// cleared it, and registering it would have meant an analysis panel writing
// thirty rows of derived analytics every time somebody opened the dashboard.
//
// So the check now FOLLOWS $this-> calls within the class, to a bounded depth,
// and reports the path rather than just the verdict -- because "getTrends
// writes" and "getSummaryMetrics -> backfillRange -> calculateForDate writes"
// are very different things to be told.
//
// Analysis reads. A report whose getter writes is not a report.
// ==========================================================================
echo "\n-- No report may write, however indirectly --\n";

$writeWords = '/\b(INSERT|UPDATE|DELETE|REPLACE|TRUNCATE|ALTER\s+TABLE|DROP\s+TABLE)\b/i';

/** One method's body, out of a class's source. */
function methodBody(string $src, string $method): ?string
{
    if (!preg_match('/function ' . preg_quote($method, '/') . '\s*\(/', $src, $m, PREG_OFFSET_CAPTURE)) {
        return null;
    }

    $rest = substr($src, $m[0][1]);
    $next = preg_match('/\n    (?:public|private|protected|static)[ a-z]*function /', $rest, $nm, PREG_OFFSET_CAPTURE)
        ? $nm[0][1]
        : strlen($rest);

    return substr($rest, 0, $next);
}

/**
 * Does $method write, in its own body or in anything it calls on $this?
 *
 * @return array{writes: bool, path: string, words: string}
 */
function writePath(string $class, string $method, int $depth = 4, array $seen = []): array
{
    global $writeWords;

    $id = $class . '::' . $method;

    if ($depth <= 0 || isset($seen[$id])) {
        return ['writes' => false, 'path' => '', 'words' => ''];
    }

    $seen[$id] = true;

    $file = (new ReflectionClass($class))->getFileName();
    $source = $file !== false ? (string) file_get_contents($file) : '';
    $body = $source === '' ? null : methodBody($source, $method);

    if ($body === null) {
        return ['writes' => false, 'path' => 'UNREADABLE ' . $id, 'words' => ''];
    }

    preg_match_all($writeWords, $body, $direct);

    if ($direct[0] !== []) {
        return [
            'writes' => true,
            'path' => $id,
            'words' => implode(',', array_unique(array_map('strtoupper', $direct[0]))),
        ];
    }

    preg_match_all('/\$this->([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/', $body, $calls);

    foreach (array_unique($calls[1]) as $callee) {
        $down = writePath($class, $callee, $depth - 1, $seen);

        if ($down['writes']) {
            return [
                'writes' => true,
                'path' => $id . ' -> ' . $down['path'],
                'words' => $down['words'],
            ];
        }
    }

    return ['writes' => false, 'path' => $id, 'words' => ''];
}

foreach (AiReports::REPORTS as $key => $report) {
    [$class, $method] = $report['source'];

    $scan = writePath($class, $method);

    if (str_starts_with($scan['path'], 'UNREADABLE')) {
        check("{$key}: its getter could be read", false, "{$class}::{$method}");
        continue;
    }

    check(
        "{$key}: {$method}() does not write, directly or one call down",
        !$scan['writes'],
        $scan['words'] . ' via ' . $scan['path']
    );
}

// The two that prompted this check, asserted by name so the reasons survive
// the next person who reads the list and wonders why they are absent.
check('runQuarantineScan is NOT registered as a report -- it quarantines stock',
    !array_key_exists('near_expiry_quarantine_scan', AiReports::REPORTS)
    && !in_array('runQuarantineScan', array_column(array_column(AiReports::REPORTS, 'source'), 1), true));

check('getSummaryMetrics is NOT registered -- it backfills the analytics table',
    !in_array('getSummaryMetrics', array_column(array_column(AiReports::REPORTS, 'source'), 1), true));

// And the scan itself is checked against the thing it was written to catch,
// so a refactor that quietly stops following calls fails here rather than
// silently clearing the next writer.
$proof = writePath('App\Modules\Reports\Services\ClinicalQualityAnalyticsService', 'getSummaryMetrics');

check('the write scan still follows calls: it catches getSummaryMetrics',
    $proof['writes'] && str_contains($proof['path'], 'calculateForDate'), $proof['path']);

check('and it does not cry wolf: getTrends is clean',
    !writePath('App\Modules\Reports\Services\ClinicalQualityAnalyticsService', 'getTrends')['writes']);

// The aging matrix is the one report whose data had to be reshaped to survive
// the allowlist at all, so it gets its own check rather than relying on the
// loop above to notice an empty payload.
// AI-5 de-registered this report -- getAgingMatrix() re-ages every AR account
// -- so the mechanism is now exercised directly rather than through build().
// The transform is still the only reason an aging report would have ages in
// it, and it is still worth a test.
check('ar_aging_matrix is NOT registered -- its getter re-ages AR accounts',
    !array_key_exists('ar_aging_matrix', AiReports::REPORTS));

check('blood_inventory_stats is NOT registered -- its getter quarantines blood',
    !array_key_exists('blood_inventory_stats', AiReports::REPORTS));

check('but both allowlists are kept, observed and correct, for when they can be read',
    AiPayload::knows('ar_aging_matrix') && AiPayload::knows('blood_inventory_stats'));

$aging = ['rows' => AiPayload::project('ar_aging_matrix', AiReports::flattenAgingBuckets([[
    'payer_category' => 'hmo',
    'payer_label' => 'HMO',
    'total_balance' => 1000,
    'buckets' => [
        '0-30' => ['count' => 2, 'balance' => 400],
        '120+' => ['count' => 1, 'balance' => 600],
    ],
]]))['rows']];
$agingKeys = array_keys($aging['rows'][0] ?? []);

check('the aging matrix was flattened, so it still has ages in it',
    in_array('bucket_0_30_balance', $agingKeys, true)
    && in_array('bucket_120_plus_balance', $agingKeys, true),
    implode(',', $agingKeys));
check('and the nested map it came from is gone', !in_array('buckets', $agingKeys, true));

// getMonthlyTrends takes an int, not a filters array. Passing filters to it is
// a TypeError, which is what the registry's `args` key exists to prevent.
$trends = AiReports::build('financial_monthly_trends', ['month' => '2026-10']);
check('a getter with a different signature is still called correctly',
    is_array($trends['rows']), 'threw or returned nothing');

// A flat map of totals, not a list of rows.
$commissions = AiReports::build('doctor_commission_metrics', []);
check('a report that returns totals rather than rows projects to one row',
    count($commissions['rows']) === 1, (string) count($commissions['rows']));

// ==========================================================================
// 7e. THE FIGURES CHECK (AI-5).
//
// Every numeral in the generated text must appear in the payload that was
// sent. AI-5 is the first phase whose output reaches clinicians, and "the
// CLABSI rate is 1.4 per 1,000 line-days" is a clinical claim however it was
// produced.
//
// Most of what follows is about FALSE POSITIVES, because that is what decides
// whether this check is usable. A version that flags "the 30-day readmission
// rate" or a numbered list refuses nearly every real answer, and a check that
// cries wolf gets switched off by whoever is on shift.
// ==========================================================================
echo "\n-- The figures check --\n";

$figPayload = [
    'context' => ['from' => '2026-10-23', 'to' => '2026-11-21'],
    'rows' => [[
        'readmissions_30d_count' => 4,
        'total_discharges' => 25,
        'cauti_rate_per_1000' => 1.5,
        'composite_score' => 80.6,
        'alos_days' => '4.567',
        'bor_percentage' => '0.00',
        'acuity_label' => 'Level 1: Resuscitation / Immediate',
    ]],
];

$fig = static fn (string $text): array => AiFigures::check(['summary' => $text], $figPayload);

check('a figure that is in the payload passes', $fig('Occupancy stood at 80.6.')['ok']);

check('a figure that is nowhere near the payload is caught',
    !$fig('Readmissions cost 1,250,000 pesos.')['ok']);

check('and it is named, so the refusal is diagnosable',
    $fig('Readmissions cost 1,250,000 pesos.')['unsupported'] === ['1,250,000']);

check('a formatting difference is not a discrepancy: 25 against 25',
    $fig('There were 25 discharges.')['ok']);

check('nor is a thousands separator the model added',
    $fig('The denominator was 1,500.')['ok'] === $fig('The denominator was 1500.')['ok']);

check('0 passes against a payload value of "0.00"', $fig('Occupancy was 0 percent.')['ok']);

check('rounding down the decimals is allowed: 4.6 from 4.567',
    $fig('Average stay was 4.6 days.')['ok']);

check('as is rounding to the whole number: 5 from 4.567',
    $fig('Average stay was about 5 days.')['ok']);

// The distinction the whole check turns on.
check('BUT A CONVERSION IS NOT ROUNDING: 0.41 does not support 41 percent',
    !AiFigures::check(['summary' => 'The rate was 41 percent.'], ['rows' => [['rate' => 0.41]]])['ok']);

echo "\n-- The figures check does not cry wolf --\n";

check('a numeral taken from a KEY passes: "30-day" from readmissions_30d_count',
    $fig('The 30-day readmission rate is 4 per 25 discharges.')['ok']);

check('a numeral taken from a key passes: "per 1,000" from cauti_rate_per_1000',
    $fig('The CAUTI rate is 1.5 per 1,000 device-days.')['ok']);

check('a numeral inside a LABEL passes: "Level 1" from the acuity label',
    $fig('Level 1 arrivals were seen fastest.')['ok']);

check('a date part from the context passes',
    $fig('The window ends on 2026-11-21.')['ok']);

check('an ordered-list marker is punctuation, not a claim',
    AiFigures::check(['summary' => '', 'findings' => ["1. Occupancy held at 80.6.", "2. Nothing else moved."]],
        $figPayload)['ok']);

check('findings and watch are examined too, not only the summary',
    !AiFigures::check(['summary' => 'Nothing notable.', 'findings' => [], 'watch' => ['A 97.3 percent rate.']],
        $figPayload)['ok']);

// Stated as a test rather than left in a comment, because somebody will
// otherwise assume this check means more than it does.
check('IT CHECKS PROVENANCE, NOT MEANING: a real number used wrongly passes',
    $fig('There were 25 deaths.')['ok']);

check('and numbers written as words are not examined at all',
    $fig('Twelve wards reported.')['ok']);

// ==========================================================================
// 7f. AN ANSWER THAT FAILS THE FIGURES CHECK IS DISCARDED, NOT SHOWN.
//
// The three things that must all be true at once: the caller gets nothing to
// render, the spend is still recorded because the call still happened, and the
// bad answer is NOT cached -- caching it would turn one invented figure into
// every subsequent view of that report, served free and therefore for ever.
// ==========================================================================
echo "\n-- A failed figures check discards the answer --\n";

clearRuns();
$provider->reset();
settings(['ai_min_seconds_between_runs' => 0]);

$provider->next = [
    'ok' => true,
    'text' => json_encode([
        'summary' => 'Denials rose by 38.4 percent against a baseline of 912,004 pesos.',
        'findings' => [],
        'watch' => [],
    ]),
    'stop_reason' => 'end_turn',
    'model' => 'zz-test-model',
    'usage' => ['input_tokens' => 900, 'output_tokens' => 220, 'cache_read_tokens' => 0],
    'error' => null,
    'status' => 200,
];

$invented = (new AiAnalysisService($provider))->analyse(REPORT, [], $userId, $roleName, '127.0.0.1');

check('the provider WAS called -- this is an output check, not a guard',
    $provider->calls === 1, (string) $provider->calls);

check('the caller is told it failed', empty($invented['success']));

check('and no analysis text is handed back to be rendered',
    !isset($invented['data']['analysis']));

check('the unsupported figures come back so a misfire is diagnosable',
    !empty($invented['data']['unsupported_figures']));

$figRun = $db->query(
    "SELECT status, reason, input_tokens, output_tokens FROM ai_analysis_runs ORDER BY id DESC LIMIT 1"
)->fetch(PDO::FETCH_ASSOC) ?: [];

check('the ledger records it as failed', ($figRun['status'] ?? '') === 'failed', (string) ($figRun['status'] ?? ''));

check('with the reason naming the figures check',
    str_contains((string) ($figRun['reason'] ?? ''), 'figures_unsupported'), (string) ($figRun['reason'] ?? ''));

check('AND THE TOKENS ARE STILL COUNTED -- a discarded answer was still paid for',
    (int) ($figRun['input_tokens'] ?? 0) === 900 && (int) ($figRun['output_tokens'] ?? 0) === 220,
    ($figRun['input_tokens'] ?? '?') . '/' . ($figRun['output_tokens'] ?? '?'));

check('NOTHING WAS CACHED -- one bad answer must not become every future view',
    (int) $db->query('SELECT COUNT(*) FROM ai_analysis_cache')->fetchColumn() === 0);

// And the same path with a clean answer, so the above is not passing because
// the orchestrator is simply broken.
$provider->reset();
clearRuns();

$provider->next = [
    'ok' => true,
    'text' => json_encode([
        'summary' => 'Nothing in these categories stands out.',
        'findings' => [],
        'watch' => [],
    ]),
    'stop_reason' => 'end_turn',
    'model' => 'zz-test-model',
    'usage' => ['input_tokens' => 900, 'output_tokens' => 220, 'cache_read_tokens' => 0],
    'error' => null,
    'status' => 200,
];

$clean = (new AiAnalysisService($provider))->analyse(REPORT, [], $userId, $roleName, '127.0.0.1');

check('an answer with no invented figures is returned', !empty($clean['success']));
check('and it IS cached', (int) $db->query('SELECT COUNT(*) FROM ai_analysis_cache')->fetchColumn() === 1);

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

// ==========================================================================
// 9. EVERY REGISTERED REPORT IS REACHABLE FROM A SCREEN.
//
// This section exists because for most of this feature's life half of it was
// unreachable. AI-3 through AI-5 registered 22 reports and mounted 11 panels;
// the other 11 worked, were allowlisted, were tested here, and could be
// reached only by somebody willing to POST /ai/analyse by hand. Nothing said
// so. Registering a report and shipping it to the people who need it are two
// jobs, and only the first one had a test.
//
// Three checks, in the order they would catch a mistake:
//
//   a. Every key in REPORTS is named by a screen that mounts a panel.
//   b. Every mountId a screen passes exists as an id in the markup --
//      mountAiPanel() does `if (!mount) return;`, so a typo there is a panel
//      that silently never appears. No error, no console warning, nothing.
//   c. Every report key a screen offers is actually registered, so a renamed
//      or de-registered report cannot leave a dead button behind.
//
// Static reading of the frontend, no browser. It cannot tell whether a panel
// LOOKS right; it can tell whether it is wired to anything.
// ==========================================================================
echo "\n-- 9. Every report is reachable from a screen --\n";

/**
 * The argument text of each mountAiPanel(...) call in one file.
 *
 * Paren-matched rather than regex-matched, and the reason is a failure this
 * check had on its first run: a looser pattern read `report:` wherever it
 * appeared, and both tabbed screens use that property name for their own
 * purposes -- or-reports keeps `state = { report: "utilization" }` and
 * procurement's tab list has `report: "spend"`. Neither is an AI report and
 * neither is registered, so the check reported two violations that were not
 * violations. A scan that reads the wrong text will be switched off.
 *
 * @return list<string>
 */
function aiPanelCallBodies(string $src): array
{
    $bodies = [];
    $offset = 0;

    while (($at = strpos($src, 'mountAiPanel(', $offset)) !== false) {
        $i = $at + strlen('mountAiPanel(');
        $depth = 1;
        $len = strlen($src);

        while ($i < $len && $depth > 0) {
            $ch = $src[$i];

            if ($ch === '(' || $ch === '{' || $ch === '[') {
                $depth++;
            } elseif ($ch === ')' || $ch === '}' || $ch === ']') {
                $depth--;
            }

            $i++;
        }

        $bodies[] = substr($src, $at, $i - $at);
        $offset = $i;
    }

    return $bodies;
}

/**
 * The quoted values of any `const AI_REPORT...= { ... }` map.
 *
 * A TABBED screen cannot name its report inside the call -- it passes a
 * variable, because the key depends on which tab is showing. Both such
 * screens hold the keys in a map called AI_REPORT_FOR_TAB, so check (c)
 * reads maps whose name begins AI_REPORT. A future tabbed screen that calls
 * its map something else will not be read by check (c); it will still be
 * covered by (a), which searches the whole file.
 *
 * @return list<string>
 */
function aiReportMapValues(string $src): array
{
    if (!preg_match_all('/const\s+AI_REPORT[A-Z_]*\s*=\s*\{(.*?)\};/s', $src, $maps)) {
        return [];
    }

    $values = [];

    foreach ($maps[1] as $body) {
        preg_match_all('/[\'"]([a-z0-9_]+)[\'"]/', $body, $found);
        $values = array_merge($values, $found[1]);
    }

    return $values;
}

$frontendRoot = dirname(__DIR__) . '/frontend/src';

/** @var array<string, string> relative path => source */
$frontend = [];

if (is_dir($frontendRoot)) {
    $walk = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(
        $frontendRoot,
        FilesystemIterator::SKIP_DOTS
    ));

    foreach ($walk as $file) {
        if ($file->isFile() && strtolower($file->getExtension()) === 'js') {
            $frontend[str_replace('\\', '/', substr($file->getPathname(), strlen($frontendRoot) + 1))]
                = (string) file_get_contents($file->getPathname());
        }
    }
}

check('the frontend was readable', count($frontend) > 100, (string) count($frontend));

// The files that mount a panel. A report key mentioned anywhere else -- a
// comment in a doc, a string in an unrelated module -- does not make a report
// reachable, so only these are searched.
//
// ai-panel.js is the panel itself, not a screen, and its documentation
// comment necessarily contains worked examples of every pattern this section
// hunts for: a mountId that belongs to no element and a reports list. It was
// the first thing the check reported. Excluded by name, for that reason.
$mountingFiles = [];

foreach ($frontend as $name => $src) {
    if (str_contains($src, 'mountAiPanel') && !str_ends_with($name, 'reports/ai-panel.js')) {
        $mountingFiles[$name] = $src;
    }
}

// Seventeen screens: eleven after AI-5a, six more in AI-6. The number is
// written down rather than left loose, because a threshold of ">= 7" would
// have passed throughout the four phases when half the reports had nowhere
// to live.
check('the seventeen screens that mount panels are all here',
    count($mountingFiles) >= 17, (string) count($mountingFiles));

check('and the panel component itself is not counted as one',
    !array_key_exists('modules/reports/ai-panel.js', $mountingFiles));

// -- a0. a screen that calls mountAiPanel must import it --------------------
//
// Caught exactly this, on the commit that added these checks: the stock-count
// screen called mountAiPanel and had no import for it. Nothing else noticed.
// `php -l` does not read JavaScript; a per-file syntax check parses the file
// without resolving a single name; and the module imports cleanly, because
// there is no bad import to fail -- there is no import at all. The panel would
// have thrown a ReferenceError the first time somebody opened the difference
// report, and only then.
//
// The import carries a ?v= cache-buster, so the path is matched loosely and
// only the binding and the file name are required.
$missingImport = [];

foreach ($mountingFiles as $name => $src) {
    $imports = (bool) preg_match(
        '/import\s*\{[^}]*\bmountAiPanel\b[^}]*\}\s*from\s*[\'"][^\'"]*ai-panel\.js/',
        $src
    );

    if (!$imports) {
        $missingImport[] = $name;
    }
}

check('EVERY screen that calls mountAiPanel imports it',
    $missingImport === [],
    implode(', ', $missingImport));

// -- a. every registered report is named by one of them ---------------------
//
// Whole-file, not call bodies: a tabbed screen names its reports in a map and
// passes a variable to the call.
$unreachable = [];

foreach (array_keys(AiReports::REPORTS) as $key) {
    $found = false;

    foreach ($mountingFiles as $src) {
        if (str_contains($src, "'{$key}'") || str_contains($src, "\"{$key}\"")) {
            $found = true;
            break;
        }
    }

    if (!$found) {
        $unreachable[] = $key;
    }
}

check('EVERY registered report is named by a screen that mounts a panel',
    $unreachable === [],
    count($unreachable) . ' are not: ' . implode(', ', $unreachable));

// -- b. every mountId has somewhere to mount --------------------------------
//
// The element is searched for across every frontend file, not just the
// mounting one, because the markup usually lives in a sibling .view.js.
$orphanMounts = [];
$mountIds = [];

foreach ($mountingFiles as $name => $src) {
    foreach (aiPanelCallBodies($src) as $body) {
        if (!preg_match('/mountId:\s*[\'"]([A-Za-z0-9_]+)[\'"]/', $body, $m)) {
            continue;
        }

        $id = $m[1];
        $mountIds[$id] = $name;
        $hasElement = false;

        foreach ($frontend as $candidate) {
            if (str_contains($candidate, "id=\"{$id}\"") || str_contains($candidate, "id='{$id}'")) {
                $hasElement = true;
                break;
            }
        }

        if (!$hasElement) {
            $orphanMounts[] = "{$id} ({$name})";
        }
    }
}

check('the mount ids were found', count($mountIds) >= 7, (string) count($mountIds));

check('EVERY mountId exists as an element -- mountAiPanel returns silently if not',
    $orphanMounts === [],
    implode(', ', $orphanMounts));

// -- c. no screen offers a report that is not registered ---------------------
//
// From the call bodies -- `report: 'key'`, and `key: 'x'` inside a chooser's
// reports list -- plus any AI_REPORT map, which is how a tabbed screen names
// them.
$unknownFromScreens = [];
$offered = [];

foreach ($mountingFiles as $name => $src) {
    $keys = aiReportMapValues($src);

    foreach (aiPanelCallBodies($src) as $body) {
        preg_match_all('/(?:report|key):\s*[\'"]([a-z0-9_]+)[\'"]/', $body, $m);
        $keys = array_merge($keys, $m[1]);
    }

    foreach (array_unique($keys) as $key) {
        $offered[$key] = true;

        if (!AiReports::knows($key)) {
            $unknownFromScreens[] = "{$key} ({$name})";
        }
    }
}

check('NO screen offers a report that is not registered',
    $unknownFromScreens === [],
    implode(', ', $unknownFromScreens));

// The two directions are not the same statement, and both matter: (a) says
// nothing registered is stranded, this says the screens between them offer the
// whole registry rather than most of it.
check('and the screens between them offer every registered report',
    count(array_intersect_key($offered, AiReports::REPORTS)) === count(AiReports::REPORTS),
    count($offered) . ' offered, ' . count(AiReports::REPORTS) . ' registered');

// -- the detectors, exercised ----------------------------------------------
//
// All of the above pass, which is the problem: a scan that finds nothing looks
// the same as a scan that cannot find anything. Each is run against a
// synthetic violation and a synthetic clean case.
$orphanSample = "mountAiPanel({ mountId: 'xxOrphanPanel', report: 'claim_denial_pareto' });";

$orphanBodies = aiPanelCallBodies($orphanSample);

check('the call reader finds a call', count($orphanBodies) === 1);

check('check b fires on a mountId with no element',
    preg_match('/mountId:\s*[\'"]([A-Za-z0-9_]+)[\'"]/', $orphanBodies[0], $om) === 1
    && $om[1] === 'xxOrphanPanel'
    && !str_contains(implode('', $frontend), 'id="xxOrphanPanel"'));

$unknownSample = "mountAiPanel({ mountId: 'cdpAiPanel', report: 'zz_not_a_report' });";

preg_match_all('/(?:report|key):\s*[\'"]([a-z0-9_]+)[\'"]/', aiPanelCallBodies($unknownSample)[0], $uk);

check('check c fires on an unregistered report key',
    in_array('zz_not_a_report', $uk[1], true) && !AiReports::knows('zz_not_a_report'));

check('and check c does not fire on a registered one',
    AiReports::knows(array_key_first(AiReports::REPORTS)));

$importPattern = '/import\s*\{[^}]*\bmountAiPanel\b[^}]*\}\s*from\s*[\'"][^\'"]*ai-panel\.js/';

check('check a0 fires on a screen that calls mountAiPanel without importing it',
    !preg_match($importPattern, 'mountAiPanel({ mountId: "x", report: "y" });'));

check('and does not fire on one that imports it, cache-buster and all',
    (bool) preg_match($importPattern, 'import { mountAiPanel } from "../reports/ai-panel.js?v=2";'));

check('nor on one that imports it alongside others',
    (bool) preg_match($importPattern, 'import { api, mountAiPanel } from "./ai-panel.js";'));

// The chooser form, new in this phase, and the tab map -- the two shapes the
// plain `report:` pattern does not cover on its own.
$chooserSample = "mountAiPanel({ mountId: 'ahsrAiPanel', reports: [{ key: 'ahsr_kpis', label: 'x' }] });";

preg_match_all('/(?:report|key):\s*[\'"]([a-z0-9_]+)[\'"]/', aiPanelCallBodies($chooserSample)[0], $cs);

check('check c reads a chooser list', in_array('ahsr_kpis', $cs[1], true));

check('check c reads a tab map',
    aiReportMapValues("const AI_REPORT_FOR_TAB = {\n  open: \"procurement_open_orders\"\n};")
    === ['procurement_open_orders']);

// And the false positive that made the paren matching necessary, held as a
// test so nobody simplifies it back.
$lookalike = "let state = { report: \"utilization\" };\nmountAiPanel({ mountId: 'orrAiPanel', report });";

$lookalikeKeys = [];

foreach (aiPanelCallBodies($lookalike) as $body) {
    preg_match_all('/(?:report|key):\s*[\'"]([a-z0-9_]+)[\'"]/', $body, $lm);
    $lookalikeKeys = array_merge($lookalikeKeys, $lm[1]);
}

check('a `report:` property OUTSIDE a mountAiPanel call is not read as a report key',
    $lookalikeKeys === [], implode(', ', $lookalikeKeys));

// ==========================================================================
// 10. AI-6: THE TIER 2 REPORTS, AND THE ONE NAME THAT IS DROPPED.
//
// Tier 2 was eight reports described as "one column away": a single
// patient_name or employee name carried for display, which dropping would
// make each of them Tier 1. The probe found that for five of the eight the
// name is in a branch that was never going to be sent -- `records`, the detail
// list the screen's table is drawn from -- while the branch worth analysing,
// `kpis`, is one aggregate row with no name in it.
//
// So there are two different things to assert, and conflating them is how this
// would rot:
//
//   a. The five aggregate reports send the `kpis` branch and NOT `records`.
//      If somebody later registers the detail branch "for completeness", the
//      patient names come with it.
//   b. `stock_levels_low` really does drop `custodian_name`, in both files
//      that have a say, AND records the drop in what the ledger is given.
// ==========================================================================
echo "\n-- 10. The Tier 2 reports, and the dropped custodian --\n";

$tier2Aggregates = [
    'safety_incident_log' => 'getIncidentLogReport',
    'safety_critical_tat' => 'getCriticalTATReport',
    'safety_hai_surveillance' => 'getHAIReport',
    'safety_readmission_mortality' => 'getReadmissionMortalityReport',
    'safety_surgical_checklist' => 'getSurgicalSafetyReport',
];

foreach ($tier2Aggregates as $key => $method) {
    $report = AiReports::REPORTS[$key] ?? null;

    check("{$key}: is registered", is_array($report));

    if (!is_array($report)) {
        continue;
    }

    check("{$key}: reads {$method}", ($report['source'][1] ?? '') === $method,
        (string) ($report['source'][1] ?? ''));

    // The assertion this section exists for.
    check("{$key}: sends the kpis branch, NOT the detail list",
        ($report['branch'] ?? null) === 'kpis',
        var_export($report['branch'] ?? null, true));
}

// And the detail branches are not registered under any key. Checked by
// looking at every report's branch rather than by naming these five, so a
// sixth report added later cannot sneak one in.
$detailBranches = ['records', 'incidents', 'surgeons', 'items'];
$registeredDetail = [];

foreach (AiReports::REPORTS as $key => $report) {
    if (in_array($report['branch'] ?? null, $detailBranches, true)) {
        $registeredDetail[] = $key . ' -> ' . $report['branch'];
    }
}

check('NO report sends a detail branch -- records, incidents, surgeons or items',
    $registeredDetail === [], implode(', ', $registeredDetail));

// -- the custodian -----------------------------------------------------------

check('stock_levels_low is registered', AiReports::knows('stock_levels_low'));

check('and it declares the flattening shape',
    (AiReports::REPORTS['stock_levels_low']['shape'] ?? '') === 'flattenLowStockLocations');

check('the allowlist does NOT name custodian_name',
    !in_array('custodian_name', AiPayload::ALLOWLIST['stock_levels_low'] ?? [], true));

check('nor the location id, which identifies nothing but adds nothing either',
    !in_array('id', AiPayload::ALLOWLIST['stock_levels_low'] ?? [], true));

check('but it DOES name the location\'s own name, or the model cannot say which location',
    in_array('name', AiPayload::ALLOWLIST['stock_levels_low'] ?? [], true));

// The service still returns the column -- if it stopped, this test would pass
// for the wrong reason and the drop would no longer be being exercised.
$rawLocations = (new \App\Modules\StockLevels\Services\StockLevelService())->lowStock([])['locations'] ?? [];

check('the service still returns custodian_name, so the drop is real work',
    $rawLocations !== [] && array_key_exists('custodian_name', (array) $rawLocations[0]),
    $rawLocations === [] ? 'no locations at all' : implode(', ', array_keys((array) $rawLocations[0])));

$lowBuilt = AiReports::build('stock_levels_low', []);

$lowKeys = [];

foreach ($lowBuilt['rows'] as $row) {
    foreach (array_keys($row) as $k) {
        $lowKeys[$k] = true;
    }
}

check('and the built payload does not carry it', !isset($lowKeys['custodian_name']),
    implode(', ', array_keys($lowKeys)));

// THE REGRESSION THAT MATTERS, and it was a real bug in this phase.
//
// The first version of flattenLowStockLocations assembled a fresh row with the
// custodian simply absent. The payload was correct and the record was not:
// project() reports what it refuses in `dropped`, AiGuardService writes that to
// the run ledger, and a row built without the column never reaches the
// allowlist -- so the ledger said nothing had been withheld from the one
// report in this phase that withholds a person's name.
check('THE DROP IS RECORDED, not just performed -- the ledger must be able to show it',
    in_array('custodian_name', $lowBuilt['dropped'], true),
    implode(', ', $lowBuilt['dropped']));

// -- and nothing person-shaped crept into the five aggregate allowlists ------
//
// The generic section above checks the built payload. This checks the
// ALLOWLIST, which is the declaration -- a field can be absent from a payload
// today because the window was empty and present tomorrow.
// THE WORD THAT MATTERS IS "name", NOT "patient", and arriving at that took
// two wrong versions worth recording.
//
// The first list matched `patient_` as a substring and flagged
// `inpatient_mortalities` -- a count of deaths among inpatients, with no
// patient in it. Anchoring `patient_` to the start of the field fixed that one
// and still flagged `patient_days`, which counts patient-days. The morphology
// of the column name is simply not the signal: `patient_name` names a person
// and `patient_days` counts them, and both start the same way.
//
// So the rule is what it always was in plain words. A field names a person if
// it says `name`, or says one of the few other words that only ever belong to
// a person, or IS one of the identifier columns -- which are listed outright,
// because `patient_id` identifies somebody and `warehouse_id` does not, and no
// pattern tells those apart either.
//
// This is the same trap the probe for this phase fell into with `patient_days`
// and the panel scan in AI-5a fell into with `report:`. A matcher built from
// what a name looks like will be loosened or deleted the first time it cries
// wolf, and then it protects nothing.
$personIdentifiers = ['patient_id', 'patient_no', 'encounter_id', 'employee_id', 'user_id'];
$personWords = ['name', 'surgeon', 'custodian', 'mrn', 'birth', 'dob', '_by'];

$namesAPerson = static function (string $field) use ($personIdentifiers, $personWords): bool {
    $lower = strtolower($field);

    if (in_array($lower, $personIdentifiers, true)) {
        return true;
    }

    foreach ($personWords as $word) {
        if (str_contains($lower, $word)) {
            return true;
        }
    }

    return false;
};

$suspicious = [];

foreach (array_keys($tier2Aggregates) as $key) {
    foreach (AiPayload::ALLOWLIST[$key] ?? [] as $field) {
        if ($namesAPerson($field)) {
            $suspicious[] = "{$key}.{$field}";
        }
    }
}

check('no Tier 2 aggregate allowlist names anything person-shaped',
    $suspicious === [], implode(', ', $suspicious));

// The matcher has to be able to fire, or the line above means nothing. These
// are the real column names from the detail branches that were NOT registered.
$wouldFire = [];

foreach (['patient_name', 'operating_surgeon', 'custodian_name', 'recorded_by',
          'patient_id', 'employee_id'] as $field) {
    if ($namesAPerson($field)) {
        $wouldFire[] = $field;
    }
}

check('and the matcher fires on the six real columns it is guarding against',
    count($wouldFire) === 6, implode(', ', $wouldFire));

// The other half: the counts that merely read like people. Without this the
// matcher could be tightened to nothing and still look like it worked.
$falsePositives = [];

foreach (['inpatient_mortalities', 'patient_days', 'ventilated_patients', 'total_discharges',
          'near_misses', 'sentinel_events', 'warehouse_id', 'total_records'] as $field) {
    if ($namesAPerson($field)) {
        $falsePositives[] = $field;
    }
}

check('and NOT on the counts that merely read like people',
    $falsePositives === [], implode(', ', $falsePositives));

// -- the two reports this phase could not register ---------------------------
//
// getInventoryActivityReport and getInventoryTransactionsReport are the
// remaining Tier 2 entries. Both return an EMPTY ARRAY on the test database --
// not an empty branch, no branches at all -- so there is no shape to read and
// an allowlist for them could only have been written off their SQL. That is
// the mistake AI-2 caught and this is the assertion that keeps them out until
// somebody can observe them.
foreach (['getInventoryActivityReport', 'getInventoryTransactionsReport'] as $notYet) {
    $registered = false;

    foreach (AiReports::REPORTS as $report) {
        if (($report['source'][1] ?? '') === $notYet) {
            $registered = true;
        }
    }

    check("{$notYet} is NOT registered -- its shape cannot be observed", !$registered);
}

echo "\n==================================================\n";
echo "  {$pass} passed, {$fail} failed\n";
echo "==================================================\n";

exit($fail === 0 ? 0 : 1);
