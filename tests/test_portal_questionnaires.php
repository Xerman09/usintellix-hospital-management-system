<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Modules\Gad7\Services\Gad7Service;
use App\Modules\MyChart\Services\PortalGuard;
use App\Modules\MyChart\Services\PortalQuestionnaireService;
use App\Modules\Phq9\Services\Phq9Service;

Env::load();

echo "==================================================\n";
echo "   Automated Verification: Questionnaires Between Visits (M13)\n";
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

$svc = new ReflectionClass(PortalQuestionnaireService::class);
$call = static function (string $method, array $args = []) use ($svc) {
    $m = $svc->getMethod($method);
    $m->setAccessible(true);

    return $m->invoke(null, ...$args);
};

$db = Database::connection();

// --------------------------------------------------------------------------
// 1. The table and the columns the feature cannot run without.
// --------------------------------------------------------------------------
echo "\n-- Schema 337 --\n";

$tables = $db->query(
    "SELECT table_name FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = 'portal_questionnaire_assignments'"
)->fetchColumn();
check('portal_questionnaire_assignments exists', $tables !== false);

$cols = $db->query(
    "SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'portal_questionnaire_assignments'"
)->fetchAll(PDO::FETCH_COLUMN);

foreach ([
    'instrument', 'questionnaire_id', 'title', 'reason', 'due_date', 'status',
    'opened_at', 'completed_at', 'response_id', 'total_score', 'severity',
    'alert_id', 'alerted_at', 'reviewed_at', 'cancel_reason',
] as $c) {
    check("column {$c} is present", in_array($c, $cols, true));
}

$useContext = $db->query(
    "SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'portal_questionnaires' AND column_name = 'use_context'"
)->fetchColumn();
check('portal_questionnaires.use_context is present', $useContext !== false);

$assignmentCol = $db->query(
    "SELECT column_name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = 'portal_questionnaire_responses' AND column_name = 'assignment_id'"
)->fetchColumn();
check('portal_questionnaire_responses.assignment_id is present', $assignmentCol !== false);

// --------------------------------------------------------------------------
// 2. The capability. A missing role_permissions row means denied, so the
//    feature is only live where seed 071 ran.
// --------------------------------------------------------------------------
echo "\n-- Capability (seed 071) --\n";

check('PortalGuard exposes CAP_QUESTIONNAIRES', PortalGuard::CAP_QUESTIONNAIRES === 'mychart_questionnaires');

$granted = (int) $db->query(
    "SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id
     WHERE r.name = 'patient' AND rp.capability = 'mychart_questionnaires' AND rp.is_granted = 1"
)->fetchColumn();
check('the patient role holds mychart_questionnaires', $granted === 1,
    "found {$granted} rows -- without it every endpoint returns 403");

// --------------------------------------------------------------------------
// 3. Settings hardening.
// --------------------------------------------------------------------------
echo "\n-- Settings --\n";

$settings = $call('settings');
check('allow is a boolean', is_bool($settings['allow']));
check('grace_days is sane', is_int($settings['grace_days']) && $settings['grace_days'] >= 0 && $settings['grace_days'] <= 180,
    'got ' . var_export($settings['grace_days'], true));

// --------------------------------------------------------------------------
// 4. The follow-up catalogue, and the line between it and e-check-in.
// --------------------------------------------------------------------------
echo "\n-- Catalogue (seed 072) --\n";

$catalogue = PortalQuestionnaireService::catalogue();
check('the catalogue is not empty', count($catalogue) > 0);

$instruments = array_values(array_filter($catalogue, static fn($c) => $c['scored']));
check('both scored instruments are offered', count($instruments) === 2, 'got ' . count($instruments));

$unscored = array_values(array_filter($catalogue, static fn($c) => !$c['scored']));
check('the seeded follow-up questionnaires are offered', count($unscored) >= 4, 'got ' . count($unscored));

