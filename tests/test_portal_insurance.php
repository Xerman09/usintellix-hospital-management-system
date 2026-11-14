<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Modules\MyChart\Services\PortalInsuranceService;

Env::load();

echo "==================================================\n";
echo "   Automated Verification: Insurance Self-Service (M12)\n";
echo "==================================================\n";

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

$svc = new ReflectionClass(PortalInsuranceService::class);
$call = static function (string $method, array $args = []) use ($svc) {
    $m = $svc->getMethod($method);
    $m->setAccessible(true);

    return $m->invoke(null, ...$args);
};

$db = Database::connection();

// --------------------------------------------------------------------------
// 1. Settings hardening.
// --------------------------------------------------------------------------
echo "\n-- Settings --\n";

$settings = $call('settings');
check('allow_requests is a boolean', is_bool($settings['allow_requests']));
check('max_pending is sane', is_int($settings['max_pending']) && $settings['max_pending'] >= 1 && $settings['max_pending'] <= 20,
    'got ' . var_export($settings['max_pending'], true));

// --------------------------------------------------------------------------
// 2. Date parsing. A policy start date that is not a real day must not reach
//    the record.
// --------------------------------------------------------------------------
echo "\n-- Date parsing --\n";

foreach ([
    '2026-01-15' => '2026-01-15',
    '2026-02-30' => null,     // February has no 30th
    '2026-13-01' => null,     // no 13th month
    '15/01/2026' => null,     // wrong format
    'today' => null,
    '' => null,
] as $given => $expected) {
    $got = $call('date', [(string) $given]);
    check("date(" . var_export($given, true) . ") -> " . var_export($expected, true), $got === $expected, 'got ' . var_export($got, true));
}

// --------------------------------------------------------------------------
// 3. Coverage status, which is what the patient actually reads.
// --------------------------------------------------------------------------
echo "\n-- Coverage status wording --\n";

$today = date('Y-m-d');
$yesterday = date('Y-m-d', strtotime('-1 day'));
$nextYear = date('Y-m-d', strtotime('+1 year'));

check('an expired card says so, with the date',
    str_contains($call('statusText', [['term_date' => $yesterday, 'effective_date' => null], $today]), 'Expired on ' . $yesterday));
check('an expired card tells the patient to send an update',
    str_contains(strtolower($call('statusText', [['term_date' => $yesterday, 'effective_date' => null], $today])), 'update'));
check('a future start date says when it starts',
    str_contains($call('statusText', [['term_date' => null, 'effective_date' => $nextYear], $today]), 'Starts on'));
check('an open-ended active card just says Active',
    $call('statusText', [['term_date' => null, 'effective_date' => null], $today]) === 'Active.');
check('an active card with an end date names it',
    str_contains($call('statusText', [['term_date' => $nextYear, 'effective_date' => null], $today]), 'Active until'));

// --------------------------------------------------------------------------
// 4. Request validation. Every refusal below returns before any INSERT.
// --------------------------------------------------------------------------
echo "\n-- Request validation (no writes) --\n";

$patientId = (int) $db->query(
    "SELECT patient_id FROM patient_insurances WHERE deleted_at IS NULL ORDER BY id LIMIT 1"
)->fetchColumn();

if ($patientId <= 0) {
    $patientId = (int) $db->query("SELECT id FROM patients WHERE deleted_at IS NULL ORDER BY id LIMIT 1")->fetchColumn();
}

$rowsBefore = (int) $db->query("SELECT COUNT(*) FROM patient_insurance_requests")->fetchColumn();
$coverageBefore = (int) $db->query("SELECT COUNT(*) FROM patient_insurances WHERE deleted_at IS NULL")->fetchColumn();

