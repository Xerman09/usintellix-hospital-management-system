<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

// Point this process at the disposable database BEFORE anything connects.
//
// Until 21 November this suite ran against whatever backend/.env names, which
// is the live database -- see docs/TODO.md 3.4. TestDatabase::use() refuses any
// target that is not clearly a test database, and because it writes
// $_ENV['DB_DATABASE'] before Env::load() runs (and Env::load() never
// overwrites a key that is already set), the override survives this suite's own
// Env::load() call further down.
require_once __DIR__ . '/lib/test_database.php';

try {
    TestDatabase::use();
} catch (Throwable $e) {
    echo 'REFUSED: ' . $e->getMessage() . "\n";
    exit(1);
}

use App\Core\Database;
use App\Core\Env;
use App\Modules\MyChart\Services\PortalGuard;
use App\Modules\MyChart\Services\PortalHealthMaintenanceService as HM;

Env::load();

echo "==================================================\n";
echo "   Automated Verification: Health Maintenance (M14)\n";
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

$svc = new ReflectionClass(HM::class);
$call = static function (string $method, array $args = []) use ($svc) {
    $m = $svc->getMethod($method);
    $m->setAccessible(true);

    return $m->invoke(null, ...$args);
};

$db = Database::connection();

// --------------------------------------------------------------------------
// 1. Schema 338.
// --------------------------------------------------------------------------
echo "\n-- Schema 338 --\n";

foreach (['portal_health_maintenance_items', 'portal_care_gap_requests'] as $table) {
    $found = $db->query(
        "SELECT table_name FROM information_schema.tables
         WHERE table_schema = DATABASE() AND table_name = '{$table}'"
    )->fetchColumn();
    check("{$table} exists", $found !== false);
}

$cols = $db->query(
    "SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'portal_health_maintenance_items'"
)->fetchAll(PDO::FETCH_COLUMN);

foreach ([
    'practice_rule_id', 'patient_label', 'what_it_is', 'why_it_matters', 'how_to_get_it',
    'recurrence_val', 'recurrence_unit', 'grace_days', 'needs_condition', 'condition_note',
    'is_patient_visible', 'sequence',
] as $c) {
    check("items.{$c} is present", in_array($c, $cols, true));
}

$cols = $db->query(
    "SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'portal_care_gap_requests'"
)->fetchAll(PDO::FETCH_COLUMN);

foreach (['patient_reminder_id', 'item_label', 'action', 'done_on', 'done_where', 'status', 'action_id'] as $c) {
    check("requests.{$c} is present", in_array($c, $cols, true));
}

$settingCols = $db->query(
    "SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'general_settings'
       AND column_name IN ('portal_allow_health_maintenance', 'portal_allow_care_gap_requests', 'portal_care_gap_max_pending')"
)->fetchAll(PDO::FETCH_COLUMN);
check('all three general_settings columns were added', count($settingCols) === 3, 'found ' . count($settingCols));

// --------------------------------------------------------------------------
// 2. Capability.
// --------------------------------------------------------------------------
echo "\n-- Capability (seed 075) --\n";

check('PortalGuard exposes CAP_HEALTH_MAINTENANCE',
    PortalGuard::CAP_HEALTH_MAINTENANCE === 'mychart_health_maintenance');

$granted = (int) $db->query(
    "SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id
     WHERE r.name = 'patient' AND rp.capability = 'mychart_health_maintenance' AND rp.is_granted = 1"
)->fetchColumn();
check('the patient role holds mychart_health_maintenance', $granted === 1,
    "found {$granted} rows -- without it every endpoint returns 403");

// --------------------------------------------------------------------------
// 3. Settings hardening.
// --------------------------------------------------------------------------
echo "\n-- Settings --\n";

$settings = $call('settings');
check('allow is a boolean', is_bool($settings['allow']));
check('allow_requests is a boolean', is_bool($settings['allow_requests']));
check('max_pending is sane', is_int($settings['max_pending']) && $settings['max_pending'] >= 1 && $settings['max_pending'] <= 50,
    'got ' . var_export($settings['max_pending'], true));

// --------------------------------------------------------------------------
// 4. Interval arithmetic. This is what did not exist before M14, so it is
//    worth being exact about -- including that it goes by the calendar.
// --------------------------------------------------------------------------
echo "\n-- Intervals --\n";