foreach ($unscored as $c) {
    check("\"{$c['label']}\" has questions", $c['question_count'] > 0);
}

// Every catalogue entry must be sendable: a row the picker offers and assign()
// then refuses would be a dead option in the clinician's list.
$checkinOnly = (int) $db->query(
    "SELECT COUNT(*) FROM portal_questionnaires WHERE is_active = 1 AND use_context = 'checkin'"
)->fetchColumn();
check('e-check-in questionnaires exist and are NOT in the follow-up catalogue',
    $checkinOnly > 0 && count(array_filter($catalogue, static fn($c) => $c['code'] === 'general')) === 0,
    "{$checkinOnly} check-in rows");

// --------------------------------------------------------------------------
// 5. Instrument questions come from the clinical services, not a copy.
// --------------------------------------------------------------------------
echo "\n-- Instrument questions --\n";

$phq = PortalQuestionnaireService::instrumentQuestions('phq9');
$gad = PortalQuestionnaireService::instrumentQuestions('gad7');

check('PHQ-9 has 9 questions', count($phq) === 9, 'got ' . count($phq));
check('GAD-7 has 7 questions', count($gad) === 7, 'got ' . count($gad));

check('PHQ-9 keys are exactly Phq9Service::QUESTIONS keys',
    array_column($phq, 'key') === array_keys(Phq9Service::QUESTIONS));
check('GAD-7 keys are exactly Gad7Service::QUESTIONS keys',
    array_column($gad, 'key') === array_keys(Gad7Service::QUESTIONS));

check('every instrument question is a required scale',
    count(array_filter(array_merge($phq, $gad), static fn($q) => $q['type'] === 'scale' && $q['required'])) === 16);
check('the scale offers four options', count(PortalQuestionnaireService::SCALE) === 4);
check('an unknown instrument has no questions', PortalQuestionnaireService::instrumentQuestions('bdi2') === []);

// --------------------------------------------------------------------------
// 6. Scoring. The whole point of reusing the clinical services is that a home
//    score and an in-visit score cannot disagree, so the test compares them.
// --------------------------------------------------------------------------
echo "\n-- Scoring --\n";

$allThrees = [];
foreach (array_keys(Phq9Service::QUESTIONS) as $k) {
    $allThrees[$k] = 3;
}

$max = PortalQuestionnaireService::score('phq9', $allThrees);
check('PHQ-9 all threes scores 27', $max['total_score'] === 27, 'got ' . var_export($max['total_score'], true));
check('PHQ-9 27 is the severe band', $max['severity'] === 'Severe depressive disorder', $max['severity']);
check('the PHQ-9 maximum in INSTRUMENTS matches the instrument',
    PortalQuestionnaireService::INSTRUMENTS['phq9']['max'] === 27);

$gadAllThrees = [];
foreach (array_keys(Gad7Service::QUESTIONS) as $k) {
    $gadAllThrees[$k] = 3;
}

$gadMax = PortalQuestionnaireService::score('gad7', $gadAllThrees);
check('GAD-7 all threes scores 21', $gadMax['total_score'] === 21, 'got ' . var_export($gadMax['total_score'], true));
check('the GAD-7 maximum in INSTRUMENTS matches the instrument',
    PortalQuestionnaireService::INSTRUMENTS['gad7']['max'] === 21);

check('scoring routes through Phq9Service itself',
    PortalQuestionnaireService::score('phq9', $allThrees) === Phq9Service::calculateScoreAndSeverity($allThrees));
check('scoring routes through Gad7Service itself',
    PortalQuestionnaireService::score('gad7', $gadAllThrees) === Gad7Service::calculateScoreAndSeverity($gadAllThrees));
check('an unscored questionnaire has no score', PortalQuestionnaireService::score('questionnaire', []) === null);

$zero = PortalQuestionnaireService::score('phq9', []);
check('no answers scores 0', $zero['total_score'] === 0);

