<?php

declare(strict_types=1);

/**
 * Automated Verification: asynchronous e-visits (Phase M15a)
 *
 * Runs against the disposable database from tests/build_test_database.php and
 * refuses to run anywhere else: raising an e-visit writes rows, and replying
 * creates a real encounter in a patient record.
 *
 *   php tests/build_test_database.php --fresh   (once)
 *   php tests/test_portal_evisits.php
 *
 * Most of this suite is about ONE property: a red-flag answer must refuse the
 * submission rather than queue it. The failure being guarded against is a
 * patient typing that they have chest pain, reading "a doctor will reply", and
 * waiting at home. So the assertions check not only that the refusal happens
 * but that it leaves nothing behind that looks like work in progress -- not in
 * the clinician queue, not in the patient's list, not openable by the patient,
 * and with no reply deadline that would make it look overdue later.
 *
 * The suite switches portal_allow_evisits on for its own run and puts it back
 * to off at the end, because that is how it ships.
 */

require_once __DIR__ . '/lib/test_fixtures.php';

use App\Core\Database;
use App\Modules\MyChart\Services\PortalEvisitService;
use App\Modules\MyChart\Services\PortalGuard;

try {
    $database = TestDatabase::use();
} catch (Throwable $e) {
    echo 'REFUSED: ' . $e->getMessage() . "\n";
    exit(1);
}

echo "==================================================\n";
echo "   Automated Verification: e-Visits (M15a)\n";
echo "==================================================\n";
echo "  database: {$database}\n";
echo '  live database (untouched): ' . TestDatabase::liveDatabaseName() . "\n";

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
$connectedTo = (string) $db->query('SELECT DATABASE()')->fetchColumn();

echo "\n-- Running against the right database --\n";
check('connected to the test database', $connectedTo === $database, "connected to {$connectedTo}");
check('that is not the live database', strcasecmp($connectedTo, TestDatabase::liveDatabaseName()) !== 0);

if ($connectedTo !== $database) {
    echo "\n  Stopping: refusing to write to {$connectedTo}.\n";
    exit(1);
}

$world = TestFixtures::world();
$patientId = $world['patient_id'];
$patientUser = TestFixtures::patientUser();
$actorId = $world['staff_user_id'];

$clean = static function () use ($db, $patientId): void {
    $db->prepare('DELETE FROM portal_evisits WHERE patient_id = ?')->execute([$patientId]);
};

// This suite switches a reason off and edits a questionnaire to prove the safety
// gate works. Both are captured here and put back in the cleanup block, because
// a run that fails half way through would otherwise leave the next one reading
// rows this one changed -- which is exactly how the first version of this suite
// started failing for reasons that had nothing to do with the code.
$originalReasons = $db->query(
    'SELECT id, patient_label, patient_blurb, not_for_text, is_patient_visible, hide_reason, sequence
     FROM portal_evisit_reasons'
)->fetchAll(PDO::FETCH_ASSOC);
$originalForms = $db->query(
    "SELECT code, questions FROM portal_questionnaires WHERE use_context = 'evisit'"
)->fetchAll(PDO::FETCH_ASSOC);

$restoreSeedState = static function () use ($db, $originalReasons, $originalForms): void {
    $r = $db->prepare(
        'UPDATE portal_evisit_reasons
            SET patient_label = :label, patient_blurb = :blurb, not_for_text = :notfor,
                is_patient_visible = :vis, hide_reason = :hide, sequence = :seq
          WHERE id = :i'
    );

    foreach ($originalReasons as $row) {
        $r->execute([
            'label' => $row['patient_label'],
            'blurb' => $row['patient_blurb'],
            'notfor' => $row['not_for_text'],
            'vis' => $row['is_patient_visible'],
            'hide' => $row['hide_reason'],
            'seq' => $row['sequence'],
            'i' => $row['id'],
        ]);
    }

    $q = $db->prepare('UPDATE portal_questionnaires SET questions = :q WHERE code = :c');

    foreach ($originalForms as $row) {
        $q->execute(['q' => $row['questions'], 'c' => $row['code']]);
    }
};

$clean();

// --------------------------------------------------------------------------
// 1. It ships off. That is a feature.
// --------------------------------------------------------------------------
echo "\n-- It ships switched off --\n";

$db->exec('UPDATE general_settings SET portal_allow_evisits = 0');

$reasons = PortalEvisitService::reasons();

check('with the switch off, no reasons are offered', $reasons['items'] === []);
check('and the patient is told where to go instead',
    str_contains((string) $reasons['blocked_reason'], 'book an appointment'), (string) $reasons['blocked_reason']);