check('one year on from a date is the same day next year', HM::addInterval('2026-03-15', 1, 'Year') === '2027-03-15');
check('three years on', HM::addInterval('2024-02-29', 3, 'Year') === '2027-03-01',
    'got ' . var_export(HM::addInterval('2024-02-29', 3, 'Year'), true) . " -- a leap day plus three years has no 29th, and PHP rolls to the 1st");
check('three months on crosses the year end', HM::addInterval('2026-11-30', 3, 'Month') === '2027-03-02',
    'got ' . var_export(HM::addInterval('2026-11-30', 3, 'Month'), true)
    . ' -- 30 November plus three months is 30 February, which PHP rolls to 2 March');
check('one month on from a 31st short month rolls forward', HM::addInterval('2026-01-31', 1, 'Month') === '2026-03-03',
    'got ' . var_export(HM::addInterval('2026-01-31', 1, 'Month'), true) . ' -- February has no 31st');
check('weeks work', HM::addInterval('2026-01-01', 2, 'Week') === '2026-01-15');
check('days work', HM::addInterval('2026-01-01', 10, 'Day') === '2026-01-11');
check('a zero interval is refused', HM::addInterval('2026-01-01', 0, 'Year') === null);
check('a negative interval is refused', HM::addInterval('2026-01-01', -3, 'Year') === null);
check('an unknown unit is refused', HM::addInterval('2026-01-01', 1, 'Fortnight') === null);

check('"every year" for one year', HM::everyText(1, 'Year') === 'every year');
check('"every 3 years" for three', HM::everyText(3, 'Year') === 'every 3 years');
check('"every 3 months" for three months', HM::everyText(3, 'Month') === 'every 3 months');
check('a bad interval has no sentence', HM::everyText(0, 'Year') === '');
check('a bad unit has no sentence', HM::everyText(1, 'Fortnight') === '');

// --------------------------------------------------------------------------
// 5. Where an item stands. The dangerous direction is "up to date" when it is
//    not, so every boundary is checked.
// --------------------------------------------------------------------------
echo "\n-- Due, overdue, up to date --\n";

$row = static fn(?string $lastDone, int $val = 1, string $unit = 'Year', int $grace = 30, string $dueStatus = 'due'): array => [
    'patient_label' => 'Blood pressure check',
    'recurrence_val' => $val,
    'recurrence_unit' => $unit,
    'grace_days' => $grace,
    'last_done_on' => $lastDone,
    'due_status' => $dueStatus,
];

$today = '2026-11-14';

$s = HM::stateFor($row(null), $today);
check('never done, engine says due -> due', $s['status'] === 'due');
check('never done says so in words', str_contains($s['text'], 'no record'));
check('never done offers to be told it was done elsewhere', str_contains($s['text'], 'elsewhere'));
check('never done has no next-due date invented', $s['next_due'] === null);

$s = HM::stateFor($row(null, 1, 'Year', 30, 'past_due'), $today);
check('never done, engine says past_due -> overdue', $s['status'] === 'overdue');
check('never done and overdue still says there is no record', str_contains($s['text'], 'no record'));

$s = HM::stateFor($row('2026-06-01'), $today);
check('done five months ago on an annual item -> up to date', $s['status'] === 'up_to_date', $s['status']);
check('up to date names the next due date', $s['next_due'] === '2027-06-01', var_export($s['next_due'], true));

$s = HM::stateFor($row('2025-11-15'), $today);
check('due tomorrow is still up to date', $s['status'] === 'up_to_date', $s['status'] . ' / ' . var_export($s['next_due'], true));

$s = HM::stateFor($row('2025-11-14'), $today);
check('due exactly today -> due, not overdue', $s['status'] === 'due', $s['status']);

$s = HM::stateFor($row('2025-10-16'), $today);
check('29 days past due with 30 days grace -> due', $s['status'] === 'due', $s['status']);

$s = HM::stateFor($row('2025-10-15'), $today);
check('exactly at the end of the grace period -> due', $s['status'] === 'due', $s['status']);

$s = HM::stateFor($row('2025-10-14'), $today);
check('one day past the grace period -> overdue', $s['status'] === 'overdue', $s['status']);
check('overdue names the date it was due', str_contains($s['text'], '2026-10-14'), $s['text']);

$s = HM::stateFor($row('2025-10-14', 1, 'Year', 0), $today);
check('with no grace, a day past due is overdue', $s['status'] === 'overdue');

$s = HM::stateFor($row('2024-01-01', 3, 'Year', 90), $today);
check('a three-yearly item done under three years ago is up to date', $s['status'] === 'up_to_date', $s['status']);