// --------------------------------------------------------------------------
// 7. Escalation. This is the part that must not be wrong in either direction:
//    a missed crossing leaves a patient unanswered, and a false one cries wolf.
// --------------------------------------------------------------------------
echo "\n-- Escalation thresholds --\n";

/** A PHQ-9 answer set totalling $total, with item 9 set to $item9. */
$phqAnswers = static function (int $total, int $item9 = 0): array {
    $keys = array_keys(Phq9Service::QUESTIONS);
    $out = array_fill_keys($keys, 0);
    $out['q9_better_off_dead'] = $item9;
    $left = $total - $item9;

    foreach ($keys as $k) {
        if ($k === 'q9_better_off_dead' || $left <= 0) {
            continue;
        }
        $take = min(3, $left);
        $out[$k] = $take;
        $left -= $take;
    }

    return $out;
};

$a = $phqAnswers(14);
check('PHQ-9 14 raises nothing',
    PortalQuestionnaireService::urgencyFor('phq9', PortalQuestionnaireService::score('phq9', $a), $a) === null);

$a = $phqAnswers(15);
check('PHQ-9 15 is urgent',
    PortalQuestionnaireService::urgencyFor('phq9', PortalQuestionnaireService::score('phq9', $a), $a) === 'urgent');

$a = $phqAnswers(27, 3);
check('PHQ-9 at its maximum, with item 9 positive, is critical rather than merely urgent',
    PortalQuestionnaireService::urgencyFor('phq9', PortalQuestionnaireService::score('phq9', $a), $a) === 'critical');

// The case a threshold on the total would swallow.
$a = $phqAnswers(4, 1);
$score = PortalQuestionnaireService::score('phq9', $a);
check('a low PHQ-9 total still scores under the urgent band', $score['total_score'] < 15,
    'total was ' . $score['total_score']);
check('item 9 answered "several days" on a total of 4 is CRITICAL',
    PortalQuestionnaireService::urgencyFor('phq9', $score, $a) === 'critical',
    'this is the case a total-only threshold misses');

$a = $phqAnswers(4, 3);
check('item 9 answered "nearly every day" on a low total is CRITICAL',
    PortalQuestionnaireService::urgencyFor('phq9', PortalQuestionnaireService::score('phq9', $a), $a) === 'critical');

$a = $phqAnswers(4, 0);
check('a low total with item 9 at zero raises nothing',
    PortalQuestionnaireService::urgencyFor('phq9', PortalQuestionnaireService::score('phq9', $a), $a) === null);

$gadAnswers = static function (int $total): array {
    $keys = array_keys(Gad7Service::QUESTIONS);
    $out = array_fill_keys($keys, 0);
    $left = $total;

    foreach ($keys as $k) {
        if ($left <= 0) {
            break;
        }
        $take = min(3, $left);
        $out[$k] = $take;
        $left -= $take;
    }

    return $out;
};

$g = $gadAnswers(14);
check('GAD-7 14 raises nothing',
    PortalQuestionnaireService::urgencyFor('gad7', PortalQuestionnaireService::score('gad7', $g), $g) === null);

$g = $gadAnswers(15);
check('GAD-7 15 is urgent',
    PortalQuestionnaireService::urgencyFor('gad7', PortalQuestionnaireService::score('gad7', $g), $g) === 'urgent');

$g = $gadAnswers(21);
check('GAD-7 has no critical item, so its maximum is urgent',
    PortalQuestionnaireService::urgencyFor('gad7', PortalQuestionnaireService::score('gad7', $g), $g) === 'urgent');

check('an unscored questionnaire never escalates',
    PortalQuestionnaireService::urgencyFor('questionnaire', ['total_score' => 99], []) === null);
check('a null score never escalates',
    PortalQuestionnaireService::urgencyFor('phq9', null, $phqAnswers(27, 3)) === null);

// --------------------------------------------------------------------------
// 8. The due-date grace period.
// --------------------------------------------------------------------------
echo "\n-- Due dates and the grace period --\n";