check('the form cannot be opened', PortalEvisitService::form($patientId, 'urinary') === null);

$res = PortalEvisitService::submit($patientId, ['reason_code' => 'urinary', 'answers' => []], $patientUser);
check('and nothing can be submitted', empty($res['success']), json_encode($res));
check('nothing was written while it was off',
    (int) $db->query("SELECT COUNT(*) FROM portal_evisits")->fetchColumn() === 0);

// Switch on for the rest of the suite.
$db->exec('UPDATE general_settings SET portal_allow_evisits = 1');

// --------------------------------------------------------------------------
// 2. The red-flag screener itself, as a pure function.
// --------------------------------------------------------------------------
echo "\n-- The screener --\n";

$questions = [
    ['key' => 'rf_chest', 'label' => 'Chest pain?', 'type' => 'yesno', 'required' => true,
     'red_flag' => ['when' => ['Yes'], 'because' => 'Needs to be seen now.']],
    ['key' => 'rf_choice', 'label' => 'How bad?', 'type' => 'choice',
     'options' => ['Mild', 'Bad', 'Unbearable'],
     'red_flag' => ['when' => ['Unbearable'], 'because' => 'Severe pain needs assessing.']],
    ['key' => 'plain', 'label' => 'Anything else?', 'type' => 'text'],
];

check('a clean set trips nothing',
    PortalEvisitService::screen($questions, ['rf_chest' => 'No', 'rf_choice' => 'Mild']) === []);

$tripped = PortalEvisitService::screen($questions, ['rf_chest' => 'Yes', 'rf_choice' => 'Mild']);
check('a yes on a yesno flag trips', count($tripped) === 1, json_encode($tripped));
check('and carries the reason the patient is shown',
    ($tripped[0]['because'] ?? '') === 'Needs to be seen now.');

check('lowercase "yes" trips too -- a client cannot dodge it with casing',
    count(PortalEvisitService::screen($questions, ['rf_chest' => 'yes'])) === 1);
check('and so does "  YES  " with whitespace',
    count(PortalEvisitService::screen($questions, ['rf_chest' => '  YES  '])) === 1);

check('a non-trigger option on a choice flag does not trip',
    PortalEvisitService::screen($questions, ['rf_choice' => 'Bad']) === []);
check('the trigger option does',
    count(PortalEvisitService::screen($questions, ['rf_choice' => 'Unbearable'])) === 1);

check('several flags at once all come back',
    count(PortalEvisitService::screen($questions, ['rf_chest' => 'Yes', 'rf_choice' => 'Unbearable'])) === 2);

// An unanswered flag must not trip: required-ness is validated separately, and
// treating absence as positive would refuse everybody who skipped a question.
check('a missing answer does not trip a flag',
    PortalEvisitService::screen($questions, []) === []);
check('nor does an empty string',
    PortalEvisitService::screen($questions, ['rf_chest' => '   ']) === []);

check('a question with no red_flag key is ignored by the screener',
    PortalEvisitService::screen($questions, ['plain' => 'Yes']) === []);

// --------------------------------------------------------------------------
// 3. What the patient is offered, and what the device is told.
// --------------------------------------------------------------------------
echo "\n-- The form --\n";

$reasons = PortalEvisitService::reasons();
$codes = array_column($reasons['items'], 'code');

check('the seeded reasons are offered', count($codes) === 4, json_encode($codes));
check('each one carries a "not for this" warning',
    count(array_filter($reasons['items'], static fn($r) => trim((string) $r['not_for']) !== '')) === 4);
check('the terms say it is not for anything urgent',
    str_contains($reasons['terms'][0], 'not for anything urgent'), $reasons['terms'][0]);
check('and that a reply is not immediate',
    (bool) array_filter($reasons['terms'], static fn($t) => stripos($t, 'not straight away') !== false));

$form = PortalEvisitService::form($patientId, 'urinary');

check('the form comes back for a valid reason', $form !== null);
check('its safety questions are marked as such',
    count(array_filter($form['questions'], static fn($q) => $q['is_safety_check'])) === 6,
    (string) count(array_filter($form['questions'], static fn($q) => $q['is_safety_check'])));

// The device must not learn what trips a flag. A client that knew could be
// made to route around the screening.
$asJson = json_encode($form);
check('the form does NOT tell the device which answers trip a flag',
    !str_contains($asJson, 'red_flag') && !str_contains($asJson, 'because'), 'leaked trigger data');

check('an unknown reason gets nothing', PortalEvisitService::form($patientId, 'no-such-reason') === null);

// --------------------------------------------------------------------------
// 4. Validation, before any screening.
// --------------------------------------------------------------------------
echo "\n-- Validation --\n";