$s = HM::stateFor($row('2023-01-01', 3, 'Year', 90), $today);
check('a three-yearly item done nearly four years ago is overdue', $s['status'] === 'overdue', $s['status']);

$s = HM::stateFor($row('2026-06-01 14:30:00'), $today);
check('a datetime last-done value is read as its date', $s['next_due'] === '2027-06-01', var_export($s['next_due'], true));

$s = HM::stateFor($row('2026-06-01', 0, 'Year'), $today);
check('an item with a broken interval does not claim to be up to date', $s['status'] === 'due', $s['status']);
check('and says to ask rather than guessing a date', $s['next_due'] === null && str_contains($s['text'], 'Ask us'));

$s = HM::stateFor($row(''), $today);
check('an empty last-done string is treated as never done', $s['status'] === 'due' && str_contains($s['text'], 'no record'));

$s = HM::stateFor($row('2026-06-01', 1, 'Year', -5), $today);
check('a negative grace period does not crash', in_array($s['status'], ['due', 'overdue', 'up_to_date'], true));

// --------------------------------------------------------------------------
// 6. The seeded items, and the decision made about every rule.
// --------------------------------------------------------------------------
echo "\n-- Items (seed 074) --\n";

$itemsOut = HM::items();
$items = $itemsOut['items'];
check('items() returns the catalogue', count($items) > 0);
check('items() offers the unit list', $itemsOut['units'] === HM::UNITS);

$ruleCount = (int) $db->query(
    "SELECT COUNT(*) FROM practice_rules WHERE deleted_at IS NULL"
)->fetchColumn();
check('every practice rule has an explicit decision recorded', count($items) === $ruleCount,
    count($items) . " items for {$ruleCount} rules -- a rule with no item row is an unmade decision");

$shown = array_values(array_filter($items, static fn($i) => $i['shown_to_patients']));
check('something is shown to patients', count($shown) > 0);
check('every shown item has a patient label', count(array_filter($shown, static fn($i) => trim((string) $i['patient_label']) === '')) === 0);
check('every shown item explains what it is', count(array_filter($shown, static fn($i) => trim((string) $i['what_it_is']) === '')) === 0);
check('every shown item says how to get it done', count(array_filter($shown, static fn($i) => trim((string) $i['how_to_get_it']) === '')) === 0);
check('no shown item needs a condition', count(array_filter($shown, static fn($i) => $i['needs_condition'])) === 0);
check('every shown item has a real interval', count(array_filter($shown, static fn($i) => $i['recurrence_val'] < 1)) === 0);

// The whole point of the item table: the rules the engine cannot decide must
// not reach a patient.
$dangerous = ['Diabetes: Eye Exam', 'Diabetes: Foot Exam', 'Diabetes: Hemoglobin A1C',
    'Diabetes: Urine Microalbumin', 'Coumadin Management - INR Monitoring',
    'Data Entry - Social Security Number', 'Assess Penicillin Allergy'];

foreach ($dangerous as $title) {
    $match = array_values(array_filter($items, static fn($i) => $i['rule_title'] === $title));

    if (!$match) {
        echo "  [note] rule \"{$title}\" is not in this database, so nothing to check\n";
        continue;
    }

    check("\"{$title}\" is not shown to patients", $match[0]['shown_to_patients'] === false);
}

// Rules with no demographic criteria match every patient, which is why they
// cannot be patient-facing on the engine's word alone.
$noCriteriaShown = array_values(array_filter($items, static fn($i) => $i['shown_to_patients'] && !$i['has_criteria']));
check('nothing shown to patients relies on a rule with no age or sex criteria',
    count($noCriteriaShown) === 0,
    'would show: ' . implode(', ', array_column($noCriteriaShown, 'rule_title')));

// --------------------------------------------------------------------------
// 7. Editing an item: the guard that stops a condition-dependent item being
//    switched on by accident.
// --------------------------------------------------------------------------
echo "\n-- Editing items --\n";

$res = HM::saveItem([], 1);
check('saving with no id is refused', empty($res['success']) && !empty($res['not_found']));

$res = HM::saveItem(['id' => 99999999, 'patient_label' => 'x', 'recurrence_val' => 1], 1);
check('saving an item that does not exist is refused', empty($res['success']) && !empty($res['not_found']));

$anyItem = array_values(array_filter($items, static fn($i) => !$i['needs_condition']));
$condItem = array_values(array_filter($items, static fn($i) => $i['needs_condition']));