check('no due date is never closed', PortalQuestionnaireService::closed(null, '2026-11-14', 14) === false);
check('an empty due date is never closed', PortalQuestionnaireService::closed('', '2026-11-14', 14) === false);
check('a future due date is open', PortalQuestionnaireService::closed('2026-12-01', '2026-11-14', 14) === false);
check('the due date itself is open', PortalQuestionnaireService::closed('2026-11-14', '2026-11-14', 14) === false);
check('one day overdue is still open inside the grace period',
    PortalQuestionnaireService::closed('2026-11-13', '2026-11-14', 14) === false);
check('the last day of the grace period is open',
    PortalQuestionnaireService::closed('2026-10-31', '2026-11-14', 14) === false);
check('a day past the grace period is closed',
    PortalQuestionnaireService::closed('2026-10-30', '2026-11-14', 14) === true);
check('a zero grace period closes the day after the due date',
    PortalQuestionnaireService::closed('2026-11-13', '2026-11-14', 0) === true);

// --------------------------------------------------------------------------
// 9. Answer validation. Everything a patient sends is untrusted.
// --------------------------------------------------------------------------
echo "\n-- Answer validation --\n";

$questions = [
    ['key' => 'mood', 'label' => 'Mood', 'type' => 'scale', 'options' => PortalQuestionnaireService::SCALE, 'required' => true],
    ['key' => 'fever', 'label' => 'Fever?', 'type' => 'yesno', 'options' => [], 'required' => true],
    ['key' => 'pain', 'label' => 'Pain', 'type' => 'choice', 'options' => ['None', 'Mild', 'Bad'], 'required' => false],
    ['key' => 'which', 'label' => 'Which apply', 'type' => 'checkboxes', 'options' => ['A', 'B', 'C'], 'required' => false],
    ['key' => 'notes', 'label' => 'Notes', 'type' => 'textarea', 'options' => [], 'required' => false],
];

[$clean, $errors] = $call('validate', [$questions, ['mood' => 2, 'fever' => 'Yes']]);
check('a valid minimal answer set passes', $errors === [] && $clean === ['mood' => 2, 'fever' => 'Yes'],
    json_encode([$clean, $errors]));

[$clean, $errors] = $call('validate', [$questions, ['fever' => 'Yes']]);
check('a missing required scale is refused', isset($errors['answers.mood']));

[$clean, $errors] = $call('validate', [$questions, ['mood' => 2]]);
check('a missing required yes/no is refused', isset($errors['answers.fever']));

[$clean, $errors] = $call('validate', [$questions, ['mood' => 9, 'fever' => 'Yes']]);
check('a scale value above the scale is refused', isset($errors['answers.mood']));

[$clean, $errors] = $call('validate', [$questions, ['mood' => -1, 'fever' => 'Yes']]);
check('a negative scale value is refused', isset($errors['answers.mood']));

[$clean, $errors] = $call('validate', [$questions, ['mood' => 'three', 'fever' => 'Yes']]);
check('a non-numeric scale value is refused', isset($errors['answers.mood']));

[$clean, $errors] = $call('validate', [$questions, ['mood' => [3], 'fever' => 'Yes']]);
check('an array sent for a scale is refused, not cast', isset($errors['answers.mood']));

[$clean, $errors] = $call('validate', [$questions, ['mood' => 0, 'fever' => 'Yes']]);
check('zero is a real scale answer, not "missing"', $errors === [] && $clean['mood'] === 0);

[$clean, $errors] = $call('validate', [$questions, ['mood' => '2', 'fever' => 'Yes']]);
check('a numeric string scale answer is stored as an integer', $errors === [] && $clean['mood'] === 2);

[$clean, $errors] = $call('validate', [$questions, ['mood' => 1, 'fever' => 'Maybe']]);
check('a yes/no answer outside Yes and No is refused', isset($errors['answers.fever']));