$res = PortalEvisitService::submit($patientId, ['reason_code' => 'urinary', 'answers' => []], $patientUser);
check('a blank form is refused', empty($res['success']));
check('with the required questions named',
    isset($res['errors']['answers.rf_chest']), json_encode($res['errors'] ?? null));
check('and it is a validation failure, not a red-flag refusal',
    empty($res['refused']), json_encode($res));

$urinary = [
    'rf_chest' => 'No', 'rf_breathing' => 'No', 'rf_collapse' => 'No',
    'rf_flank' => 'No', 'rf_no_urine' => 'No', 'rf_pregnant' => 'No',
    'how_long' => 'Two or three days', 'burning' => 'Yes', 'frequency' => 'Yes',
    'blood' => 'No', 'fever' => 'No',
];

$bad = $urinary;
$bad['how_long'] = 'Since the dawn of time';
$res = PortalEvisitService::submit($patientId, ['reason_code' => 'urinary', 'answers' => $bad], $patientUser);
check('a choice answer that is not one of the options is refused',
    empty($res['success']) && isset($res['errors']['answers.how_long']), json_encode($res['errors'] ?? null));

$bad = $urinary;
$bad['rf_chest'] = 'Maybe';
$res = PortalEvisitService::submit($patientId, ['reason_code' => 'urinary', 'answers' => $bad], $patientUser);
check('a yesno answer that is neither yes nor no is refused',
    empty($res['success']) && isset($res['errors']['answers.rf_chest']), json_encode($res['errors'] ?? null));

check('none of those wrote a row',
    (int) $db->query('SELECT COUNT(*) FROM portal_evisits')->fetchColumn() === 0);

// --------------------------------------------------------------------------
// 5. THE REFUSAL. The point of the phase.
// --------------------------------------------------------------------------
echo "\n-- A red-flag answer refuses the submission --\n";

$flagged = $urinary;
$flagged['rf_flank'] = 'Yes';

$res = PortalEvisitService::submit($patientId, ['reason_code' => 'urinary', 'answers' => $flagged], $patientUser);

check('it is not a success', empty($res['success']));
check('it is marked as a refusal, distinct from a validation error', !empty($res['refused']));
check('it carries no field errors to render as form hints', !isset($res['errors']));
check('it has a headline to show full-screen',
    !empty($res['urgent']['headline']), json_encode($res['urgent'] ?? null));
check('it says why, in the patient\'s words',
    str_contains(implode(' ', $res['urgent']['because']), 'kidney'),
    implode(' ', $res['urgent']['because'] ?? []));

$terms = implode(' ', $res['urgent']['terms'] ?? []);

check('it tells them to go now', stripos($terms, 'emergency department now') !== false, $terms);
// The single most important sentence in the phase.
check('it tells them NOT to wait for a reply', stripos($terms, 'do not wait') !== false, $terms);
check('it says nobody is reading it', stripos($terms, 'nobody is reading') !== false, $terms);
check('it says no online visit was opened', stripos($terms, 'not opened an online visit') !== false, $terms);
check('it never promises anybody will make contact',
    stripos($terms, 'will contact you') === false && stripos($terms, 'will call') === false, $terms);

$refused = $db->query(
    "SELECT * FROM portal_evisits WHERE patient_id = {$patientId} ORDER BY id DESC LIMIT 1"
)->fetch(PDO::FETCH_ASSOC);

check('the refusal IS recorded, so it can be found afterwards', $refused !== false);
check('with status refused', ($refused['status'] ?? '') === 'refused');
check('the flag is recorded', (int) ($refused['red_flag_triggered'] ?? 0) === 1);
check('and which question tripped it', str_contains((string) $refused['red_flag_keys'], 'rf_flank'));
check('their answers are kept', !empty($refused['answers']));

// A refused case must look like nothing is pending. Each of these would, on its
// own, be enough to make a patient think somebody was dealing with it.
check('it has NO reply deadline, so it can never read as overdue',
    $refused['due_by'] === null, var_export($refused['due_by'], true));

$waitingIds = array_column(PortalEvisitService::queue('waiting')['items'], 'id');
check('it is not in the clinician queue', !in_array((int) $refused['id'], $waitingIds, true), json_encode($waitingIds));

$mineIds = array_column(PortalEvisitService::mine($patientId)['items'], 'id');
check('it is not in the patient\'s list', !in_array((int) $refused['id'], $mineIds, true), json_encode($mineIds));

check('the patient cannot open it', PortalEvisitService::show($patientId, (int) $refused['id']) === null);

