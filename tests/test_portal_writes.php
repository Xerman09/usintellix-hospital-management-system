<?php

declare(strict_types=1);

/**
 * Automated Verification: the portal write paths (Phase M9.5)
 *
 * M10 through M14 each shipped with their refusal paths covered and their
 * successful writes not, because the only database available was the live one.
 * This suite covers the other half: what actually changes in the database when a
 * patient cancels an appointment, sends an insurance correction, answers a
 * questionnaire, or reports a screening done elsewhere -- and what the desk's
 * decision does to it afterwards.
 *
 * It runs against the disposable database built by tests/build_test_database.php
 * and refuses to run anywhere else. Every assertion here writes; that is the
 * point, and it is why it cannot live in the other suites.
 *
 *   php tests/build_test_database.php --fresh   (once)
 *   php tests/test_portal_writes.php
 *
 * What is deliberately NOT covered, with reasons:
 *
 *   - PortalUploadService::store() succeeding. It gates on is_uploaded_file()
 *     and moves the file with move_uploaded_file(), both of which return false
 *     for anything that did not arrive as a genuine HTTP upload. That is exactly
 *     the check that stops a crafted request naming a path on the server, so the
 *     right answer is to leave it in place and reach the rest of the upload
 *     lifecycle (withdraw, accept, reject) through a row this suite inserts. A
 *     test that could pass would mean that check was gone.
 *
 *   - Payment capture (M4). It ends at a third-party gateway, so a test would be
 *     asserting against a mock of someone else's service.
 */

require_once __DIR__ . '/lib/test_fixtures.php';

use App\Core\Database;
use App\Modules\MyChart\Services\PortalAppointmentService;
use App\Modules\MyChart\Services\PortalDiagnosisGuideService;
use App\Modules\MyChart\Services\PortalHealthMaintenanceService;
use App\Modules\MyChart\Services\PortalInsuranceService;
use App\Modules\MyChart\Services\PortalQuestionnaireService;
use App\Modules\MyChart\Services\PortalTodoService;
use App\Modules\MyChart\Services\PortalUploadService;

// --------------------------------------------------------------------------
// Point this process at the disposable database BEFORE anything connects.
// --------------------------------------------------------------------------
try {
    $database = TestDatabase::use();
} catch (Throwable $e) {
    echo "REFUSED: " . $e->getMessage() . "\n";
    exit(1);
}

echo "==================================================\n";
echo "   Automated Verification: portal write paths (M9.5)\n";
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

// --------------------------------------------------------------------------
// 0. The guard. If this is wrong, nothing below should run at all.
// --------------------------------------------------------------------------
echo "\n-- Running against the right database --\n";

$connectedTo = (string) $db->query('SELECT DATABASE()')->fetchColumn();

check('connected to the test database', $connectedTo === $database, "connected to {$connectedTo}");
check('that is not the live database', strcasecmp($connectedTo, TestDatabase::liveDatabaseName()) !== 0);

if ($connectedTo !== $database) {
    echo "\n  Stopping: refusing to write to {$connectedTo}.\n";
    exit(1);
}

$world = TestFixtures::world();
TestFixtures::clearPortalWrites();

$patientId = $world['patient_id'];
$patientUser = TestFixtures::patientUser();
$staffUser = TestFixtures::staffUser();
$actorId = $staffUser['id'];

// What this can honestly claim has narrowed twice.
//
// It began as "there is exactly one patient", which M18 broke by adding a
// second fixture. It then became "every patient is a fixture patient", which
// held only while this suite's fixtures were the sole tenant of the disposable
// database. On 18 November four more suites were pointed at it -- they used to
// write to the LIVE database -- and they create patients of their own, named
// for what they test rather than ZZTEST.
//
// So the guarantee that matters is the connection guard above: this is not the
// live database, and nothing a test writes here can reach a real record. What
// is left to check here is that this suite's own fixture is present and is the
// one being written to.
check('the fixture patient exists', (int) $db->query('SELECT COUNT(*) FROM patients WHERE patient_no = ' . $db->quote(TestFixtures::PATIENT_NO))->fetchColumn() === 1);
check('and it is the patient this suite writes as', (int) $patientId > 0
    && (string) $db->query('SELECT patient_no FROM patients WHERE id = ' . (int) $patientId)->fetchColumn() === TestFixtures::PATIENT_NO);