[$clean, $errors] = $call('validate', [$questions, ['mood' => 1, 'fever' => 'Yes', 'pain' => 'Agony']]);
check('a choice outside the options offered is refused', isset($errors['answers.pain']));

[$clean, $errors] = $call('validate', [$questions, ['mood' => 1, 'fever' => 'Yes', 'which' => ['A', 'Z']]]);
check('an unknown checkbox option is dropped, the known one kept',
    $errors === [] && $clean['which'] === ['A'], json_encode([$clean, $errors]));

[$clean, $errors] = $call('validate', [$questions, ['mood' => 1, 'fever' => 'Yes', 'which' => ['Z']]]);
check('a checkbox list of only unknown options is refused', isset($errors['answers.which']));

[$clean, $errors] = $call('validate', [$questions, ['mood' => 1, 'fever' => 'Yes', 'extra' => 'injected']]);
check('an answer to a question that was not asked is dropped',
    $errors === [] && !array_key_exists('extra', $clean), json_encode($clean));

[$clean, $errors] = $call('validate', [$questions, ['mood' => 1, 'fever' => 'Yes', 'notes' => str_repeat('x', 5000)]]);
check('free text is capped at 2000 characters', $errors === [] && mb_strlen($clean['notes']) === 2000,
    'length ' . mb_strlen($clean['notes'] ?? ''));

[$clean, $errors] = $call('validate', [$questions, ['mood' => 1, 'fever' => 'Yes', 'notes' => '   ']]);
check('whitespace-only free text on an optional question is simply absent',
    $errors === [] && !array_key_exists('notes', $clean));

// --------------------------------------------------------------------------
// 10. questionsFor(): malformed stored JSON must not take a screen down.
// --------------------------------------------------------------------------
echo "\n-- Reading stored questions --\n";

check('an instrument row ignores any stored questions',
    count(PortalQuestionnaireService::questionsFor(['instrument' => 'phq9', 'questions' => '[]'])) === 9);
check('broken JSON yields no questions rather than an error',
    PortalQuestionnaireService::questionsFor(['instrument' => 'questionnaire', 'questions' => '{not json']) === []);
check('JSON that is not a list yields no questions',
    PortalQuestionnaireService::questionsFor(['instrument' => 'questionnaire', 'questions' => '"a string"']) === []);
check('a question with no key is skipped',
    PortalQuestionnaireService::questionsFor([
        'instrument' => 'questionnaire',
        'questions' => '[{"label":"no key here"},{"key":"ok","label":"Fine"}]',
    ]) === [['key' => 'ok', 'label' => 'Fine', 'type' => 'text', 'options' => [], 'required' => false]]);

$postop = $db->query("SELECT instrument, questionnaire_id, questions FROM (SELECT 'questionnaire' AS instrument, id AS questionnaire_id, questions FROM portal_questionnaires WHERE code = 'followup_postop') t")
    ->fetch(PDO::FETCH_ASSOC);

if ($postop) {
    $qs = PortalQuestionnaireService::questionsFor($postop);
    check('the seeded post-operative questionnaire parses', count($qs) > 5, 'got ' . count($qs));
    check('every seeded question has a key and a label',
        count(array_filter($qs, static fn($q) => $q['key'] !== '' && $q['label'] !== '')) === count($qs));
    check('every choice question offers options',
        count(array_filter($qs, static fn($q) => in_array($q['type'], ['choice', 'checkboxes'], true) && !$q['options'])) === 0);
}

// --------------------------------------------------------------------------
// 11. Assigning: every refusal path, before any row is written.
// --------------------------------------------------------------------------
echo "\n-- Assign refusals --\n";

$before = (int) $db->query("SELECT COUNT(*) FROM portal_questionnaire_assignments")->fetchColumn();

$res = PortalQuestionnaireService::assign([], 1);
check('assigning with no patient is refused', empty($res['success']) && isset($res['errors']['patient_id']));