if ($anyItem) {
    $id = $anyItem[0]['id'];

    $res = HM::saveItem(['id' => $id, 'patient_label' => '', 'recurrence_val' => 1, 'recurrence_unit' => 'Year'], 1);
    check('an empty patient label is refused', empty($res['success']) && isset($res['errors']['patient_label']));

    $res = HM::saveItem(['id' => $id, 'patient_label' => 'x', 'recurrence_val' => 0, 'recurrence_unit' => 'Year'], 1);
    check('a zero interval is refused', empty($res['success']) && isset($res['errors']['recurrence_val']));

    $res = HM::saveItem(['id' => $id, 'patient_label' => 'x', 'recurrence_val' => 200, 'recurrence_unit' => 'Year'], 1);
    check('an absurd interval is refused', empty($res['success']) && isset($res['errors']['recurrence_val']));

    $res = HM::saveItem(['id' => $id, 'patient_label' => 'x', 'recurrence_val' => 1, 'recurrence_unit' => 'Fortnight'], 1);
    check('an unknown unit is refused', empty($res['success']) && isset($res['errors']['recurrence_unit']));

    $res = HM::saveItem(['id' => $id, 'patient_label' => 'x', 'recurrence_val' => 1, 'recurrence_unit' => 'Year', 'grace_days' => 400], 1);
    check('an absurd grace period is refused', empty($res['success']) && isset($res['errors']['grace_days']));

    $res = HM::saveItem([
        'id' => $id, 'patient_label' => str_repeat('x', 151), 'recurrence_val' => 1, 'recurrence_unit' => 'Year',
    ], 1);
    check('an over-long patient label is refused', empty($res['success']) && isset($res['errors']['patient_label']));

    $res = HM::saveItem([
        'id' => $id, 'patient_label' => 'x', 'recurrence_val' => 1, 'recurrence_unit' => 'Year',
        'what_it_is' => str_repeat('x', 501),
    ], 1);
    check('over-long body text is refused', empty($res['success']) && isset($res['errors']['what_it_is']));
}

if ($condItem) {
    $res = HM::saveItem([
        'id' => $condItem[0]['id'], 'patient_label' => $condItem[0]['patient_label'],
        'recurrence_val' => 1, 'recurrence_unit' => 'Year',
        'needs_condition' => true, 'is_patient_visible' => true,
    ], 1);
    check('a condition-dependent item cannot be switched on while it still needs a condition',
        empty($res['success']) && isset($res['errors']['is_patient_visible']),
        'this is what stops a healthy patient being told to book a diabetic eye exam');
} else {
    echo "  [note] no condition-dependent item exists, so that guard was not exercised\n";
}

// The refusals above must not have changed anything.
$after = HM::items()['items'];
check('no refused edit changed an item',
    array_column($after, 'patient_label') === array_column($items, 'patient_label')
    && array_column($after, 'is_patient_visible') === array_column($items, 'is_patient_visible'));

// --------------------------------------------------------------------------
// 8. The patient's panel, against real data.
// --------------------------------------------------------------------------
echo "\n-- The patient's panel --\n";

$pid = (int) $db->query(
    "SELECT patient_id FROM patient_reminders WHERE deleted_at IS NULL
     GROUP BY patient_id ORDER BY COUNT(*) DESC LIMIT 1"
)->fetchColumn();