check('it does not count against their open limit',
    PortalEvisitService::mine($patientId)['can_raise'] === true);

$counts = PortalEvisitService::queue('refused')['counts'];
check('it is counted as refused, not waiting',
    $counts['refused'] === 1 && $counts['waiting'] === 0, json_encode($counts));

$refusedIds = array_column(PortalEvisitService::queue('refused')['items'], 'id');
check('but it IS reachable on its own tab, as a log',
    in_array((int) $refused['id'], $refusedIds, true), json_encode($refusedIds));

check('the care team was alerted',
    (int) $db->query("SELECT COUNT(*) FROM alerts WHERE alert_type = 'portal_evisit_red_flag'")->fetchColumn() >= 1);

$alertBody = (string) $db->query(
    "SELECT body FROM alerts WHERE alert_type = 'portal_evisit_red_flag' ORDER BY id DESC LIMIT 1"
)->fetchColumn();

check('the alert says the e-visit was refused and is in no queue',
    stripos($alertBody, 'REFUSED') !== false && stripos($alertBody, 'no queue') !== false, substr($alertBody, 0, 120));
check('and tells the clinician what the patient was and was not promised',
    stripos($alertBody, 'NOT told that anyone would contact them') !== false, substr($alertBody, 0, 200));

// Every seeded questionnaire must screen. A reason with no screening is the one
// way this whole design fails quietly.
echo "\n-- Every seeded e-visit form screens --\n";

foreach ($db->query("SELECT code, questions FROM portal_questionnaires WHERE use_context = 'evisit'") as $q) {
    $items = json_decode((string) $q['questions'], true);
    $flags = is_array($items) ? array_filter($items, static fn($i) => isset($i['red_flag'])) : [];

    check("{$q['code']} has red-flag screening", count($flags) > 0, (string) count($flags));

    foreach ($flags as $f) {
        check("{$q['code']}.{$f['key']} has triggers and a reason",
            !empty($f['red_flag']['when']) && is_array($f['red_flag']['when']) && !empty($f['red_flag']['because']),
            json_encode($f['red_flag'] ?? null));
    }
}

$clean();

// --------------------------------------------------------------------------
// 6. A clean submission, through to the encounter.
// --------------------------------------------------------------------------
echo "\n-- A clean submission --\n";

$res = PortalEvisitService::submit($patientId, ['reason_code' => 'urinary', 'answers' => $urinary], $patientUser);

check('a clean form is accepted', !empty($res['success']), json_encode($res));
check('it gets a reference', preg_match('/^EV-\d{4}-\d{4}$/', (string) ($res['data']['evisit_no'] ?? '')) === 1,
    (string) ($res['data']['evisit_no'] ?? ''));
check('and the patient is told when to expect a reply',
    str_contains((string) $res['message'], '24 hours'), (string) $res['message']);

$evisitId = (int) $res['data']['id'];
$row = $db->query("SELECT * FROM portal_evisits WHERE id = {$evisitId}")->fetch(PDO::FETCH_ASSOC);

check('status is submitted', ($row['status'] ?? '') === 'submitted');
check('a reply deadline is set', !empty($row['due_by']));
check('no flag was recorded', (int) $row['red_flag_triggered'] === 0);

$snapshot = json_decode((string) $row['answers'], true);
check('the answers are stored with their question labels',
    is_array($snapshot) && !empty($snapshot[0]['label']), json_encode($snapshot[0] ?? null));
check('and the safety answers are kept too, as evidence the screening ran',
    count(array_filter($snapshot, static fn($a) => !empty($a['is_safety_check']))) === 6);

$res = PortalEvisitService::submit($patientId, ['reason_code' => 'medicine', 'answers' => [
    'rf_reaction' => 'No', 'rf_collapse' => 'No', 'rf_overdose' => 'No',
    'medicine' => 'Metformin', 'question_type' => 'Whether to keep taking it',
    'question' => 'It upsets my stomach.', 'still_taking' => 'Yes',
]], $patientUser);
check('a second one is refused while the first is open', empty($res['success']), json_encode($res));
check('and says the clinic will answer the first', str_contains((string) $res['message'], 'that one first'));

$mine = PortalEvisitService::mine($patientId);
check('the patient sees it waiting', count($mine['items']) === 1);
check('with a sentence about the reply time',
    str_contains($mine['items'][0]['status_text'], '24 hours'), $mine['items'][0]['status_text']);
check('can_raise is false while one is open', $mine['can_raise'] === false);
check('and they can withdraw it', $mine['items'][0]['can_withdraw'] === true);

echo "\n-- The clinician reads it --\n";

$open = PortalEvisitService::open($evisitId);