if ($patientId <= 0) {
    echo "  [WARN] No patient in this database; request paths not exercised.\n";
} else {
    $r = PortalInsuranceService::request($patientId, [], null);
    check('no action is refused', empty($r['success']));

    $r = PortalInsuranceService::request($patientId, ['action' => 'sideways'], null);
    check('an unknown action is refused', empty($r['success']));

    $r = PortalInsuranceService::request($patientId, ['action' => 'add'], null);
    check('adding with no policy number is refused', empty($r['success']) && isset($r['errors']['policy_number']));

    $r = PortalInsuranceService::request($patientId, ['action' => 'add', 'policy_number' => 'X1'], null);
    check('adding with no insurer at all is refused', empty($r['success']) && isset($r['errors']['insurance_id']));

    $r = PortalInsuranceService::request($patientId, ['action' => 'add', 'policy_number' => 'X1', 'insurance_id' => 99999999], null);
    check('an insurer id that does not exist is refused', empty($r['success']) && isset($r['errors']['insurance_id']));

    $r = PortalInsuranceService::request($patientId, [
        'action' => 'add', 'policy_number' => 'X1', 'insurer_name_text' => 'Some Local HMO',
        'effective_date' => '2026-02-30',
    ], null);
    check('an impossible start date is refused', empty($r['success']) && isset($r['errors']['effective_date']));

    $r = PortalInsuranceService::request($patientId, ['action' => 'update', 'policy_number' => 'X1'], null);
    check('correcting without naming the cover is refused', empty($r['success']) && isset($r['errors']['patient_insurance_id']));

    $r = PortalInsuranceService::request($patientId, ['action' => 'remove'], null);
    check('removing without naming the cover is refused', empty($r['success']));

    // Somebody else's coverage must not be touchable.
    $otherCoverage = (int) $db->query(
        "SELECT id FROM patient_insurances WHERE patient_id <> {$patientId} AND deleted_at IS NULL ORDER BY id LIMIT 1"
    )->fetchColumn();

    if ($otherCoverage > 0) {
        $r = PortalInsuranceService::request($patientId, [
            'action' => 'update', 'patient_insurance_id' => $otherCoverage,
            'policy_number' => 'X1', 'insurer_name_text' => 'Any',
        ], null);
        check("another patient's cover cannot be named", empty($r['success']) && isset($r['errors']['patient_insurance_id']));
    } else {
        $r = PortalInsuranceService::request($patientId, [
            'action' => 'update', 'patient_insurance_id' => 999999999,
            'policy_number' => 'X1', 'insurer_name_text' => 'Any',
        ], null);
        check('a cover id that does not exist cannot be named', empty($r['success']) && isset($r['errors']['patient_insurance_id']));
    }

    // Own coverage, but a card photo belonging to nobody.
    $ownCoverage = (int) $db->query(
        "SELECT id FROM patient_insurances WHERE patient_id = {$patientId} AND deleted_at IS NULL ORDER BY id LIMIT 1"
    )->fetchColumn();

    if ($ownCoverage > 0) {
        $r = PortalInsuranceService::request($patientId, [
            'action' => 'update', 'patient_insurance_id' => $ownCoverage,
            'policy_number' => 'X1', 'insurer_name_text' => 'Any', 'upload_id' => 999999999,
        ], null);
        check('a card photo that is not theirs is refused', empty($r['success']) && isset($r['errors']['upload_id']));

        $r = PortalInsuranceService::request($patientId, [
            'action' => 'remove', 'patient_insurance_id' => $ownCoverage, 'note' => '',
        ], null);
        check('removing without a reason is refused', empty($r['success']) && isset($r['errors']['note']));
    }

    $rowsAfter = (int) $db->query("SELECT COUNT(*) FROM patient_insurance_requests")->fetchColumn();
    check('no request row was inserted by any refusal', $rowsAfter === $rowsBefore, "{$rowsBefore} -> {$rowsAfter}");
}

// --------------------------------------------------------------------------
// 5. Review. The important one: nothing reaches patient_insurances except an
//    apply, and an apply of a free-text insurer is refused rather than guessed.
// --------------------------------------------------------------------------
echo "\n-- Review --\n";

$r = PortalInsuranceService::review(999999999, ['decision' => 'apply'], 1);
check('reviewing a missing request is refused', empty($r['success']) && !empty($r['not_found']));

$r = PortalInsuranceService::review(999999999, ['decision' => 'perhaps'], 1);
check('a decision that is neither apply nor decline is refused', empty($r['success']));

$pendingRow = $db->query(
    "SELECT id, action, insurance_id, insurer_name_text FROM patient_insurance_requests
      WHERE status = 'pending' AND deleted_at IS NULL ORDER BY id LIMIT 1"
)->fetch(PDO::FETCH_ASSOC);