$res = PortalQuestionnaireService::assign(['patient_id' => 99999999, 'instrument' => 'phq9'], 1);
check('an unknown patient is refused', empty($res['success']) && isset($res['errors']['patient_id']));

$anyPatient = (int) $db->query("SELECT id FROM patients WHERE deleted_at IS NULL ORDER BY id LIMIT 1")->fetchColumn();

if ($anyPatient) {
    $res = PortalQuestionnaireService::assign(['patient_id' => $anyPatient, 'instrument' => 'bdi2'], 1);
    check('an unknown instrument is refused', empty($res['success']) && isset($res['errors']['instrument']));

    $res = PortalQuestionnaireService::assign(['patient_id' => $anyPatient, 'instrument' => 'questionnaire'], 1);
    check('a questionnaire send with no questionnaire chosen is refused',
        empty($res['success']) && isset($res['errors']['questionnaire_id']));

    $checkinId = (int) $db->query("SELECT id FROM portal_questionnaires WHERE use_context = 'checkin' ORDER BY id LIMIT 1")->fetchColumn();

    if ($checkinId) {
        $res = PortalQuestionnaireService::assign([
            'patient_id' => $anyPatient, 'instrument' => 'questionnaire', 'questionnaire_id' => $checkinId,
        ], 1);
        check('an e-check-in questionnaire cannot be sent between visits',
            empty($res['success']) && isset($res['errors']['questionnaire_id']));
    }

    $res = PortalQuestionnaireService::assign([
        'patient_id' => $anyPatient, 'instrument' => 'phq9', 'due_date' => '2020-01-01',
    ], 1);
    check('a due date in the past is refused', empty($res['success']) && isset($res['errors']['due_date']));

    $res = PortalQuestionnaireService::assign([
        'patient_id' => $anyPatient, 'instrument' => 'phq9', 'due_date' => '2026-02-30',
    ], 1);
    check('a date that is not a real day is refused', empty($res['success']) && isset($res['errors']['due_date']));

    $res = PortalQuestionnaireService::assign([
        'patient_id' => $anyPatient, 'instrument' => 'phq9', 'reason' => str_repeat('x', 501),
    ], 1);
    check('an over-long reason is refused', empty($res['success']) && isset($res['errors']['reason']));

    $res = PortalQuestionnaireService::assign([
        'patient_id' => $anyPatient, 'instrument' => 'phq9', 'encounter_id' => 99999999,
    ], 1);
    check("an encounter that is not this patient's is refused",
        empty($res['success']) && isset($res['errors']['encounter_id']));
}

$after = (int) $db->query("SELECT COUNT(*) FROM portal_questionnaire_assignments")->fetchColumn();
check('no refusal wrote a row', $before === $after, "{$before} before, {$after} after");

// --------------------------------------------------------------------------
// 12. The patient's own rows only. An id belonging to somebody else must read
//     as "not one of yours", not as a questionnaire.
// --------------------------------------------------------------------------
echo "\n-- Ownership --\n";

$res = PortalQuestionnaireService::form(99999999, 1);
check('a stranger cannot open an assignment', empty($res['success']) && !empty($res['not_found']));

$res = PortalQuestionnaireService::submit(99999999, 1, ['mood' => 1]);
check('a stranger cannot submit answers', empty($res['success']) && !empty($res['not_found']));

$existing = $db->query(
    "SELECT id, patient_id FROM portal_questionnaire_assignments WHERE deleted_at IS NULL ORDER BY id LIMIT 1"
)->fetch(PDO::FETCH_ASSOC);

if ($existing) {
    $other = (int) $db->query(
        "SELECT id FROM patients WHERE id <> " . (int) $existing['patient_id'] . " AND deleted_at IS NULL ORDER BY id LIMIT 1"
    )->fetchColumn();

    if ($other) {
        $res = PortalQuestionnaireService::form($other, (int) $existing['id']);
        check("another patient cannot open someone else's questionnaire",
            empty($res['success']) && !empty($res['not_found']));

        $res = PortalQuestionnaireService::submit($other, (int) $existing['id'], []);
        check("another patient cannot answer someone else's questionnaire",
            empty($res['success']) && !empty($res['not_found']));
    }
} else {
    echo "  [note] no assignments exist yet, so the cross-patient check used synthetic ids only\n";
}