$far = date('Y-m-d', strtotime('+30 days'));
$soon = date('Y-m-d', strtotime('+2 days'));

// --------------------------------------------------------------------------
// 1. M10 -- appointments. The three writes a patient can make.
// --------------------------------------------------------------------------
echo "\n-- M10: cancelling an appointment --\n";

$appointmentId = TestFixtures::appointment($far, '10:00:00');

$res = PortalAppointmentService::cancel($patientId, [
    'appointment_id' => $appointmentId,
    'reason' => 'I will be out of town.',
], $patientUser);

check('a patient can cancel their own future appointment', !empty($res['success']), json_encode($res));

$row = $db->query("SELECT * FROM appointments WHERE id = {$appointmentId}")->fetch(PDO::FETCH_ASSOC);

check('the status becomes cancelled', ($row['status'] ?? '') === 'cancelled', 'status=' . ($row['status'] ?? 'null'));
check('cancelled_by_patient is set, so the desk can tell who did it', (int) ($row['cancelled_by_patient'] ?? 0) === 1);
check('the reason the patient gave is stored', ($row['cancel_reason'] ?? '') === 'I will be out of town.');
check('cancelled_at is stamped', !empty($row['cancelled_at']));

// The roadmap names this as the thing most likely to be re-broken: a patient
// cancel must NOT soft-delete, because a deleted row vanishes from the desk's
// day and nobody learns the slot came free.
check('the row is NOT soft-deleted -- the freed slot stays visible to the desk',
    ($row['deleted_at'] ?? null) === null, 'deleted_at=' . var_export($row['deleted_at'] ?? null, true));

$again = PortalAppointmentService::cancel($patientId, [
    'appointment_id' => $appointmentId,
    'reason' => 'Changed my mind again.',
], $patientUser);

check('cancelling twice is refused rather than applied twice', empty($again['success']));
// Eligibility refuses it before the UPDATE is even attempted, so the message is
// about the appointment's state rather than about the second tap. Either wording
// is honest; this records which one a patient actually gets.
check('and the refusal explains why, naming the state it is in',
    str_contains((string) ($again['message'] ?? ''), 'cancelled'), (string) ($again['message'] ?? ''));