if (!$pendingRow) {
    echo "  [INFO] No pending request in this database, so the decline-note and\n";
    echo "         free-text-insurer guards are checked by inspection, not execution.\n";
    $src = file_get_contents(__DIR__ . '/../backend/app/Modules/MyChart/Services/PortalInsuranceService.php');
    check('decline requires a note (guard present in source)',
        str_contains($src, "decision === 'decline' && \$note === ''"));
    check('applying a free-text insurer is refused (guard present in source)',
        str_contains($src, "\$row['insurance_id'] === null"));
    check('apply runs inside a transaction', str_contains($src, 'beginTransaction') && str_contains($src, 'rollBack'));
} else {
    $r = PortalInsuranceService::review((int) $pendingRow['id'], ['decision' => 'decline', 'note' => ''], 1);
    check('declining without a reason is refused', empty($r['success']) && isset($r['errors']['note']));

    if ($pendingRow['action'] !== 'remove' && $pendingRow['insurance_id'] === null) {
        $r = PortalInsuranceService::review((int) $pendingRow['id'], ['decision' => 'apply'], 1);
        check('applying a request whose insurer is only free text is refused', empty($r['success']));
    }
}

$coverageAfter = (int) $db->query("SELECT COUNT(*) FROM patient_insurances WHERE deleted_at IS NULL")->fetchColumn();
check('no coverage was created or removed by anything above', $coverageAfter === $coverageBefore, "{$coverageBefore} -> {$coverageAfter}");

// --------------------------------------------------------------------------
// 6. The payloads the app and the desk render.
// --------------------------------------------------------------------------
echo "\n-- Payload shape --\n";

if ($patientId > 0) {
    $mine = PortalInsuranceService::mine($patientId);

    foreach (['coverage', 'requests', 'insurers', 'types', 'can_request'] as $key) {
        check("mine() returns '{$key}'", array_key_exists($key, $mine));
    }
    check('can_request is a boolean', is_bool($mine['can_request']));
    check('the three cover types are offered', $mine['types'] === ['primary', 'secondary', 'tertiary']);

    if ($mine['coverage']) {
        $c = $mine['coverage'][0];
        foreach (['type', 'insurer', 'policy_number', 'is_active', 'status_text'] as $key) {
            check("each coverage row carries '{$key}'", array_key_exists($key, $c));
        }
        check('is_active is a boolean', is_bool($c['is_active']));
        check('status_text is a sentence, not a date', is_string($c['status_text']) && strlen($c['status_text']) > 5);
    }

    check('when requests are blocked a reason is given',
        $mine['can_request'] || is_string($mine['blocked_reason']));
}

$q = PortalInsuranceService::queue();
check('the queue returns items and counts', array_key_exists('items', $q) && array_key_exists('counts', $q));
check('the counts cover all three states', isset($q['counts']['pending'], $q['counts']['applied'], $q['counts']['declined']));

// The desk needs the current values beside the proposed ones to judge a request.
$src = file_get_contents(__DIR__ . '/../backend/app/Modules/MyChart/Services/PortalInsuranceService.php');
check('the queue joins the current cover so the desk can compare',
    str_contains($src, 'cur.policy_number AS current_policy_number'));

$seenDecided = false;
$orderHolds = true;
foreach ($q['items'] as $item) {
    if ($item['status'] !== 'pending') {
        $seenDecided = true;
    } elseif ($seenDecided) {
        $orderHolds = false;
    }
}
check('the queue puts pending ahead of decided', $orderHolds, count($q['items']) . ' item(s)');

// --------------------------------------------------------------------------
// 7. Withdrawal.
// --------------------------------------------------------------------------
echo "\n-- Withdrawal --\n";

check('withdrawing a request that does not exist is refused',
    empty(PortalInsuranceService::withdraw($patientId ?: 1, 999999999, null)['success']));

if ($pendingRow) {
    $owner = (int) $db->query("SELECT patient_id FROM patient_insurance_requests WHERE id = " . (int) $pendingRow['id'])->fetchColumn();
    $other = (int) $db->query("SELECT id FROM patients WHERE id <> {$owner} AND deleted_at IS NULL ORDER BY id LIMIT 1")->fetchColumn();

    check("another patient cannot withdraw someone else's request",
        empty(PortalInsuranceService::withdraw($other ?: 999999, (int) $pendingRow['id'], null)['success']));
}

echo "\n";
echo "  NOTE: a successful request, apply and decline are not exercised here -- they\n";
echo "        would add rows to this database and, on apply, change real coverage.\n";
echo "        Every refusal path above returns before any write, and the row counts\n";
echo "        for both tables are asserted unchanged.\n";

echo "\n==================================================\n";
echo "   {$pass} passed, {$fail} failed\n";
echo "==================================================\n";

exit($fail === 0 ? 0 : 1);