// 13 questions on the urinary form, 6 of them screening, so 7 history items --
// including the two the patient left blank. The clinician sees the questions
// that were asked, answered or not; "they were asked and skipped it" is part of
// the record.
check('the clinician sees the history', count($open['history']) === 7, (string) count($open['history']));
check('and the safety screening separately', count($open['safety_checks']) === 6);
check('the outcomes they may choose are offered', count($open['outcomes']) === 5);

check('claiming works', !empty(PortalEvisitService::claim($evisitId, $actorId)['success']));
check('a second clinician cannot claim it', empty(PortalEvisitService::claim($evisitId, 987654)['success']));
check('the owner can release it', !empty(PortalEvisitService::release($evisitId, $actorId)['success']));
check('somebody else cannot release it', empty(PortalEvisitService::release($evisitId, 987654)['success']));

echo "\n-- Replying creates a real encounter --\n";

$res = PortalEvisitService::reply($evisitId, ['body' => '', 'outcome' => 'advice'], $actorId);
check('a reply with no text is refused', empty($res['success']) && isset($res['errors']['body']));

$res = PortalEvisitService::reply($evisitId, ['body' => 'Some advice.', 'outcome' => ''], $actorId);
check('a reply with no outcome is refused', empty($res['success']) && isset($res['errors']['outcome']));

$res = PortalEvisitService::reply($evisitId, ['body' => 'Some advice.', 'outcome' => 'telepathy'], $actorId);
check('an invented outcome is refused', empty($res['success']) && isset($res['errors']['outcome']));

$encountersBefore = (int) $db->query('SELECT COUNT(*) FROM encounters')->fetchColumn();

$res = PortalEvisitService::reply($evisitId, [
    'body' => 'This sounds like a simple water infection. Drink plenty of water, and come in if you get a fever or pain in your back.',
    'outcome' => 'advice',
], $actorId);

check('a complete reply is accepted', !empty($res['success']), json_encode($res));

$encounterId = (int) ($res['data']['encounter_id'] ?? 0);

check('an encounter was created', $encounterId > 0);
check('exactly one', (int) $db->query('SELECT COUNT(*) FROM encounters')->fetchColumn() === $encountersBefore + 1);

$enc = $db->query(
    "SELECT e.*, vc.name AS category FROM encounters e
     JOIN visit_categories vc ON vc.id = e.visit_category_id
     WHERE e.id = {$encounterId}"
)->fetch(PDO::FETCH_ASSOC);

check('it is filed under the e-visit visit category',
    ($enc['category'] ?? '') === PortalEvisitService::VISIT_CATEGORY, (string) ($enc['category'] ?? ''));
check('it names the e-visit in the reason for visit',
    str_contains((string) $enc['reason_for_visit'], 'e-Visit (EV-'), (string) $enc['reason_for_visit']);
check('it belongs to the right patient', (int) $enc['patient_id'] === $patientId);

// date_of_service came from the database clock, not PHP's. The two are not
// necessarily in the same timezone, and an encounter stamped hours away from the
// reply that created it is a real problem when somebody reads the chart.
$drift = abs(strtotime((string) $enc['date_of_service']) - strtotime((string) $db->query('SELECT NOW()')->fetchColumn()));
check('its date_of_service is on the database clock, not PHP\'s', $drift < 120, "drift {$drift}s");

$row = $db->query("SELECT * FROM portal_evisits WHERE id = {$evisitId}")->fetch(PDO::FETCH_ASSOC);

check('the e-visit is marked answered', ($row['status'] ?? '') === 'answered');
check('the outcome is recorded', ($row['outcome'] ?? '') === 'advice');
check('the encounter is linked to it', (int) $row['encounter_id'] === $encounterId);
check('who answered and when are recorded', !empty($row['answered_at']) && (int) $row['answered_by'] === $actorId);

$answeredAt = (string) $row['answered_at'];

check('replying again to an answered case is refused',
    empty(PortalEvisitService::reply($evisitId, ['body' => 'More.', 'outcome' => 'advice'], $actorId)['success']));

$shown = PortalEvisitService::show($patientId, $evisitId);

check('the patient sees the reply', count($shown['messages']) === 1);
check('attributed to a person or the care team', !empty($shown['messages'][0]['author']));
check('and sees what they themselves said', count($shown['what_you_told_us']) === 5);
check('without having to re-read the safety screening',
    !array_filter($shown['what_you_told_us'], static fn($a) => !empty($a['is_safety_check'])));

// --------------------------------------------------------------------------
// 7. One follow-up, and one encounter.
// --------------------------------------------------------------------------
echo "\n-- The follow-up --\n";