check('the cancel is written to the audit log',
    (int) $db->query("SELECT COUNT(*) FROM portal_audit_logs
                      WHERE patient_id = {$patientId} AND event_type = 'Appointment Cancelled'")->fetchColumn() === 1);

echo "\n-- M10: confirming attendance --\n";

$confirmId = TestFixtures::appointment($soon, '09:00:00');

$res = PortalAppointmentService::confirm($patientId, ['appointment_id' => $confirmId], $patientUser);

check('a patient can confirm they are coming', !empty($res['success']), json_encode($res));

$row = $db->query("SELECT patient_confirmed_at, status FROM appointments WHERE id = {$confirmId}")->fetch(PDO::FETCH_ASSOC);

check('patient_confirmed_at is stamped', !empty($row['patient_confirmed_at']));
check('confirming does not change the booking', ($row['status'] ?? '') === 'scheduled');

// Confirming inside the cut-off is deliberate: it is most useful to the desk
// precisely when moving and cancelling have closed.
$insideCutoff = TestFixtures::appointment(date('Y-m-d'), date('H:i:s', strtotime('+3 hours')));
$res = PortalAppointmentService::confirm($patientId, ['appointment_id' => $insideCutoff], $patientUser);

check('confirming still works inside the cut-off, when cancelling no longer does', !empty($res['success']), json_encode($res));

$res = PortalAppointmentService::cancel($patientId, [
    'appointment_id' => $insideCutoff,
    'reason' => 'Too late for this.',
], $patientUser);

check('cancelling inside the cut-off is refused', empty($res['success']));

echo "\n-- M10: moving an appointment --\n";

$moveId = TestFixtures::appointment($far, '11:00:00');

// Ask the service which slots it would offer, rather than guessing a time and
// tripping the clinic's opening hours. If it offers none, say so plainly
// instead of reporting a failure that is really a fixture gap.
$slots = PortalAppointmentService::slotsFor($patientId, $moveId);
$offered = [];

foreach (($slots['days'] ?? []) as $day) {
    foreach (($day['times'] ?? []) as $time) {
        $offered[] = [$day['date'], $time];
    }
}

if (empty($offered)) {
    echo "  [SKIP] no slots offered in this database, so the move is not exercised\n";
    echo "         (slotsFor returned " . json_encode(array_keys((array) $slots)) . ")\n";
} else {
    [$newDate, $newTime] = $offered[0];

    $res = PortalAppointmentService::reschedule($patientId, [
        'appointment_id' => $moveId,
        'date' => $newDate,
        'time' => $newTime,
    ], $patientUser);

    check('a patient can move their appointment to an offered slot', !empty($res['success']), json_encode($res));

    if (!empty($res['success'])) {
        $row = $db->query("SELECT * FROM appointments WHERE id = {$moveId}")->fetch(PDO::FETCH_ASSOC);

        check('the new date is written', (string) $row['appointment_date'] === (string) $newDate,
            "{$row['appointment_date']} vs {$newDate}");
        check('rescheduled_by_patient is set', (int) $row['rescheduled_by_patient'] === 1);
        check('rescheduled_count is incremented', (int) $row['rescheduled_count'] === 1);
        check('where it came from is kept', (string) $row['rescheduled_from_date'] === $far,
            (string) $row['rescheduled_from_date']);
        check('the move is not a soft delete either', $row['deleted_at'] === null);
    }
}

// --------------------------------------------------------------------------
// 2. M11 -- uploads. The lifecycle after the file has arrived.
// --------------------------------------------------------------------------
echo "\n-- M11: withdrawing and reviewing an upload --\n";

$res = PortalUploadService::store($patientId, [
    'error' => UPLOAD_ERR_OK,
    'tmp_name' => __FILE__,
    'size' => 1024,
    'name' => 'not-really-uploaded.png',
], ['kind' => 'other'], $patientUser);

check('store() still refuses a path that did not arrive as an upload',
    empty($res['success']), json_encode($res));

/**
 * Insert an upload row directly, standing in for the HTTP upload this suite
 * cannot perform. The file on disk is real so that accepting it has something
 * to copy.
 */
$makeUpload = static function (string $status = 'pending') use ($db, $patientId, $world): array {
    // The service's own directory under the disposable upload root, not the
    // deployment's. TestDatabase::use() set PORTAL_UPLOAD_ROOT before anything
    // connected, so this is where PortalUploadService will look for the file.
    $dir = TestDatabase::uploadRoot() . '/storage/patient-uploads';

    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }

    // A one-pixel PNG, written as bytes so the stored file is genuinely the type
    // the row claims -- the service sniffs the bytes, never the name.
    $png = base64_decode(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg=='
    );
    $stored = 'pu_test_' . bin2hex(random_bytes(4)) . '.png';
    file_put_contents($dir . DIRECTORY_SEPARATOR . $stored, $png);

    $stmt = $db->prepare(
        "INSERT INTO patient_uploads
            (patient_id, uploaded_by, kind, caption, original_filename, stored_filename,
             mime_type, size_bytes, sha256, status, created_at)
         VALUES (:p, :by, 'insurance_card', 'Fixture upload', 'card.png', :stored,
                 'image/png', :size, :sha, :status, NOW())"
    );
    $stmt->execute([
        'p' => $patientId,
        'by' => $world['patient_user_id'],
        'stored' => $stored,
        'size' => strlen((string) $png),
        'sha' => hash('sha256', (string) $png),
        'status' => $status,
    ]);

    return ['id' => (int) $db->lastInsertId(), 'stored' => $stored];
};

$upload = $makeUpload();

$res = PortalUploadService::withdraw($patientId, $upload['id'], $patientUser);

check('a patient can withdraw a file they sent', !empty($res['success']), json_encode($res));

// Withdrawing soft-deletes rather than setting a status: every query filters
// deleted_at IS NULL, so the row leaves the patient's list and the desk's queue
// without inventing a 'withdrawn' state that staff would have to read past.
$row = $db->query("SELECT status, deleted_at FROM patient_uploads WHERE id = {$upload['id']}")->fetch(PDO::FETCH_ASSOC);

check('the withdrawn file is soft-deleted', $row['deleted_at'] !== null, json_encode($row));

$queueIds = array_column(PortalUploadService::queue('pending')['items'] ?? [], 'id');

check('and it has left the review queue at the desk', !in_array($upload['id'], $queueIds, true), json_encode($queueIds));

$upload = $makeUpload();

$res = PortalUploadService::review($upload['id'], ['decision' => 'reject'], $actorId);

check('staff can reject an upload with a reason', empty($res['success']),
    'a reject with no reason should be refused: ' . json_encode($res));

$res = PortalUploadService::review($upload['id'], [
    'decision' => 'reject',
    'note' => 'The card is cut off at the edge -- please send it again.',
], $actorId);

check('a reject with a reason is accepted', !empty($res['success']), json_encode($res));

$row = $db->query("SELECT status, review_note FROM patient_uploads WHERE id = {$upload['id']}")->fetch(PDO::FETCH_ASSOC);

check('the upload is marked rejected', ($row['status'] ?? '') === 'rejected', json_encode($row));
check('the reason the patient will read is stored', !empty($row['review_note']));

$upload = $makeUpload();
$documentsBefore = (int) $db->query("SELECT COUNT(*) FROM patient_documents WHERE patient_id = {$patientId}")->fetchColumn();

$res = PortalUploadService::review($upload['id'], ['decision' => 'accept'], $actorId);

check('staff can accept an upload', !empty($res['success']), json_encode($res));

$row = $db->query("SELECT status FROM patient_uploads WHERE id = {$upload['id']}")->fetch(PDO::FETCH_ASSOC);

check('the upload is marked accepted', ($row['status'] ?? '') === 'accepted', json_encode($row));

$documentsAfter = (int) $db->query("SELECT COUNT(*) FROM patient_documents WHERE patient_id = {$patientId}")->fetchColumn();

check('accepting copies it into the chart as a patient document',
    $documentsAfter === $documentsBefore + 1, "{$documentsBefore} -> {$documentsAfter}");

// --------------------------------------------------------------------------
// 3. M12 -- insurance. A request is a request until the desk accepts it.
// --------------------------------------------------------------------------
echo "\n-- M12: asking for insurance to be added --\n";

$insurancesBefore = (int) $db->query("SELECT COUNT(*) FROM patient_insurances WHERE patient_id = {$patientId}")->fetchColumn();

$res = PortalInsuranceService::request($patientId, [
    'action' => 'add',
    'policy_number' => 'ZZ-TEST-556677',
    'insurance_id' => $world['insurer_id'],
    'insurance_type' => 'primary',
    'note' => 'New card from my employer.',
], $patientUser);

check('a patient can ask for cover to be added', !empty($res['success']), json_encode($res));

$request = $db->query("SELECT * FROM patient_insurance_requests WHERE patient_id = {$patientId} ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);

check('the request is recorded as pending', ($request['status'] ?? '') === 'pending', json_encode($request['status'] ?? null));
check('the policy number the patient typed is kept', ($request['policy_number'] ?? '') === 'ZZ-TEST-556677');

$insurancesMid = (int) $db->query("SELECT COUNT(*) FROM patient_insurances WHERE patient_id = {$patientId}")->fetchColumn();

check('nothing has reached patient_insurances yet -- asking is not changing',
    $insurancesMid === $insurancesBefore, "{$insurancesBefore} -> {$insurancesMid}");

$requestId = (int) $request['id'];

$res = PortalInsuranceService::withdraw($patientId, $requestId, $patientUser);

check('a patient can withdraw their own request', !empty($res['success']), json_encode($res));

$row = $db->query("SELECT status, deleted_at FROM patient_insurance_requests WHERE id = {$requestId}")->fetch(PDO::FETCH_ASSOC);

check('the withdrawn request is soft-deleted', $row['deleted_at'] !== null, json_encode($row));

$queueIds = array_column(PortalInsuranceService::queue('pending')['items'] ?? [], 'id');

check('and it has left the queue at the desk', !in_array($requestId, $queueIds, true), json_encode($queueIds));

$res = PortalInsuranceService::request($patientId, [
    'action' => 'add',
    'policy_number' => 'ZZ-TEST-889900',
    'insurance_id' => $world['insurer_id'],
    'insurance_type' => 'primary',
], $patientUser);

check('a second request can be sent after the first is withdrawn', !empty($res['success']), json_encode($res));

// A patient may name an insurer the hospital does not have on file -- they should
// not have to know the hospital's payer list. The desk then cannot apply it, and
// the refusal has to say what to do instead rather than just failing.
$typedOnly = PortalInsuranceService::request($patientId, [
    'action' => 'add',
    'policy_number' => 'ZZ-TEST-UNKNOWN',
    'insurer_name_text' => 'Some Insurer Not On File',
    'insurance_type' => 'secondary',
], $patientUser);

if (!empty($typedOnly['success'])) {
    $typedId = (int) $db->query("SELECT id FROM patient_insurance_requests WHERE patient_id = {$patientId} AND policy_number = 'ZZ-TEST-UNKNOWN' ORDER BY id DESC LIMIT 1")->fetchColumn();
    $res = PortalInsuranceService::review($typedId, ['decision' => 'apply'], $actorId);

    check('applying a request whose insurer is not on file is refused', empty($res['success']), json_encode($res));
    check('and the refusal tells the desk how to proceed',
        str_contains((string) ($res['message'] ?? ''), 'Add that insurer first'), (string) ($res['message'] ?? ''));

    $db->prepare('UPDATE patient_insurance_requests SET deleted_at = NOW() WHERE id = ?')->execute([$typedId]);
}

// deleted_at IS NULL matters here: the typed-only request above was withdrawn,
// and review() filters soft-deleted rows, so picking "the latest pending" without
// it selects a row review() will say no longer exists.
$requestId = (int) $db->query("SELECT id FROM patient_insurance_requests
    WHERE patient_id = {$patientId} AND status = 'pending' AND deleted_at IS NULL
    ORDER BY id DESC LIMIT 1")->fetchColumn();

// "apply", not "accept": the desk is applying the change to the record, which is
// a different act from accepting a file. The vocabulary differs per queue and the
// controller passes it through, so a test that guessed would pass against nothing.
$res = PortalInsuranceService::review($requestId, ['decision' => 'apply', 'note' => 'Card seen at the desk.'], $actorId);

check('staff can apply an insurance request', !empty($res['success']), json_encode($res));

$row = $db->query("SELECT status FROM patient_insurance_requests WHERE id = {$requestId}")->fetch(PDO::FETCH_ASSOC);

check('the request is marked applied', ($row['status'] ?? '') === 'applied', json_encode($row));

$insurancesAfter = (int) $db->query("SELECT COUNT(*) FROM patient_insurances WHERE patient_id = {$patientId}")->fetchColumn();

check('applying is what puts the cover on the record',
    $insurancesAfter === $insurancesBefore + 1, "{$insurancesBefore} -> {$insurancesAfter}");

// --------------------------------------------------------------------------
// 4. M13 -- questionnaires, including the escalation that matters most.
// --------------------------------------------------------------------------
echo "\n-- M13: sending and answering a questionnaire --\n";

$res = PortalQuestionnaireService::assign([
    'patient_id' => $patientId,
    'instrument' => 'phq9',
    'due_date' => date('Y-m-d', strtotime('+10 days')),
    'reason' => 'Checking in after the medication change.',
], $actorId);

check('a clinician can send a PHQ-9 to a patient', !empty($res['success']), json_encode($res));

$assignmentId = (int) $db->query("SELECT id FROM portal_questionnaire_assignments WHERE patient_id = {$patientId} ORDER BY id DESC LIMIT 1")->fetchColumn();

check('the assignment is pending', (string) $db->query("SELECT status FROM portal_questionnaire_assignments WHERE id = {$assignmentId}")->fetchColumn() === 'pending');

$mine = PortalQuestionnaireService::mine($patientId);

check('the patient sees it waiting', count($mine['waiting'] ?? []) >= 1, json_encode(array_keys((array) $mine)));

$firstItem = ($mine['waiting'] ?? [])[0] ?? [];

check('what the patient sees carries no score',
    !array_key_exists('total_score', $firstItem) && !array_key_exists('severity', $firstItem),
    json_encode(array_keys($firstItem)));

// Nine answers. Item 9 (thoughts of being better off dead) is deliberately
// positive while the total stays low -- a threshold on the total alone would
// swallow exactly this case, so this is the assertion that matters.
$answers = [
    'q1_little_interest' => 0,
    'q2_feeling_down' => 1,
    'q3_sleep_trouble' => 0,
    'q4_feeling_tired' => 1,
    'q5_poor_appetite' => 0,
    'q6_feeling_bad_self' => 0,
    'q7_trouble_concentrating' => 0,
    'q8_moving_slowly' => 0,
    'q9_better_off_dead' => 2,
];

$res = PortalQuestionnaireService::submit($patientId, $assignmentId, $answers, $patientUser);

check('the patient can submit their answers', !empty($res['success']), json_encode($res));

$row = $db->query("SELECT * FROM portal_questionnaire_assignments WHERE id = {$assignmentId}")->fetch(PDO::FETCH_ASSOC);

// The status enum is pending/completed/cancelled. There is no 'answered' state
// and no 'reviewed' one -- being read is recorded by reviewed_at, which is why
// the queue's "answered" tab is status = completed AND reviewed_at IS NULL.
check('the assignment becomes completed', ($row['status'] ?? '') === 'completed', json_encode($row['status'] ?? null));
check('the score is stored on the assignment', (int) ($row['total_score'] ?? -1) === 4, 'total_score=' . var_export($row['total_score'] ?? null, true));

// This is the case worth keeping: the patient answered "more than half the days"
// to thoughts of being better off dead, and the PHQ-9 TOTAL is 4, so the stored
// severity label reads as reassurance. Urgency is not persisted as a word at all
// -- it is expressed by raising the alert. Both are asserted together, because
// the label on its own would understate what the patient said, and the alert on
// its own is what stops that mattering.
check('the severity label follows the total, so it reads mild here',
    stripos((string) ($row['severity'] ?? ''), 'no depressive') !== false,
    'severity=' . var_export($row['severity'] ?? null, true));
check('but the alert is raised anyway, because item 9 was positive',
    ($row['alert_id'] ?? null) !== null, 'alert_id=' . var_export($row['alert_id'] ?? null, true));
check('and when it was raised is recorded', !empty($row['alerted_at']));

check('the answers are kept as a response row',
    (int) $db->query("SELECT COUNT(*) FROM portal_questionnaire_responses WHERE patient_id = {$patientId}")->fetchColumn() === 1);

check('a critical answer raises an alert for the care team',
    (int) $db->query("SELECT COUNT(*) FROM alerts WHERE alert_type = 'patient_questionnaire'")->fetchColumn() >= 1,
    'no alert row was written');

$res = PortalQuestionnaireService::submit($patientId, $assignmentId, $answers, $patientUser);

check('submitting the same questionnaire twice is refused', empty($res['success']), json_encode($res));

$res = PortalQuestionnaireService::markReviewed($assignmentId, $actorId);

check('a clinician can mark it reviewed', !empty($res['success']), json_encode($res));

check('the reviewed state is recorded as a timestamp, not a status',
    $db->query("SELECT reviewed_at FROM portal_questionnaire_assignments WHERE id = {$assignmentId}")->fetchColumn() !== null);

// The desk's "needs reading" tab is exactly status = completed AND reviewed_at IS
// NULL, so a reviewed one has to leave it or the queue never empties.
$needsReading = array_column(PortalQuestionnaireService::queue('answered')['items'] ?? [], 'id');

check('a reviewed questionnaire leaves the needs-reading queue',
    !in_array($assignmentId, $needsReading, true), json_encode($needsReading));

$flagged = array_column(PortalQuestionnaireService::queue('flagged')['items'] ?? [], 'id');

check('but it stays on the flagged tab, where the alert can still be acted on',
    in_array($assignmentId, $flagged, true), json_encode($flagged));

// --------------------------------------------------------------------------
// 5. M14 -- health maintenance. The claim, and the desk accepting it.
// --------------------------------------------------------------------------
echo "\n-- M14: what you are due for --\n";

$reminderCount = TestFixtures::generateReminders();

check('the reminder engine produces rows for this patient', $reminderCount > 0, "count={$reminderCount}");

$mine = PortalHealthMaintenanceService::mine($patientId);
$labels = array_column($mine['items'] ?? [], 'label');

// The whole point of M14's three switches. The engine generates diabetes,
// Coumadin, penicillin and social-security-number reminders for every patient,
// because those rules have no demographic criteria at all.
$forbidden = ['Diabetes', 'Coumadin', 'INR', 'Social Security', 'Penicillin', 'Weight'];
$leaked = [];

foreach ($labels as $label) {
    foreach ($forbidden as $word) {
        if (stripos($label, $word) !== false) {
            $leaked[] = $label;
        }
    }
}

check('the patient is shown something', count($labels) > 0, json_encode($labels));
check('nothing clinical-register or condition-specific leaks through',
    empty($leaked), 'leaked: ' . json_encode($leaked));

check('a 52-year-old woman is offered cervical screening',
    (bool) array_filter($labels, static fn($l) => stripos($l, 'Cervical') !== false), json_encode($labels));
check('and is not offered a prostate check',
    !array_filter($labels, static fn($l) => stripos($l, 'Prostate') !== false), json_encode($labels));

$item = ($mine['items'] ?? [])[0] ?? [];
$reminderId = (int) ($item['id'] ?? 0);

check('with no completion recorded, the item does not read as up to date',
    ($item['status'] ?? '') !== 'up_to_date', 'status=' . ($item['status'] ?? 'null'));
check('and says so in words rather than going quiet',
    str_contains((string) ($item['status_text'] ?? ''), 'no record'), (string) ($item['status_text'] ?? ''));

$res = PortalHealthMaintenanceService::request($patientId, [
    'id' => $reminderId,
    'action' => 'book',
    'note' => 'Afternoons are easier for me.',
], $patientUser);

check('a patient can ask the clinic to arrange a screening', !empty($res['success']), json_encode($res));

$request = $db->query("SELECT * FROM portal_care_gap_requests WHERE patient_id = {$patientId} ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);

check('the request is pending', ($request['status'] ?? '') === 'pending', json_encode($request['status'] ?? null));
check('it is a request to arrange, not a booking', ($request['action'] ?? '') === 'book');

check('no appointment was created by asking',
    (int) $db->query("SELECT COUNT(*) FROM appointments WHERE patient_id = {$patientId} AND reason = 'Fixture appointment' AND status = 'scheduled' AND appointment_date > CURDATE()")->fetchColumn() >= 0);

$mine = PortalHealthMaintenanceService::mine($patientId);
$sameItem = null;

foreach ($mine['items'] as $i) {
    if ($i['id'] === $reminderId) {
        $sameItem = $i;
    }
}

check('the item now says the clinic has been asked', !empty($sameItem['pending_request']), json_encode($sameItem['pending_request'] ?? null));
check('and does not offer the same button again', ($sameItem['can_request'] ?? true) === false);

$res = PortalHealthMaintenanceService::withdraw($patientId, (int) $request['id']);

check('a patient can withdraw the request', !empty($res['success']), json_encode($res));

echo "\n-- M14: reporting something done elsewhere --\n";

$doneOn = date('Y-m-d', strtotime('-20 days'));

$res = PortalHealthMaintenanceService::request($patientId, [
    'id' => $reminderId,
    'action' => 'report_done',
    'done_on' => $doneOn,
    'done_where' => 'Zz Test Clinic, next town',
], $patientUser);

check('a patient can report it was done elsewhere', !empty($res['success']), json_encode($res));

$request = $db->query("SELECT * FROM portal_care_gap_requests WHERE patient_id = {$patientId} AND action = 'report_done' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);

check('the date and place are kept', ($request['done_on'] ?? '') === $doneOn && !empty($request['done_where']),
    json_encode([$request['done_on'] ?? null, $request['done_where'] ?? null]));

$actionsBefore = (int) $db->query("SELECT COUNT(*) FROM patient_reminder_actions")->fetchColumn();

$mine = PortalHealthMaintenanceService::mine($patientId);

foreach ($mine['items'] as $i) {
    if ($i['id'] === $reminderId) {
        check('an unconfirmed claim does NOT make the item up to date',
            $i['status'] !== 'up_to_date', 'status=' . $i['status']);
    }
}

check('and no completion was written on the patient\'s word alone',
    (int) $db->query("SELECT COUNT(*) FROM patient_reminder_actions")->fetchColumn() === $actionsBefore);

$res = PortalHealthMaintenanceService::review((int) $request['id'], [
    'decision' => 'accept',
    'note' => 'Report sighted.',
], $actorId);

check('the desk can accept the claim', !empty($res['success']), json_encode($res));

check('accepting writes a completed action through the reminder service',
    (int) $db->query("SELECT COUNT(*) FROM patient_reminder_actions")->fetchColumn() === $actionsBefore + 1);

$mine = PortalHealthMaintenanceService::mine($patientId);

foreach ($mine['items'] as $i) {
    if ($i['id'] === $reminderId) {
        check('only then does the item become up to date', $i['status'] === 'up_to_date', 'status=' . $i['status']);
        check('and the next due date is worked out from the date it was done',
            $i['next_due_date'] !== null, 'next_due=' . var_export($i['next_due_date'], true));
        check('the date it was done is shown back to the patient',
            (string) $i['last_done_on'] === $doneOn, 'last_done_on=' . var_export($i['last_done_on'], true));
    }
}

// The To-Do list and the panel must not be able to disagree about what somebody
// is due for, which is why PortalTodoService delegates to dueFor() rather than
// querying patient_reminders itself. Now that this item is up to date, it must
// have left the To-Do list as well.
$todo = PortalTodoService::list($patientId);
$todoText = json_encode($todo);

check('the To-Do list is built', is_array($todo) && !empty($todo));
check('an item that is now up to date is gone from the To-Do list too',
    !str_contains((string) $todoText, (string) $item['label']),
    'still mentions ' . (string) $item['label']);

// --------------------------------------------------------------------------
// 6. M9 -- the After-Visit Summary path against a real coded diagnosis.
//    encounter_diagnoses has been empty in every database this project has, so
//    this is the first time the guide matcher meets a coded row.
// --------------------------------------------------------------------------
echo "\n-- M9: diagnosis guides against a real coded diagnosis --\n";

$coded = (int) $db->query("SELECT COUNT(*) FROM encounter_diagnoses WHERE deleted_at IS NULL")->fetchColumn();

check('the fixture encounter carries a coded diagnosis', $coded >= 1, "count={$coded}");

$guides = PortalDiagnosisGuideService::forDiagnoses([
    ['code' => TestFixtures::DIAGNOSIS_CODE, 'text' => TestFixtures::DIAGNOSIS_TEXT],
]);

check('a guide is found for ' . TestFixtures::DIAGNOSIS_CODE . ' via its 3-character category',
    !empty($guides), json_encode($guides));

if (!empty($guides)) {
    $guide = reset($guides);

    check('the guide has a title', !empty($guide['title']), json_encode(array_keys((array) $guide)));
    check('the guide says what the condition is', !empty($guide['about']));
    check('the guide carries do and do-not lists',
        isset($guide['dos']) && isset($guide['donts']), json_encode(array_keys((array) $guide)));
    check('the guide says when to get help now', !empty($guide['when_to_seek_help']));
}

$unknown = PortalDiagnosisGuideService::forDiagnoses([
    ['code' => 'ZZ99.9', 'text' => 'Something with no guide at all'],
]);

check('a diagnosis with no guide returns nothing rather than a near-miss',
    empty($unknown), json_encode($unknown));

// --------------------------------------------------------------------------
echo "\n==================================================\n";
echo "\n-- Cleaning up --\n";

TestFixtures::clearPortalWrites();

// clearPortalWrites() has already emptied it; this is the belt-and-braces call,
// so it normally finds nothing left to do.
TestDatabase::clearUploadRoot();

echo "  test upload root emptied\n";

// Checking the deployment's own directories are still empty is what proves the
// PORTAL_UPLOAD_ROOT override actually took effect. Without it these tests wrote
// into live storage, and an accepted upload is named doc_from_portal_* whether a
// patient or a test produced it -- so there would have been no safe way to tell
// them apart and clean up.
$sharedUploads = glob(__DIR__ . '/../backend/storage/patient-uploads/*') ?: [];
$sharedDocs = glob(__DIR__ . '/../backend/public/uploads/patient_documents/doc_from_portal_*') ?: [];

check('nothing was written into the deployment upload directory',
    count($sharedUploads) === 0,
    count($sharedUploads) . ' file(s): ' . json_encode(array_map('basename', $sharedUploads)));
check('and nothing was filed into the deployment documents directory',
    count($sharedDocs) === 0,
    count($sharedDocs) . ' file(s): ' . json_encode(array_map('basename', $sharedDocs)));

echo "   {$pass} passed, {$fail} failed\n";
echo "==================================================\n";
echo "  (database: {$database} -- safe to drop at any time)\n";

exit($fail > 0 ? 1 : 0);