check('show() on an id that does not exist returns null',
    PortalQuestionnaireService::show(99999999) === null);

// --------------------------------------------------------------------------
// 13. Staff-side refusals that must not write.
// --------------------------------------------------------------------------
echo "\n-- Clinic-side refusals --\n";

$res = PortalQuestionnaireService::cancel(99999999, [], 1);
check('cancelling an assignment that does not exist is refused', empty($res['success']));

$res = PortalQuestionnaireService::markReviewed(99999999, 1);
check('marking a non-existent assignment read is refused', empty($res['success']));

// --------------------------------------------------------------------------
// 14. The queue and the patient list.
// --------------------------------------------------------------------------
echo "\n-- Queue --\n";

foreach (['answered', 'pending', 'overdue', 'flagged', 'reviewed', 'all'] as $status) {
    $q = PortalQuestionnaireService::queue($status);
    check("the {$status} queue answers", isset($q['items']) && is_array($q['items']) && $q['status'] === $status);
}

$q = PortalQuestionnaireService::queue('not-a-status');
check('an unknown status falls back to all rather than erroring', $q['status'] === 'all');

$q = PortalQuestionnaireService::queue('all');
check('the queue carries the four counts',
    isset($q['counts']['answered'], $q['counts']['pending'], $q['counts']['overdue'], $q['counts']['flagged']));
check('every count is an integer',
    count(array_filter($q['counts'], 'is_int')) === count($q['counts']));

$q = PortalQuestionnaireService::queue('all', "'; DROP TABLE patients; --");
check('a search string is bound, not interpolated', is_array($q['items']));

// --------------------------------------------------------------------------
// 15. The patient lookup used by the send panel.
// --------------------------------------------------------------------------
echo "\n-- Patient lookup --\n";

check('a one-character search returns nothing', PortalQuestionnaireService::findPatients('a') === []);
check('an empty search returns nothing', PortalQuestionnaireService::findPatients('') === []);
check('a whitespace search returns nothing', PortalQuestionnaireService::findPatients('   ') === []);

$found = PortalQuestionnaireService::findPatients("' OR 1=1 --");
check('an injection attempt in the search is bound, not executed', is_array($found) && count($found) === 0,
    'got ' . count($found) . ' rows');

$sample = $db->query("SELECT patient_no FROM patients WHERE patient_no IS NOT NULL AND deleted_at IS NULL ORDER BY id LIMIT 1")->fetchColumn();

if ($sample !== false && $sample !== null && mb_strlen((string) $sample) >= 2) {
    $found = PortalQuestionnaireService::findPatients((string) $sample);
    check('a real hospital number finds its patient', count($found) >= 1, 'got ' . count($found));
    check('the lookup returns at most twenty rows', count($found) <= 20);

    if ($found) {
        check('each row carries id, name and mrn',
            isset($found[0]['id'], $found[0]['name']) && array_key_exists('mrn', $found[0]));
    }
}

// --------------------------------------------------------------------------
// 16. mine() and pendingFor(): the patient-facing shapes, and the rule that
//     no score reaches the patient.
// --------------------------------------------------------------------------
echo "\n-- The patient's own list --\n";

$mine = PortalQuestionnaireService::mine($anyPatient ?: 1);
check('mine() returns waiting and answered lists',
    isset($mine['waiting'], $mine['answered']) && is_array($mine['waiting']) && is_array($mine['answered']));
check('mine() reports whether answering is allowed', is_bool($mine['allow_answering']));
check('mine() carries the server time', !empty($mine['server_time']));