check('the patient may ask one follow-up', $shown['can_follow_up'] === true);
check('and is told until when', !empty($shown['follow_up_until']));

$res = PortalEvisitService::followUp($patientId, $evisitId, ['body' => ''], $patientUser);
check('an empty follow-up is refused', empty($res['success']) && isset($res['errors']['body']));

$res = PortalEvisitService::followUp($patientId, $evisitId, ['body' => 'How long should I drink extra water for?'], $patientUser);
check('a real one is accepted', !empty($res['success']), json_encode($res));

check('it goes back into the queue',
    in_array($evisitId, array_column(PortalEvisitService::queue('waiting')['items'], 'id'), true));
check('with a fresh deadline, so it is measured too',
    $db->query("SELECT due_by FROM portal_evisits WHERE id = {$evisitId}")->fetchColumn() !== null);
check('and the claim is cleared so anybody can pick it up',
    $db->query("SELECT claimed_by FROM portal_evisits WHERE id = {$evisitId}")->fetchColumn() === null);

$res = PortalEvisitService::followUp($patientId, $evisitId, ['body' => 'Another thing entirely.'], $patientUser);
check('a second follow-up is refused while the first is unanswered', empty($res['success']), json_encode($res));

$encountersBefore = (int) $db->query('SELECT COUNT(*) FROM encounters')->fetchColumn();

$res = PortalEvisitService::reply($evisitId, ['body' => 'Two or three days is plenty.', 'outcome' => 'advice'], $actorId);
check('the clinician can answer the follow-up', !empty($res['success']), json_encode($res));

// The bug this pins: replying to a follow-up used to create a SECOND encounter,
// which the COALESCE on encounter_id then left orphaned in the patient record.
check('answering a follow-up does NOT create a second encounter',
    (int) $db->query('SELECT COUNT(*) FROM encounters')->fetchColumn() === $encountersBefore,
    'an extra encounter was created');
check('the e-visit still points at the first encounter',
    (int) $db->query("SELECT encounter_id FROM portal_evisits WHERE id = {$evisitId}")->fetchColumn() === $encounterId);
check('answered_at still marks the FIRST reply, so the window is not extended',
    (string) $db->query("SELECT answered_at FROM portal_evisits WHERE id = {$evisitId}")->fetchColumn() === $answeredAt);

$shown = PortalEvisitService::show($patientId, $evisitId);
check('the patient sees the whole thread', count($shown['messages']) === 3, (string) count($shown['messages']));
check('in the order it happened',
    $shown['messages'][0]['from'] === 'clinician'
    && $shown['messages'][1]['from'] === 'patient'
    && $shown['messages'][2]['from'] === 'clinician');
check('and may not ask again', $shown['can_follow_up'] === false);

echo "\n-- Closing --\n";

check('it can be closed', !empty(PortalEvisitService::close($evisitId, $actorId)['success']));
check('closing twice is refused', empty(PortalEvisitService::close($evisitId, $actorId)['success']));

$res = PortalEvisitService::followUp($patientId, $evisitId, ['body' => 'One more thing'], $patientUser);
check('no follow-up after closing', empty($res['success']));
check('and they are told to raise a new one',
    str_contains((string) $res['message'], 'new online visit'), (string) $res['message']);

check('a closed case frees the open slot', PortalEvisitService::mine($patientId)['can_raise'] === true);

// --------------------------------------------------------------------------
// 8. Withdrawing, and the follow-up window expiring.
// --------------------------------------------------------------------------
echo "\n-- Withdrawing --\n";

$res = PortalEvisitService::submit($patientId, ['reason_code' => 'urinary', 'answers' => $urinary], $patientUser);
$second = (int) $res['data']['id'];

check('a patient can withdraw one nobody has answered',
    !empty(PortalEvisitService::withdraw($patientId, $second, $patientUser)['success']));
check('it leaves the queue',
    !in_array($second, array_column(PortalEvisitService::queue('waiting')['items'], 'id'), true));
check('withdrawing twice is refused', empty(PortalEvisitService::withdraw($patientId, $second, $patientUser)['success']));

$res = PortalEvisitService::submit($patientId, ['reason_code' => 'urinary', 'answers' => $urinary], $patientUser);
$third = (int) $res['data']['id'];
PortalEvisitService::reply($third, ['body' => 'Advice.', 'outcome' => 'advice'], $actorId);

$db->prepare('UPDATE portal_evisits SET answered_at = ? WHERE id = ?')
   ->execute([date('Y-m-d H:i:s', strtotime('-30 days')), $third]);