if ($pid) {
    $mine = HM::mine($pid);

    check('mine() returns items, requests and counts',
        isset($mine['items'], $mine['requests'], $mine['counts']) && is_array($mine['items']));
    check('mine() carries the server time', !empty($mine['server_time']));
    check('mine() reports whether asking is allowed', is_bool($mine['allow_requests']));

    check('every item carries a status the app knows',
        count(array_filter($mine['items'], static fn($i) => !in_array($i['status'], ['due', 'overdue', 'up_to_date'], true))) === 0);
    check('every item carries a sentence to show',
        count(array_filter($mine['items'], static fn($i) => trim((string) $i['status_text']) === '')) === 0);
    check('every item says whether it can be asked about',
        count(array_filter($mine['items'], static fn($i) => !array_key_exists('can_request', $i))) === 0);
    check('nothing up to date offers to be asked about',
        count(array_filter($mine['items'], static fn($i) => $i['status'] === 'up_to_date' && $i['can_request'])) === 0);
    check('the counts add up to the items',
        array_sum($mine['counts']) === count($mine['items']),
        json_encode($mine['counts']) . ' vs ' . count($mine['items']));

    // Clinical labels must never reach the patient.
    check('no clinical item_label leaks into the panel',
        count(array_filter($mine['items'], static fn($i) => str_contains((string) $i['label'], 'Assessment -')
            || str_contains((string) $i['label'], 'Data Entry'))) === 0,
        'item_label is the clinical register; patient_label is what the patient reads');

    $labels = array_column($mine['items'], 'label');

    foreach (['Diabetic eye check', 'Diabetic foot check', 'HbA1c blood test', 'Urine protein test',
        'INR blood test', 'Penicillin allergy assessment', 'Social security number on file'] as $never) {
        check("\"{$never}\" is not in the panel", !in_array($never, $labels, true));
    }

    // Overdue first: an overdue screening below an up-to-date one is a panel
    // nobody reads to the bottom of.
    $rank = ['overdue' => 0, 'due' => 1, 'up_to_date' => 2];
    $order = array_map(static fn($i) => $rank[$i['status']], $mine['items']);
    $sorted = $order;
    sort($sorted);
    check('the panel puts overdue first, then due', $order === $sorted);

    // dueFor() is what the To-Do list reads; it must agree with the panel.
    $due = HM::dueFor($pid);
    $panelDue = array_values(array_filter($mine['items'], static fn($i) => $i['status'] !== 'up_to_date' && $i['pending_request'] === null));
    check('the To-Do list and the panel agree on what is outstanding',
        count($due) === count($panelDue),
        count($due) . ' vs ' . count($panelDue));
    check('every To-Do entry carries a label, a status and a sentence',
        count(array_filter($due, static fn($d) => empty($d['label']) || empty($d['status']) || empty($d['text']))) === 0);
} else {
    echo "  [note] no patient_reminders rows exist, so the panel was not exercised against real data\n";
}

// --------------------------------------------------------------------------
// 9. Requests: every refusal, and nothing written.
// --------------------------------------------------------------------------
echo "\n-- Request refusals --\n";

$before = (int) $db->query("SELECT COUNT(*) FROM portal_care_gap_requests")->fetchColumn();

$res = HM::request($pid ?: 1, ['id' => 99999999, 'action' => 'book']);
check('asking about a reminder that is not on your list is refused',
    empty($res['success']) && !empty($res['not_found']));

$res = HM::request(99999999, ['id' => 1, 'action' => 'book']);
check('a stranger cannot ask about anything', empty($res['success']) && !empty($res['not_found']));

if ($pid) {
    $mine = HM::mine($pid);
    $first = $mine['items'][0] ?? null;

    if ($first) {
        $res = HM::request($pid, ['id' => $first['id'], 'action' => 'nonsense']);
        check('an unknown action is refused', empty($res['success']) && isset($res['errors']['action']));

        $res = HM::request($pid, ['id' => $first['id'], 'action' => 'report_done']);
        check('"it was done" with no date is refused', empty($res['success']) && isset($res['errors']['done_on']));

        $res = HM::request($pid, ['id' => $first['id'], 'action' => 'report_done', 'done_on' => '2026-02-30']);
        check('a date that is not a real day is refused', empty($res['success']) && isset($res['errors']['done_on']));

        $res = HM::request($pid, ['id' => $first['id'], 'action' => 'report_done', 'done_on' => '2099-01-01']);
        check('a date in the future is refused', empty($res['success']) && isset($res['errors']['done_on']));

        $res = HM::request($pid, ['id' => $first['id'], 'action' => 'book', 'note' => str_repeat('x', 501)]);
        check('an over-long note is refused', empty($res['success']) && isset($res['errors']['note']));

        $res = HM::request($pid, [
            'id' => $first['id'], 'action' => 'report_done', 'done_on' => '2026-01-01',
            'done_where' => str_repeat('x', 256),
        ]);
        check('an over-long place is refused', empty($res['success']) && isset($res['errors']['done_where']));

        // An id belonging to someone else's chart must not be usable.
        $otherReminder = (int) $db->query(
            "SELECT id FROM patient_reminders WHERE patient_id <> {$pid} AND deleted_at IS NULL ORDER BY id LIMIT 1"
        )->fetchColumn();

        if ($otherReminder) {
            $res = HM::request($pid, ['id' => $otherReminder, 'action' => 'book']);
            check("a reminder from another patient's chart is refused",
                empty($res['success']) && !empty($res['not_found']));
        }
    }
}