$everyItem = array_merge($mine['waiting'], $mine['answered']);
check('no score or severity reaches the patient',
    count(array_filter($everyItem, static fn($i) => array_key_exists('total_score', $i) || array_key_exists('severity', $i))) === 0);
check('every item the patient sees carries a status sentence',
    count(array_filter($everyItem, static fn($i) => empty($i['status_text']))) === 0);
check('every waiting item says whether it can be answered',
    count(array_filter($mine['waiting'], static fn($i) => !array_key_exists('can_answer', $i))) === 0);

$pending = PortalQuestionnaireService::pendingFor($anyPatient ?: 1);
check('pendingFor() returns a list', is_array($pending));
check('every pending item has an id, a title and an overdue flag',
    count(array_filter($pending, static fn($p) => !isset($p['id'], $p['title']) || !is_bool($p['overdue']))) === 0);

// --------------------------------------------------------------------------
// 17. Score history: one timeline, each row labelled by where it came from.
// --------------------------------------------------------------------------
echo "\n-- Score history --\n";

check('an unscored instrument has no history',
    PortalQuestionnaireService::scoreHistory($anyPatient ?: 1, 'questionnaire') === []);

$history = PortalQuestionnaireService::scoreHistory($anyPatient ?: 1, 'phq9');
check('phq9 history is a list', is_array($history));
check('every history row says where it came from',
    count(array_filter($history, static fn($h) => !in_array($h['source'] ?? '', ['visit', 'home'], true))) === 0);
check('history is capped at twenty rows', count($history) <= 20);

if (count($history) > 1) {
    $dates = array_column($history, 'at');
    $sorted = $dates;
    rsort($sorted);
    check('history is newest first', $dates === $sorted);
}

// --------------------------------------------------------------------------
// 18. The notification type the assignment relies on (seed 073).
// --------------------------------------------------------------------------
echo "\n-- Notification type (seed 073) --\n";

$type = $db->query(
    "SELECT event_type, title_template, body_template, link_tab, is_active
     FROM portal_notification_types WHERE event_type = 'questionnaire_assigned'"
)->fetch(PDO::FETCH_ASSOC);

check('questionnaire_assigned is registered and active', $type !== false && (int) $type['is_active'] === 1);

if ($type) {
    check('its body uses the {what} and {date} placeholders',
        str_contains((string) $type['body_template'], '{what}') && str_contains((string) $type['body_template'], '{date}'));
    check('it links to the questionnaires tab', $type['link_tab'] === 'mychart_questionnaires');
    check('nothing clinical is in the wording',
        !preg_match('/\b(depress|anxiet|phq|gad|score)/i', $type['title_template'] . ' ' . $type['body_template']),
        'a notification reaches email and SMS, where a diagnosis must not');
}

// --------------------------------------------------------------------------
// 19. The alert type, so an escalation is not silently dropped by AlertService.
// --------------------------------------------------------------------------
echo "\n-- Alert type --\n";

check('patient_questionnaire is a known alert type',
    array_key_exists('patient_questionnaire', \App\Modules\Alerts\Services\AlertService::TYPES));
check('both urgencies the escalation uses are valid',
    in_array('urgent', \App\Modules\Alerts\Services\AlertService::URGENCIES, true)
    && in_array('critical', \App\Modules\Alerts\Services\AlertService::URGENCIES, true));

echo "\n";
echo "  NOTE: a successful assign, a successful submit and the alert an escalation\n";
echo "        raises are NOT exercised here -- they would add rows to this shared\n";
echo "        database and send real alerts to real care-team members. Every refusal\n";
echo "        path above returns before any write, and the assignment row count is\n";
echo "        asserted unchanged. The scoring and threshold logic, which is the part\n";
echo "        that must not be wrong, is tested directly and needs no rows.\n";

echo "\n==================================================\n";
echo "   {$pass} passed, {$fail} failed\n";
echo "==================================================\n";

exit($fail === 0 ? 0 : 1);