$res = PortalEvisitService::followUp($patientId, $third, ['body' => 'Late question'], $patientUser);
check('a follow-up after the window is refused', empty($res['success']), json_encode($res));
check('and says how long the window was',
    str_contains((string) $res['message'], '7 days'), (string) $res['message']);
check('the patient is shown that the window has passed',
    PortalEvisitService::show($patientId, $third)['can_follow_up'] === false);

echo "\n-- Overdue --\n";

$res = PortalEvisitService::submit($patientId, ['reason_code' => 'medicine', 'answers' => [
    'rf_reaction' => 'No', 'rf_collapse' => 'No', 'rf_overdose' => 'No',
    'medicine' => 'Metformin', 'question_type' => 'Whether to keep taking it',
    'question' => 'It upsets my stomach.', 'still_taking' => 'Yes',
]], $patientUser);
$late = (int) $res['data']['id'];

$db->prepare('UPDATE portal_evisits SET due_by = ? WHERE id = ?')
   ->execute([date('Y-m-d H:i:s', strtotime('-3 hours')), $late]);

$queue = PortalEvisitService::queue('waiting');
$lateRow = null;

foreach ($queue['items'] as $i) {
    if ($i['id'] === $late) { $lateRow = $i; }
}

check('the queue marks an overdue case', ($lateRow['overdue'] ?? null) === true);
check('and counts it', $queue['counts']['overdue'] >= 1, json_encode($queue['counts']));

$mine = PortalEvisitService::mine($patientId);
$lateMine = null;

foreach ($mine['items'] as $i) {
    if ($i['id'] === $late) { $lateMine = $i; }
}

// A patient who has waited longer than promised should be told so, not shown a
// reassurance that has stopped being true.
check('the patient is told it has waited too long',
    str_contains((string) ($lateMine['status_text'] ?? ''), 'longer than we aim for'),
    (string) ($lateMine['status_text'] ?? ''));
check('and told what to do about it',
    str_contains((string) ($lateMine['status_text'] ?? ''), 'call the clinic'));

// --------------------------------------------------------------------------
// 9. The safety gate on the reasons screen.
// --------------------------------------------------------------------------
echo "\n-- A reason cannot be published without screening --\n";

$deskReasons = PortalEvisitService::reasonsForDesk();

check('the desk sees the reasons', count($deskReasons['items']) === 4);
$anyFlags = null;

foreach ($deskReasons['items'] as $i) {
    if (!empty($i['questionnaire']['red_flags'])) { $anyFlags = $i['questionnaire']['red_flags'][0]; break; }
}

check('with the red flags spelled out, not summarised',
    !empty($anyFlags['because']) && !empty($anyFlags['when']), json_encode($anyFlags));
$urinaryDesk = null;

foreach ($deskReasons['items'] as $i) {
    if ($i['code'] === 'urinary') { $urinaryDesk = $i; }
}

check('and whether each reaches patients, in a sentence',
    str_starts_with((string) ($urinaryDesk['reaches_patients']['why'] ?? ''), 'Yes'),
    (string) ($urinaryDesk['reaches_patients']['why'] ?? ''));

$otherId = (int) $db->query("SELECT id FROM portal_evisit_reasons WHERE code = 'other'")->fetchColumn();
$originalQuestions = (string) $db->query("SELECT questions FROM portal_questionnaires WHERE code = 'evisit_general'")->fetchColumn();