$res = HM::withdraw($pid ?: 1, 99999999);
check('withdrawing a request that does not exist is refused',
    empty($res['success']) && !empty($res['not_found']));

$after = (int) $db->query("SELECT COUNT(*) FROM portal_care_gap_requests")->fetchColumn();
check('no refusal wrote a request row', $before === $after, "{$before} before, {$after} after");

// --------------------------------------------------------------------------
// 10. Review refusals. Accepting is not exercised -- it writes a completed
//     action against a real reminder in this shared database.
// --------------------------------------------------------------------------
echo "\n-- Review refusals --\n";

$actionsBefore = (int) $db->query("SELECT COUNT(*) FROM patient_reminder_actions")->fetchColumn();

$res = HM::review(99999999, ['decision' => 'accept'], 1);
check('reviewing a request that does not exist is refused', empty($res['success']));

$res = HM::review(99999999, ['decision' => 'nonsense'], 1);
check('an unknown decision is refused before anything is looked up',
    empty($res['success']) && str_contains(strtolower($res['message']), 'accept'));

$pendingRow = $db->query(
    "SELECT id FROM portal_care_gap_requests WHERE status = 'pending' AND deleted_at IS NULL ORDER BY id LIMIT 1"
)->fetch(PDO::FETCH_ASSOC);

if ($pendingRow) {
    $res = HM::review((int) $pendingRow['id'], ['decision' => 'decline'], 1);
    check('declining without a reason is refused',
        empty($res['success']) && isset($res['errors']['review_note']),
        'the patient reads that reason, so there has to be one');
} else {
    echo "  [note] no pending request exists, so the decline-needs-a-reason path used ids only\n";
}

$actionsAfter = (int) $db->query("SELECT COUNT(*) FROM patient_reminder_actions")->fetchColumn();
check('no refused review wrote a completed action', $actionsBefore === $actionsAfter,
    "{$actionsBefore} before, {$actionsAfter} after");

// --------------------------------------------------------------------------
// 11. The desk queue.
// --------------------------------------------------------------------------
echo "\n-- Queue --\n";

foreach (['pending', 'accepted', 'declined', 'withdrawn', 'all'] as $status) {
    $q = HM::queue($status);
    check("the {$status} queue answers", isset($q['items']) && is_array($q['items']) && $q['status'] === $status);
}

$q = HM::queue('not-a-status');
check('an unknown status falls back to all rather than erroring', $q['status'] === 'all');

$q = HM::queue('all');
check('the queue carries its counts',
    isset($q['counts']['pending'], $q['counts']['accepted'], $q['counts']['declined'], $q['counts']['to_book']));
check('every count is an integer', count(array_filter($q['counts'], 'is_int')) === count($q['counts']));

$q = HM::queue('all', "'; DROP TABLE patients; --");
check('a search string is bound, not interpolated', is_array($q['items']));

$itemsQ = HM::items("'; DROP TABLE practice_rules; --");
check('the item search is bound too', is_array($itemsQ['items']) && count($itemsQ['items']) === 0);

// --------------------------------------------------------------------------
// 12. Role lists.
// --------------------------------------------------------------------------
echo "\n-- Roles --\n";

check('no patient role can reach the desk endpoints',
    !in_array('patient', HM::REVIEW_ROLES, true)
    && !in_array('patient', HM::DECIDE_ROLES, true)
    && !in_array('patient', HM::EDIT_ROLES, true));
check('editing the wording is narrower than reading the queue',
    count(HM::EDIT_ROLES) < count(HM::REVIEW_ROLES),
    'what a patient is told, and how often an item comes round, is a clinical decision');
check('every editor may also read the queue',
    count(array_diff(HM::EDIT_ROLES, HM::REVIEW_ROLES)) === 0);

echo "\n";
echo "  NOTE: a successful request, an accept and a decline are NOT exercised here --\n";
echo "        they would add rows to this shared database, and accepting a \"done\n";
echo "        elsewhere\" claim writes a completed action that closes a real patient's\n";
echo "        screening reminder. Every refusal path above returns before any write,\n";
echo "        and both row counts are asserted unchanged. The interval arithmetic and\n";
echo "        the due/overdue boundaries, which are the part that must not be wrong,\n";
echo "        are tested directly and need no rows.\n";

echo "\n==================================================\n";
echo "   {$pass} passed, {$fail} failed\n";
echo "==================================================\n";

exit($fail === 0 ? 0 : 1);