$db->exec("UPDATE portal_questionnaires
             SET questions = '[{\"key\":\"x\",\"label\":\"Nothing is screened here\",\"type\":\"text\"}]'
           WHERE code = 'evisit_general'");

$res = PortalEvisitService::saveReason([
    'id' => $otherId, 'patient_label' => 'Something else', 'is_patient_visible' => 1,
], $actorId);

check('a reason whose questionnaire has no red flags cannot be made visible',
    empty($res['success']), json_encode($res));
check('and the refusal says exactly why',
    str_contains((string) ($res['errors']['is_patient_visible'] ?? ''), 'no red-flag screening'),
    (string) ($res['errors']['is_patient_visible'] ?? ''));

$res = PortalEvisitService::saveReason([
    'id' => $otherId, 'patient_label' => 'Something else', 'is_patient_visible' => 0,
    'hide_reason' => 'Fixture: screening removed.',
], $actorId);
check('but it can be switched off', !empty($res['success']), json_encode($res));

$db->prepare('UPDATE portal_questionnaires SET questions = ? WHERE code = ?')
   ->execute([$originalQuestions, 'evisit_general']);

$res = PortalEvisitService::saveReason([
    'id' => $otherId, 'patient_label' => 'Something else',
    'patient_blurb' => 'Tell us in your own words and a doctor or nurse will read it.',
    'not_for_text' => 'Not for anything urgent, and not for a new pain in your chest or tummy, a problem in pregnancy, or a baby under two. Those need to be seen.',
    'is_patient_visible' => 1, 'sequence' => 90,
], $actorId);
check('with screening restored it can be published again', !empty($res['success']), json_encode($res));

check('a reason that is not on file cannot be saved',
    empty(PortalEvisitService::saveReason(['id' => 999999, 'patient_label' => 'x'], $actorId)['success']));

// --------------------------------------------------------------------------
// 10. Wiring.
// --------------------------------------------------------------------------
echo "\n-- Wiring --\n";

check('the capability constant exists', PortalGuard::CAP_EVISITS === 'mychart_evisits');
check('it is granted to the patient role by seed 081',
    (int) $db->query(
        "SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id
          WHERE r.name = 'patient' AND rp.capability = 'mychart_evisits' AND rp.is_granted = 1"
    )->fetchColumn() === 1);

check('the e-visit visit category exists', PortalEvisitService::visitCategoryId($db) !== null);
check('the notification type is seeded',
    (int) $db->query("SELECT COUNT(*) FROM portal_notification_types WHERE event_type = 'evisit_answered'")->fetchColumn() === 1);

$notification = (string) $db->query(
    "SELECT body_template FROM portal_notification_types WHERE event_type = 'evisit_answered'"
)->fetchColumn();

check('the notification carries no clinical detail',
    !str_contains(strtolower($notification), 'infection')
    && !str_contains(strtolower($notification), 'medicine')
    && !str_contains($notification, '{what}'), $notification);

check('replying is restricted to clinical roles',
    PortalEvisitService::ANSWER_ROLES === ['admin', 'doctor', 'clinician'], json_encode(PortalEvisitService::ANSWER_ROLES));
check('but nurses may read the queue', in_array('nurse', PortalEvisitService::REVIEW_ROLES, true));
check('changing what patients may raise is admin and doctors',
    PortalEvisitService::EDIT_ROLES === ['admin', 'doctor'], json_encode(PortalEvisitService::EDIT_ROLES));
check('there is no "prescribed" outcome',
    !in_array('prescribed', PortalEvisitService::OUTCOMES, true), json_encode(PortalEvisitService::OUTCOMES));

$refs = $db->query('SELECT evisit_no FROM portal_evisits')->fetchAll(PDO::FETCH_COLUMN);
check('every reference is distinct', count($refs) === count(array_unique($refs)), json_encode($refs));

// M5 and M13 must be untouched by the new use_context value.
check('e-check-in questionnaires still resolve',
    (int) $db->query("SELECT COUNT(*) FROM portal_questionnaires WHERE use_context IN ('checkin','both')")->fetchColumn() === 5);
check('and the M13 follow-up catalogue is unchanged',
    (int) $db->query("SELECT COUNT(*) FROM portal_questionnaires WHERE use_context = 'followup'")->fetchColumn() === 4);

// --------------------------------------------------------------------------
echo "\n-- Cleaning up --\n";

$clean();
$restoreSeedState();
$db->exec("DELETE FROM encounters WHERE reason_for_visit LIKE 'e-Visit (EV-%'");
$db->exec('UPDATE general_settings SET portal_allow_evisits = 0');

check('the reasons and questionnaires are back as the seeds left them',
    (int) $db->query('SELECT COUNT(*) FROM portal_evisit_reasons WHERE is_patient_visible = 1')->fetchColumn()
        === count(array_filter($originalReasons, static fn($r) => (int) $r['is_patient_visible'] === 1)));

check('the e-visits this suite wrote are gone',
    (int) $db->query("SELECT COUNT(*) FROM portal_evisits WHERE patient_id = {$patientId}")->fetchColumn() === 0);
check('their messages went with them, by cascade',
    (int) $db->query('SELECT COUNT(*) FROM portal_evisit_messages')->fetchColumn() === 0);
check('the encounters they created are cleaned up',
    (int) $db->query("SELECT COUNT(*) FROM encounters WHERE reason_for_visit LIKE 'e-Visit (EV-%'")->fetchColumn() === 0);
check('and the feature is switched back off, as it ships',
    (int) $db->query('SELECT portal_allow_evisits FROM general_settings ORDER BY id LIMIT 1')->fetchColumn() === 0);

echo "\n==================================================\n";
echo "   {$pass} passed, {$fail} failed\n";
echo "==================================================\n";
echo "  (database: {$database} -- safe to drop at any time)\n";

exit($fail > 0 ? 1 : 0);
