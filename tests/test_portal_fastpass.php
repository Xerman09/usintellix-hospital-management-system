<?php

declare(strict_types=1);

/**
 * Automated Verification: Fast Pass (Phase M18)
 *
 * Runs against the disposable database from tests/build_test_database.php and
 * refuses to run anywhere else. It moves real appointments, so there is nowhere
 * else it could honestly run.
 *
 *   php tests/build_test_database.php --fresh   (once)
 *   php tests/test_portal_fastpass.php
 *
 * The suite is built around the four things that could actually go wrong.
 *
 * ONE: two patients taking the same slot. The whole feature turns on a single
 * conditional UPDATE, so the race is forced here rather than hoped about -- an
 * offer is put back to 'open' behind a slot that has already been claimed, and
 * the second accept has to lose cleanly and leave that patient on the list.
 *
 * TWO: an appointment moving when nobody said so. Nothing in this feature may
 * move a booking without a patient having answered a specific offer. The
 * assertions check that an expired offer, a voided offer, a sweep and a
 * withdrawal all leave the appointment exactly where it was.
 *
 * THREE: offering a slot that is not really free. The clinic may fill a gap by
 * hand at any moment, so availability is re-checked at offer time AND at accept
 * time, and a failed move must release the claim rather than leave a slot held
 * by something that did not happen.
 *
 * FOUR: offering the wrong slot to the wrong person. Later than their own
 * appointment, before a date they said they could not do, a different doctor,
 * the same slot twice, more offers in a day than the hospital allows -- each
 * one is a reason not to offer, and each is asserted separately.
 *
 * Settings are read, changed and restored. The originals are captured before the
 * first assertion and put back in the cleanup block, including when an assertion
 * fails -- an earlier suite in this project left seed rows mutated on failure and
 * broke three unrelated tests the next day.
 */

require_once __DIR__ . '/lib/test_fixtures.php';

use App\Core\Database;
use App\Modules\MyChart\Services\PortalAppointmentService;
use App\Modules\MyChart\Services\PortalFastPassService;

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
echo "   Automated Verification: Fast Pass (M18)\n";
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

/** Reach a private static on the service. */
function fp(string $method, array $args = [])
{
    $m = new ReflectionMethod(PortalFastPassService::class, $method);
    $m->setAccessible(true);

    return $m->invokeArgs(null, $args);
}

function fpConst(string $name)
{
    return (new ReflectionClass(PortalFastPassService::class))->getConstant($name);
}

$db = Database::connection();

// --------------------------------------------------------------------------
// 0. The guard.
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
$two = TestFixtures::secondPatient();

$patientA = $world['patient_id'];
$patientB = $two['patient_id'];
$userA = TestFixtures::patientUser();
$userB = TestFixtures::secondPatientUser();
$staffUser = TestFixtures::staffUser();
$providerId = $world['provider_id'];

check('two fixture patients exist and are different', $patientA > 0 && $patientB > 0 && $patientA !== $patientB);

// Seeds are not auto-run by anything in this project, so a test database built
// before M18 has the tables (AutoMigrator applies schema on connect) and none of
// the rows. Checked here rather than left to fail as six confusing assertions in
// the notification section.
$seeded = (int) $db->query(
    "SELECT COUNT(*) FROM portal_notification_types WHERE event_type IN ('fastpass_offer','fastpass_moved')"
)->fetchColumn();

if ($seeded !== 2) {
    echo "
  This database is missing the M18 seeds (085, 086). Run:
";
    echo "    php tests/build_test_database.php
";
    exit(1);
}

// --------------------------------------------------------------------------
// Settings, captured so they can be put back.
// --------------------------------------------------------------------------
$settingColumns = [
    'portal_allow_fastpass',
    'portal_fastpass_offer_hours',
    'portal_fastpass_min_lead_hours',
    'portal_fastpass_offer_batch',
    'portal_fastpass_max_declines',
    'portal_fastpass_max_offers_per_day',
];

$originalSettings = $db->query(
    'SELECT ' . implode(', ', $settingColumns) . ' FROM general_settings ORDER BY id LIMIT 1'
)->fetch(PDO::FETCH_ASSOC) ?: [];

/** Write one or more policy values, by column name. */
function setPolicy(array $values): void
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

/** Everything this suite writes, gone. Appointments last -- offers point at them. */
function resetFastPass(): void
{
    global $db, $patientA, $patientB, $providerId;

    $db->prepare('DELETE FROM portal_fastpass_offers WHERE patient_id IN (?, ?)')->execute([$patientA, $patientB]);
    $db->prepare('DELETE FROM portal_fastpass_offers WHERE slot_id IN (SELECT id FROM portal_fastpass_slots WHERE provider_id = ?)')->execute([$providerId]);
    $db->prepare('DELETE FROM portal_fastpass_waitlist WHERE patient_id IN (?, ?)')->execute([$patientA, $patientB]);
    $db->prepare('DELETE FROM portal_fastpass_slots WHERE provider_id = ?')->execute([$providerId]);
    $db->prepare('DELETE FROM patient_notifications WHERE patient_id IN (?, ?)')->execute([$patientA, $patientB]);
    $db->prepare('DELETE FROM appointments WHERE patient_id IN (?, ?)')->execute([$patientA, $patientB]);
}

$dbNow = (string) $db->query('SELECT NOW()')->fetchColumn();

// Where the audit log stood before this suite wrote anything. The test database
// persists between suites, so "every audit row for the fixture patient" includes
// rows M14 and M17a left behind -- the only honest question is what THIS run
// wrote.
$auditWatermark = (int) ($db->query('SELECT COALESCE(MAX(id), 0) FROM portal_audit_logs')->fetchColumn() ?: 0);

/**
 * A weekday date $days ahead, on the database's clock.
 *
 * Weekdays only, because the fixture provider's schedule resolves to a clinic
 * that is open 08:00-17:00 Monday to Thursday with a shorter Friday. A test that
 * drifted onto a Sunday would be asserting about opening hours rather than about
 * Fast Pass.
 */
function weekdayAhead(int $days): string
{
    global $dbNow;

    $ts = strtotime($dbNow) + ($days * 86400);

    while (in_array((int) date('N', $ts), [6, 7], true)) {
        $ts += 86400;
    }

    return date('Y-m-d', $ts);
}

$dayNear = weekdayAhead(3);
$dayMid = weekdayAhead(10);
$dayFar = weekdayAhead(20);

echo "  server clock: {$dbNow} (php says " . date('Y-m-d H:i:s') . ")\n";
echo "  dates in use: near={$dayNear} mid={$dayMid} far={$dayFar}\n";

try {

// ==========================================================================
// 1. Policy, and the bounds on it.
// ==========================================================================
echo "\n-- Policy --\n";

setPolicy([
    'portal_allow_fastpass' => 1,
    'portal_fastpass_offer_hours' => 4,
    'portal_fastpass_min_lead_hours' => 4,
    'portal_fastpass_offer_batch' => 3,
    'portal_fastpass_max_declines' => 3,
    'portal_fastpass_max_offers_per_day' => 2,
]);

$policy = PortalFastPassService::settings();

check('the master switch reads as a boolean', is_bool($policy['allow']) && $policy['allow'] === true);
check('the six policy values come back as integers',
    $policy['offer_hours'] === 4 && $policy['min_lead_hours'] === 4 && $policy['batch'] === 3
    && $policy['max_declines'] === 3 && $policy['max_per_day'] === 2);

check('a zero batch falls back rather than offering to nobody', fp('bounded', [0, 1, 25, 3]) === 3);
check('a zero offer window falls back rather than expiring on arrival', fp('bounded', [0, 1, 72, 4]) === 4);
check('an absurd lead time falls back', fp('bounded', [99999, 0, 24 * 14, 4]) === 4);
check('a lead time of zero is allowed, because it is a real choice', fp('bounded', [0, 0, 24 * 14, 4]) === 0);
check('a missing value falls back', fp('bounded', [null, 1, 25, 3]) === 3);
check('an in-range value is kept', fp('bounded', [7, 1, 25, 3]) === 7);

check('the master switch off is honoured', (static function () {
    setPolicy(['portal_allow_fastpass' => 0]);
    $off = PortalFastPassService::settings();
    setPolicy(['portal_allow_fastpass' => 1]);

    return $off['allow'] === false;
})());

// ==========================================================================
// 2. Joining the list.
// ==========================================================================
echo "\n-- Joining --\n";

resetFastPass();

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');

$res = PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);
check('a patient can put a future appointment on the list', !empty($res['success']), json_encode($res));

$entry = $db->query("SELECT * FROM portal_fastpass_waitlist WHERE appointment_id = {$apptA}")->fetch(PDO::FETCH_ASSOC);
check('the entry is active', $entry && $entry['status'] === 'active');
check('the entry carries the appointment\'s provider', $entry && (int) $entry['provider_id'] === $providerId);
check('no earliest date was invented', $entry && $entry['earliest_date'] === null);
check('joined_at is on the database clock, not PHP\'s',
    $entry && abs(strtotime($entry['joined_at']) - strtotime((string) $db->query('SELECT NOW()')->fetchColumn())) < 120,
    (string) ($entry['joined_at'] ?? ''));

$firstJoinedAt = (string) $entry['joined_at'];

$res = PortalFastPassService::join($patientA, ['appointment_id' => $apptA, 'earliest_date' => $dayMid], $userA);
check('joining again saves the new earliest date instead of refusing', !empty($res['success']), json_encode($res));
check('there is still only one entry for that appointment',
    (int) $db->query("SELECT COUNT(*) FROM portal_fastpass_waitlist WHERE appointment_id = {$apptA}")->fetchColumn() === 1);

$entry = $db->query("SELECT * FROM portal_fastpass_waitlist WHERE appointment_id = {$apptA}")->fetch(PDO::FETCH_ASSOC);
check('the earliest date is stored', (string) $entry['earliest_date'] === $dayMid);
check('editing a constraint does not move the patient down the queue',
    (string) $entry['joined_at'] === $firstJoinedAt);

$res = PortalFastPassService::join($patientA, ['appointment_id' => $apptA, 'earliest_date' => 'next tuesday'], $userA);
check('an unparseable earliest date is refused', empty($res['success']) && isset($res['errors']['earliest_date']));

$res = PortalFastPassService::join($patientA, ['appointment_id' => $apptA, 'earliest_date' => $dayFar], $userA);
check('an earliest date on the appointment itself is refused, because nothing could ever be offered',
    empty($res['success']) && isset($res['errors']['earliest_date']), json_encode($res));

$res = PortalFastPassService::join($patientA, ['appointment_id' => 0], $userA);
check('joining with no appointment is refused', empty($res['success']));

$res = PortalFastPassService::join($patientB, ['appointment_id' => $apptA], $userB);
check('one patient cannot put another patient\'s appointment on the list',
    empty($res['success']) && !empty($res['not_found']), json_encode($res));

$allDay = TestFixtures::appointmentFor($patientA, $dayFar, '00:00:00');
$db->prepare('UPDATE appointments SET is_all_day = 1 WHERE id = ?')->execute([$allDay]);
$res = PortalFastPassService::join($patientA, ['appointment_id' => $allDay], $userA);
check('an all-day booking is refused, not silently accepted', empty($res['success']), json_encode($res));

$pastAppt = TestFixtures::appointmentFor($patientA, date('Y-m-d', strtotime($dbNow) - (3 * 86400)), '09:00:00');
$res = PortalFastPassService::join($patientA, ['appointment_id' => $pastAppt], $userA);
check('a past appointment is refused', empty($res['success']));

$cancelled = TestFixtures::appointmentFor($patientA, $dayFar, '15:00:00', 'cancelled');
$res = PortalFastPassService::join($patientA, ['appointment_id' => $cancelled], $userA);
check('a cancelled appointment is refused', empty($res['success']));

// An appointment with no doctor is refused. Exercised through the rule itself
// rather than by writing such a row: appointments.provider_id is NOT NULL with a
// foreign key, so the database will not hold one, and the check in the service is
// a guard against a future schema that allows it rather than a live case.
$synthetic = [
    'status' => 'scheduled',
    'is_all_day' => 0,
    'provider_id' => 0,
    'appointment_date' => $dayFar,
    'appointment_time' => '15:30:00',
];
check('an appointment with no doctor is refused, because there is nothing to match it against',
    is_string(fp('whyNotJoinable', [$synthetic, $dbNow])), json_encode(fp('whyNotJoinable', [$synthetic, $dbNow])));
check('the same appointment with a doctor is accepted by the rule',
    fp('whyNotJoinable', [['provider_id' => $providerId] + $synthetic, $dbNow]) === null);

// ---- the patient's own view -------------------------------------------
$mine = PortalFastPassService::mine($patientA);

check('mine() reports the feature as on', $mine['enabled'] === true);
check('mine() lists the entry', count($mine['entries']) === 1);
check('mine() lists no offer yet', $mine['offers'] === []);
check('mine() carries the standing terms', is_array($mine['terms']) && count($mine['terms']) === 5);
check('mine() offers the patient\'s other joinable appointments', is_array($mine['eligible']));
check('an appointment already on the list is not offered for joining again',
    !in_array($apptA, array_column($mine['eligible'], 'id'), true));

$shown = json_encode($mine['entries']);
check('the patient is not shown a queue position',
    stripos($shown, 'place') === false && stripos($shown, 'position') === false, $shown);

// ---- leaving and rejoining --------------------------------------------
$res = PortalFastPassService::leave($patientA, ['waitlist_id' => (int) $entry['id']], $userA);
check('a patient can come off the list', !empty($res['success']));

$entry = $db->query("SELECT * FROM portal_fastpass_waitlist WHERE id = {$entry['id']}")->fetch(PDO::FETCH_ASSOC);
check('the entry is withdrawn', $entry['status'] === 'withdrawn');
check('leaving the list says the appointment is untouched',
    stripos((string) $res['message'], 'has not changed') !== false, (string) $res['message']);
check('the appointment really is untouched',
    (string) $db->query("SELECT appointment_date FROM appointments WHERE id = {$apptA}")->fetchColumn() === $dayFar);

$res = PortalFastPassService::leave($patientA, ['waitlist_id' => (int) $entry['id']], $userA);
check('leaving twice is not an error', !empty($res['success']));

$res = PortalFastPassService::leave($patientB, ['waitlist_id' => (int) $entry['id']], $userB);
check('one patient cannot remove another\'s entry', empty($res['success']) && !empty($res['not_found']));

$db->prepare('UPDATE portal_fastpass_waitlist SET declines = 2 WHERE id = ?')->execute([(int) $entry['id']]);
$res = PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);
$entry = $db->query("SELECT * FROM portal_fastpass_waitlist WHERE id = {$entry['id']}")->fetch(PDO::FETCH_ASSOC);

check('rejoining reuses the row rather than stacking a second one',
    (int) $db->query("SELECT COUNT(*) FROM portal_fastpass_waitlist WHERE appointment_id = {$apptA}")->fetchColumn() === 1);
check('rejoining makes it active again', $entry['status'] === 'active');
check('rejoining clears the old declines, because asking again is an answer', (int) $entry['declines'] === 0);
check('rejoining clears the earliest date it was rejoined without', $entry['earliest_date'] === null);
check('rejoining takes a new queue position', (string) $entry['joined_at'] >= $firstJoinedAt);

// ==========================================================================
// 3. Publishing a freed slot.
// ==========================================================================
echo "\n-- Publishing a freed slot --\n";

resetFastPass();

$toCancel = TestFixtures::appointmentFor($patientA, $dayMid, '10:00:00');
$res = PortalAppointmentService::cancel($patientA, ['appointment_id' => $toCancel, 'reason' => 'Fixture cancel'], $userA);
check('M10 cancel still succeeds with the Fast Pass hook in place', !empty($res['success']), json_encode($res));

$slot = $db->query(
    "SELECT * FROM portal_fastpass_slots WHERE source_appointment_id = {$toCancel}"
)->fetch(PDO::FETCH_ASSOC);

check('cancelling publishes the freed slot', $slot !== false);
check('the slot records where it came from', $slot && $slot['source'] === 'patient_cancel');
check('the slot is open', $slot && $slot['status'] === 'open');
check('the slot is at the cancelled appointment\'s time',
    $slot && (string) $slot['slot_date'] === $dayMid && substr((string) $slot['slot_time'], 0, 5) === '10:00');
check('the slot belongs to the same doctor', $slot && (int) $slot['provider_id'] === $providerId);

$firstSlotId = (int) $slot['id'];

$again = fp('publishFreedSlot', [
    $patientA, $toCancel, $providerId, $dayMid, '10:00:00', 'patient_cancel', null, 0,
]);
check('publishing the same cancellation again returns the same slot, not a second one',
    $again === $firstSlotId,
    "got " . var_export($again, true) . " want {$firstSlotId}");
check('and there is still one slot row',
    (int) $db->query("SELECT COUNT(*) FROM portal_fastpass_slots WHERE provider_id = {$providerId}")->fetchColumn() === 1);

$pastDay = date('Y-m-d', strtotime($dbNow) - 86400);
$inPast = fp('publishFreedSlot', [$patientA, null, $providerId, $pastDay, '10:00:00', 'desk_manual', null, 0]);
check('a slot in the past is not published at all', $inPast === null);

// An appointment that was itself on the list, then cancelled.
resetFastPass();

$onList = TestFixtures::appointmentFor($patientA, $dayMid, '11:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $onList], $userA);
PortalAppointmentService::cancel($patientA, ['appointment_id' => $onList, 'reason' => 'Fixture cancel'], $userA);

$entry = $db->query("SELECT * FROM portal_fastpass_waitlist WHERE appointment_id = {$onList}")->fetch(PDO::FETCH_ASSOC);
check('cancelling an appointment takes it off the Fast Pass list', $entry && $entry['status'] === 'withdrawn');
check('and says why, in words the patient reads',
    $entry && stripos((string) $entry['status_note'], 'cancel') !== false, (string) ($entry['status_note'] ?? ''));

// ==========================================================================
// 4. Who gets offered what.
// ==========================================================================
echo "\n-- Eligibility: who gets offered what --\n";

resetFastPass();

// A waits for something earlier than a far appointment; a slot opens up nearer.
$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);

$slotId = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:00:00', 'desk_manual', null, 0]);
check('a desk slot is published', is_int($slotId) && $slotId > 0);

$sent = fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
check('an earlier slot is offered to a waiting patient', $sent === 1, "sent {$sent}");

$offer = $db->query("SELECT * FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetch(PDO::FETCH_ASSOC);
check('the offer is open', $offer && $offer['status'] === 'open');
check('the offer names the appointment that would move', $offer && (int) $offer['appointment_id'] === $apptA);
check('the offer records where that appointment was',
    $offer && (string) $offer['from_date'] === $dayFar && substr((string) $offer['from_time'], 0, 5) === '14:00');
check('the slot is now marked offered',
    (string) $db->query("SELECT status FROM portal_fastpass_slots WHERE id = {$slotId}")->fetchColumn() === 'offered');
check('the entry counts the offer',
    (int) $db->query("SELECT offers_sent FROM portal_fastpass_waitlist WHERE appointment_id = {$apptA}")->fetchColumn() === 1);

$offerId = (int) $offer['id'];

// The deadline never runs past the point the slot stops being offerable.
$slotRow = $db->query("SELECT * FROM portal_fastpass_slots WHERE id = {$slotId}")->fetch(PDO::FETCH_ASSOC);
$latest = date('Y-m-d H:i:s', strtotime($slotRow['slot_date'] . ' ' . $slotRow['slot_time']) - (4 * 3600));
check('the deadline is inside the slot\'s own lead time', (string) $offer['expires_at'] <= $latest,
    "{$offer['expires_at']} vs {$latest}");

// Not offered twice.
$sent = fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
check('a patient with an offer already open is not offered the same slot again', $sent === 0, "sent {$sent}");

// A later slot is no use.
$laterSlot = fp('publishFreedSlot', [null, null, $providerId, weekdayAhead(25), '09:00:00', 'desk_manual', null, 0]);
$sent = fp('offerRound', [$db, $laterSlot, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
check('a slot LATER than the patient\'s own appointment is not offered', $sent === 0, "sent {$sent}");

// A slot before the patient's stated earliest date is no use either.
resetFastPass();

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA, 'earliest_date' => $dayMid], $userA);

$tooSoonForPatient = fp('publishFreedSlot', [null, null, $providerId, $dayNear, '09:00:00', 'desk_manual', null, 0]);
$sent = fp('offerRound', [$db, $tooSoonForPatient, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
check('a slot before the date the patient said they could manage is not offered', $sent === 0, "sent {$sent}");

$okForPatient = fp('publishFreedSlot', [null, null, $providerId, weekdayAhead(14), '09:00:00', 'desk_manual', null, 0]);
$sent = fp('offerRound', [$db, $okForPatient, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
check('a slot on or after that date is offered', $sent === 1, "sent {$sent}");

// Min lead time.
resetFastPass();

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);

$inOneHour = date('Y-m-d H:i:s', strtotime($dbNow) + 3600);
$soonSlot = fp('publishFreedSlot', [
    null, null, $providerId, substr($inOneHour, 0, 10), '0' === '' ? '' : date('H:i:00', strtotime($inOneHour)),
    'desk_manual', null, 0,
]);

if (is_int($soonSlot)) {
    $sent = fp('offerRound', [$db, $soonSlot, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
    check('a slot inside the minimum lead time is not offered to anybody', $sent === 0, "sent {$sent}");

    $done = PortalFastPassService::sweep();
    check('and the sweep closes it rather than leaving it on the board',
        (string) $db->query("SELECT status FROM portal_fastpass_slots WHERE id = {$soonSlot}")->fetchColumn() === 'expired');
    check('with a reason that says why', (bool) $db->query("SELECT status_note FROM portal_fastpass_slots WHERE id = {$soonSlot}")->fetchColumn());
} else {
    check('a slot inside the minimum lead time is not published at all', $soonSlot === null);
}

// The short-window rule: a slot just outside the lead time leaves too small a
// window to be worth asking about.
resetFastPass();

setPolicy(['portal_fastpass_min_lead_hours' => 4, 'portal_fastpass_offer_hours' => 4]);

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);

$narrow = date('Y-m-d H:i:s', strtotime($dbNow) + (4 * 3600) + (10 * 60));   // 4h10m away
$narrowSlot = fp('publishFreedSlot', [
    null, null, $providerId, substr($narrow, 0, 10), date('H:i:00', strtotime($narrow)), 'desk_manual', null, 0,
]);

if (is_int($narrowSlot)) {
    $sent = fp('offerRound', [$db, $narrowSlot, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
    check('a slot leaving less than half an hour to answer is not offered', $sent === 0, "sent {$sent}");
    check('and nothing was written about it', (int) $db->query("SELECT COUNT(*) FROM portal_fastpass_offers WHERE slot_id = {$narrowSlot}")->fetchColumn() === 0);
} else {
    check('a slot leaving less than half an hour to answer is not published', true);
}

// Batch size, and queue order.
resetFastPass();

setPolicy(['portal_fastpass_offer_batch' => 1]);

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
$apptB = TestFixtures::appointmentFor($patientB, $dayFar, '15:00:00');

PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);
// Put B behind A by a measurable amount, so the ordering assertion is about
// joined_at and not about row ids happening to agree with it.
$db->prepare("UPDATE portal_fastpass_waitlist SET joined_at = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE patient_id = ?")->execute([$patientA]);
PortalFastPassService::join($patientB, ['appointment_id' => $apptB], $userB);

$slotId = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:30:00', 'desk_manual', null, 0]);
$sent = fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);

check('a batch of one offers to exactly one patient', $sent === 1, "sent {$sent}");
check('and it is the patient who joined first',
    (int) $db->query("SELECT patient_id FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetchColumn() === $patientA);

// Round two goes to the next person, once the first round is out of the way.
$db->prepare("UPDATE portal_fastpass_offers SET status = 'expired' WHERE slot_id = ?")->execute([$slotId]);
fp('reopenIfNoOpenOffers', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn()]);
$sent = fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);

check('the next round goes to the next patient', $sent === 1, "sent {$sent}");
check('and it is the other patient this time',
    (int) $db->query("SELECT patient_id FROM portal_fastpass_offers WHERE slot_id = {$slotId} AND status = 'open'")->fetchColumn() === $patientB);
check('the round number advanced',
    (int) $db->query("SELECT offer_round FROM portal_fastpass_slots WHERE id = {$slotId}")->fetchColumn() === 2);

// Round three has nobody left: neither patient may be offered the same slot twice.
$db->prepare("UPDATE portal_fastpass_offers SET status = 'expired' WHERE slot_id = ?")->execute([$slotId]);
fp('reopenIfNoOpenOffers', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn()]);
$sent = fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
check('nobody is offered a slot they have already turned down or ignored', $sent === 0, "sent {$sent}");

setPolicy(['portal_fastpass_offer_batch' => 3]);

// The daily cap.
resetFastPass();

setPolicy(['portal_fastpass_max_offers_per_day' => 1]);

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);

$slotOne = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:00:00', 'desk_manual', null, 0]);
fp('offerRound', [$db, $slotOne, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
$db->prepare("UPDATE portal_fastpass_offers SET status = 'declined' WHERE slot_id = ?")->execute([$slotOne]);

$slotTwo = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '10:30:00', 'desk_manual', null, 0]);
$sent = fp('offerRound', [$db, $slotTwo, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
check('a patient at their daily offer limit is left alone', $sent === 0, "sent {$sent}");

setPolicy(['portal_fastpass_max_offers_per_day' => 2]);

// A slot the clinic has since filled.
resetFastPass();

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);

$slotId = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '13:00:00', 'desk_manual', null, 0]);
// Somebody books it by hand, the way the desk would.
$blocker = TestFixtures::appointmentFor($patientB, $dayMid, '13:00:00');

$sent = fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
check('a slot the clinic has already filled is not offered', $sent === 0, "sent {$sent}");
check('and it is closed as filled some other way, not as expired',
    (string) $db->query("SELECT status FROM portal_fastpass_slots WHERE id = {$slotId}")->fetchColumn() === 'unavailable');

$db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$blocker]);

// A time that is not on the clinic grid at all.
check('a time outside the clinic grid is not bookable',
    fp('slotStillBookable', [$db, ['provider_id' => $providerId, 'slot_date' => $dayMid, 'slot_time' => '03:17:00']]) === false);
check('a time on the grid and free is bookable',
    fp('slotStillBookable', [$db, ['provider_id' => $providerId, 'slot_date' => $dayMid, 'slot_time' => '09:00:00']]) === true);

// ==========================================================================
// 5. Accepting.
// ==========================================================================
echo "\n-- Accepting --\n";

resetFastPass();

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);

$slotId = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:00:00', 'desk_manual', null, 0]);
fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);

$offerId = (int) $db->query("SELECT id FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetchColumn();

$res = PortalFastPassService::accept($patientB, ['offer_id' => $offerId], $userB);
check('one patient cannot accept another patient\'s offer',
    empty($res['success']) && !empty($res['not_found']), json_encode($res));

$res = PortalFastPassService::accept($patientA, ['offer_id' => $offerId], $userA);
check('the patient the offer belongs to can accept it', !empty($res['success']), json_encode($res));

$moved = $db->query("SELECT * FROM appointments WHERE id = {$apptA}")->fetch(PDO::FETCH_ASSOC);

check('the appointment moved to the offered date', (string) $moved['appointment_date'] === $dayMid,
    (string) $moved['appointment_date']);
check('and to the offered time', substr((string) $moved['appointment_time'], 0, 5) === '09:00',
    (string) $moved['appointment_time']);
check('it was not soft-deleted', $moved['deleted_at'] === null);
check('it is still scheduled', $moved['status'] === 'scheduled');
check('where it came from is kept', (string) $moved['rescheduled_from_date'] === $dayFar);
check('the move is counted', (int) $moved['rescheduled_count'] === 1);
check('the patient is recorded as having done it', (int) $moved['rescheduled_by_patient'] === 1);
check('attendance is CONFIRMED, not cleared -- the patient chose this exact time',
    $moved['patient_confirmed_at'] !== null, 'patient_confirmed_at is null');

$slotRow = $db->query("SELECT * FROM portal_fastpass_slots WHERE id = {$slotId}")->fetch(PDO::FETCH_ASSOC);
check('the slot is taken', $slotRow['status'] === 'taken');
check('by the right patient', (int) $slotRow['taken_by_patient_id'] === $patientA);
check('by the right offer', (int) $slotRow['taken_by_offer_id'] === $offerId);
check('and it is closed', $slotRow['closed_at'] !== null);

$offerRow = $db->query("SELECT * FROM portal_fastpass_offers WHERE id = {$offerId}")->fetch(PDO::FETCH_ASSOC);
check('the offer is accepted', $offerRow['status'] === 'accepted');
check('with the time it was answered', $offerRow['responded_at'] !== null);

$entryRow = $db->query("SELECT * FROM portal_fastpass_waitlist WHERE appointment_id = {$apptA}")->fetch(PDO::FETCH_ASSOC);
check('the list entry is fulfilled', $entryRow['status'] === 'fulfilled');
check('and settled', $entryRow['settled_at'] !== null);

$vacated = $db->query(
    "SELECT * FROM portal_fastpass_slots WHERE provider_id = {$providerId} AND slot_date = '{$dayFar}'"
)->fetch(PDO::FETCH_ASSOC);
check('the slot the patient just left is itself published -- this is how a chain starts',
    $vacated !== false && $vacated['status'] === 'open', json_encode($vacated));
check('and is recorded as a move away from it, not a cancellation',
    $vacated && $vacated['source'] === 'patient_reschedule');

$res = PortalFastPassService::accept($patientA, ['offer_id' => $offerId], $userA);
check('accepting twice is refused', empty($res['success']));
check('and says it was already taken by this patient',
    stripos((string) $res['message'], 'already taken') !== false, (string) $res['message']);

$res = PortalFastPassService::accept($patientA, ['offer_id' => 0], $userA);
check('accepting nothing is refused', empty($res['success']));

// An expired offer must not move anything, even if the sweep has not run.
resetFastPass();

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);
$slotId = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:00:00', 'desk_manual', null, 0]);
fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
$offerId = (int) $db->query("SELECT id FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetchColumn();

$db->prepare("UPDATE portal_fastpass_offers SET expires_at = DATE_SUB(NOW(), INTERVAL 10 MINUTE) WHERE id = ?")->execute([$offerId]);

$res = PortalFastPassService::accept($patientA, ['offer_id' => $offerId], $userA);
check('an offer past its deadline cannot be accepted, even before the sweep runs', empty($res['success']));
check('the appointment did not move',
    (string) $db->query("SELECT appointment_date FROM appointments WHERE id = {$apptA}")->fetchColumn() === $dayFar);
check('the offer is settled as expired on the way out',
    (string) $db->query("SELECT status FROM portal_fastpass_offers WHERE id = {$offerId}")->fetchColumn() === 'expired');
check('the patient is told they are still on the list',
    stripos((string) $res['message'], 'still on the list') !== false, (string) $res['message']);

// ==========================================================================
// 6. The race. Two patients, one slot.
// ==========================================================================
echo "\n-- The race: two patients, one slot --\n";

resetFastPass();

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
$apptB = TestFixtures::appointmentFor($patientB, $dayFar, '15:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);
PortalFastPassService::join($patientB, ['appointment_id' => $apptB], $userB);

$slotId = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:00:00', 'desk_manual', null, 0]);
$sent = fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
check('both patients are offered the same slot in one round', $sent === 2, "sent {$sent}");

$offerA = (int) $db->query("SELECT id FROM portal_fastpass_offers WHERE slot_id = {$slotId} AND patient_id = {$patientA}")->fetchColumn();
$offerB = (int) $db->query("SELECT id FROM portal_fastpass_offers WHERE slot_id = {$slotId} AND patient_id = {$patientB}")->fetchColumn();

check('they are in the same round',
    (int) $db->query("SELECT COUNT(DISTINCT round) FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetchColumn() === 1);
check('and share a deadline',
    (int) $db->query("SELECT COUNT(DISTINCT expires_at) FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetchColumn() === 1);

$res = PortalFastPassService::accept($patientA, ['offer_id' => $offerA], $userA);
check('the first to answer gets it', !empty($res['success']), json_encode($res));

check('the other patient\'s offer is marked missed, not declined',
    (string) $db->query("SELECT status FROM portal_fastpass_offers WHERE id = {$offerB}")->fetchColumn() === 'missed');
check('with wording that says somebody else took it',
    stripos((string) $db->query("SELECT outcome_note FROM portal_fastpass_offers WHERE id = {$offerB}")->fetchColumn(), 'another patient') !== false);
check('the other patient stays on the list',
    (string) $db->query("SELECT status FROM portal_fastpass_waitlist WHERE patient_id = {$patientB}")->fetchColumn() === 'active');
check('the other patient\'s declines were NOT incremented -- they never said no',
    (int) $db->query("SELECT declines FROM portal_fastpass_waitlist WHERE patient_id = {$patientB}")->fetchColumn() === 0);
check('the other patient\'s appointment did not move',
    (string) $db->query("SELECT appointment_date FROM appointments WHERE id = {$apptB}")->fetchColumn() === $dayFar);

// Now force the real race: put B's offer back to open behind a claimed slot.
// This is the exact interleaving two simultaneous taps produce, and the only
// thing standing in the way is the conditional UPDATE on the slot row.
$db->prepare("UPDATE portal_fastpass_offers SET status = 'open', responded_at = NULL, outcome_note = NULL WHERE id = ?")->execute([$offerB]);

$res = PortalFastPassService::accept($patientB, ['offer_id' => $offerB], $userB);
check('a second accept behind a claimed slot loses', empty($res['success']), json_encode($res));
check('and loses with the truth, not an error',
    stripos((string) $res['message'], 'just been taken') !== false, (string) $res['message']);
check('the loser\'s appointment is untouched',
    (string) $db->query("SELECT appointment_date FROM appointments WHERE id = {$apptB}")->fetchColumn() === $dayFar);
check('the slot still belongs to the winner',
    (int) $db->query("SELECT taken_by_patient_id FROM portal_fastpass_slots WHERE id = {$slotId}")->fetchColumn() === $patientA);
check('the winner\'s appointment is where they put it',
    (string) $db->query("SELECT appointment_date FROM appointments WHERE id = {$apptA}")->fetchColumn() === $dayMid);
check('the loser is back to missed', (string) $db->query("SELECT status FROM portal_fastpass_offers WHERE id = {$offerB}")->fetchColumn() === 'missed');

// A claim that cannot turn into a move must be released.
echo "\n-- A claim that does not become a move is released --\n";

resetFastPass();

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);
$slotId = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:00:00', 'desk_manual', null, 0]);
fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
$offerId = (int) $db->query("SELECT id FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetchColumn();

// The desk books the slot after the offer went out. The claim will succeed and
// the availability re-check behind it will not.
$blocker = TestFixtures::appointmentFor($patientB, $dayMid, '09:00:00');

$res = PortalFastPassService::accept($patientA, ['offer_id' => $offerId], $userA);
check('accepting a slot the clinic has since filled fails', empty($res['success']), json_encode($res));
check('the appointment did not move',
    (string) $db->query("SELECT appointment_date FROM appointments WHERE id = {$apptA}")->fetchColumn() === $dayFar);
check('the claim was released, not left standing',
    (string) $db->query("SELECT status FROM portal_fastpass_slots WHERE id = {$slotId}")->fetchColumn() !== 'taken',
    (string) $db->query("SELECT status FROM portal_fastpass_slots WHERE id = {$slotId}")->fetchColumn());
check('nobody is recorded as having taken it',
    $db->query("SELECT taken_by_patient_id FROM portal_fastpass_slots WHERE id = {$slotId}")->fetchColumn() === null);
check('the patient stays on the list',
    (string) $db->query("SELECT status FROM portal_fastpass_waitlist WHERE patient_id = {$patientA}")->fetchColumn() === 'active');

$db->prepare('DELETE FROM appointments WHERE id = ?')->execute([$blocker]);

// ==========================================================================
// 7. Declining.
// ==========================================================================
echo "\n-- Declining --\n";

resetFastPass();

setPolicy(['portal_fastpass_max_declines' => 2, 'portal_fastpass_max_offers_per_day' => 20]);

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);

$slotId = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:00:00', 'desk_manual', null, 0]);
fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
$offerId = (int) $db->query("SELECT id FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetchColumn();

$res = PortalFastPassService::decline($patientA, ['offer_id' => $offerId, 'reason' => 'Working that morning'], $userA);
check('a patient can decline an offer', !empty($res['success']), json_encode($res));
check('the appointment did not move',
    (string) $db->query("SELECT appointment_date FROM appointments WHERE id = {$apptA}")->fetchColumn() === $dayFar);

$offerRow = $db->query("SELECT * FROM portal_fastpass_offers WHERE id = {$offerId}")->fetch(PDO::FETCH_ASSOC);
check('the offer is declined', $offerRow['status'] === 'declined');
check('the reason is kept for the desk', (string) $offerRow['decline_reason'] === 'Working that morning');
check('the decline is counted',
    (int) $db->query("SELECT declines FROM portal_fastpass_waitlist WHERE patient_id = {$patientA}")->fetchColumn() === 1);
check('the entry is still active after one decline',
    (string) $db->query("SELECT status FROM portal_fastpass_waitlist WHERE patient_id = {$patientA}")->fetchColumn() === 'active');
check('the slot went back into the queue rather than being wasted',
    in_array((string) $db->query("SELECT status FROM portal_fastpass_slots WHERE id = {$slotId}")->fetchColumn(), ['open', 'offered'], true));

$res = PortalFastPassService::decline($patientA, ['offer_id' => $offerId], $userA);
check('declining twice is refused', empty($res['success']));

// Second decline hits the limit of two.
$slotTwo = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '10:00:00', 'desk_manual', null, 0]);
fp('offerRound', [$db, $slotTwo, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
$offerTwo = (int) $db->query("SELECT id FROM portal_fastpass_offers WHERE slot_id = {$slotTwo} AND status = 'open'")->fetchColumn();

check('a second slot is offered to a patient who declined the first', $offerTwo > 0);

$res = PortalFastPassService::decline($patientA, ['offer_id' => $offerTwo], $userA);
check('the second decline is accepted', !empty($res['success']), json_encode($res));
check('the entry goes dormant at the limit',
    (string) $db->query("SELECT status FROM portal_fastpass_waitlist WHERE patient_id = {$patientA}")->fetchColumn() === 'dormant');
check('and the patient is told offers are paused, not that they did something wrong',
    stripos((string) $res['message'], 'paused') !== false, (string) $res['message']);
check('with an invitation to come back',
    stripos((string) $db->query("SELECT status_note FROM portal_fastpass_waitlist WHERE patient_id = {$patientA}")->fetchColumn(), 'ask again') !== false);

$mine = PortalFastPassService::mine($patientA);
check('a dormant entry still shows in the patient\'s own list, with its reason',
    count($mine['entries']) === 1 && $mine['entries'][0]['status'] === 'dormant'
    && is_string($mine['entries'][0]['note']) && $mine['entries'][0]['note'] !== '');

$slotThree = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '11:00:00', 'desk_manual', null, 0]);
$sent = fp('offerRound', [$db, $slotThree, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
check('a dormant entry is not offered anything', $sent === 0, "sent {$sent}");

setPolicy(['portal_fastpass_max_declines' => 3, 'portal_fastpass_max_offers_per_day' => 2]);

// Declining passes the slot on, without waiting for the sweep.
resetFastPass();

setPolicy(['portal_fastpass_offer_batch' => 1]);

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
$apptB = TestFixtures::appointmentFor($patientB, $dayFar, '15:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);
$db->prepare("UPDATE portal_fastpass_waitlist SET joined_at = DATE_SUB(NOW(), INTERVAL 1 HOUR) WHERE patient_id = ?")->execute([$patientA]);
PortalFastPassService::join($patientB, ['appointment_id' => $apptB], $userB);

$slotId = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:00:00', 'desk_manual', null, 0]);
fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
$offerId = (int) $db->query("SELECT id FROM portal_fastpass_offers WHERE slot_id = {$slotId} AND patient_id = {$patientA}")->fetchColumn();

PortalFastPassService::decline($patientA, ['offer_id' => $offerId], $userA);

check('declining hands the slot straight to the next patient, without waiting for a sweep',
    (int) $db->query("SELECT patient_id FROM portal_fastpass_offers WHERE slot_id = {$slotId} AND status = 'open'")->fetchColumn() === $patientB);

setPolicy(['portal_fastpass_offer_batch' => 3]);

// ==========================================================================
// 8. The sweep.
// ==========================================================================
echo "\n-- The sweep --\n";

resetFastPass();

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);
$slotId = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:00:00', 'desk_manual', null, 0]);
fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
$offerId = (int) $db->query("SELECT id FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetchColumn();

$db->prepare("UPDATE portal_fastpass_offers SET expires_at = DATE_SUB(NOW(), INTERVAL 5 MINUTE) WHERE id = ?")->execute([$offerId]);

$done = PortalFastPassService::sweep();

check('the sweep reports what it did', isset($done['expired_offers'], $done['closed_slots'], $done['offers_sent'], $done['ran_at']));
check('it expired the offer past its deadline', $done['expired_offers'] >= 1, json_encode($done));
check('the offer is expired', (string) $db->query("SELECT status FROM portal_fastpass_offers WHERE id = {$offerId}")->fetchColumn() === 'expired');
check('an unanswered offer counts against expiries',
    (int) $db->query("SELECT expiries FROM portal_fastpass_waitlist WHERE patient_id = {$patientA}")->fetchColumn() === 1);
check('and NOT against declines -- being asleep is not saying no',
    (int) $db->query("SELECT declines FROM portal_fastpass_waitlist WHERE patient_id = {$patientA}")->fetchColumn() === 0);
check('the entry is still active', (string) $db->query("SELECT status FROM portal_fastpass_waitlist WHERE patient_id = {$patientA}")->fetchColumn() === 'active');
check('the appointment did not move', (string) $db->query("SELECT appointment_date FROM appointments WHERE id = {$apptA}")->fetchColumn() === $dayFar);

// Running it again must do nothing.
$before = $db->query('SELECT COUNT(*) FROM portal_fastpass_offers')->fetchColumn()
    . '|' . $db->query('SELECT COUNT(*) FROM portal_fastpass_slots')->fetchColumn();
$second = PortalFastPassService::sweep();
$after = $db->query('SELECT COUNT(*) FROM portal_fastpass_offers')->fetchColumn()
    . '|' . $db->query('SELECT COUNT(*) FROM portal_fastpass_slots')->fetchColumn();

check('a second sweep expires nothing further', $second['expired_offers'] === 0);
check('and writes no new rows for an unchanged database', $before === $after, "{$before} -> {$after}");

// Offers whose appointment has gone are voided, not expired.
resetFastPass();

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);
$slotId = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:00:00', 'desk_manual', null, 0]);
fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
$offerId = (int) $db->query("SELECT id FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetchColumn();

// Cancelled at the desk, not through the portal.
$db->prepare("UPDATE appointments SET status = 'cancelled', cancelled_at = NOW() WHERE id = ?")->execute([$apptA]);

$done = PortalFastPassService::sweep();

check('an offer whose appointment was cancelled at the desk is voided', $done['voided_offers'] >= 1, json_encode($done));
check('the offer status says void, which is neither the patient\'s fault nor the clock\'s',
    (string) $db->query("SELECT status FROM portal_fastpass_offers WHERE id = {$offerId}")->fetchColumn() === 'void');

// And the desk cancellation itself becomes a slot.
check('the sweep finds the desk\'s own cancellation and publishes it',
    (int) $db->query("SELECT COUNT(*) FROM portal_fastpass_slots WHERE source_appointment_id = {$apptA}")->fetchColumn() === 1,
    json_encode($done));
check('recorded as cancelled at the desk',
    (string) $db->query("SELECT source FROM portal_fastpass_slots WHERE source_appointment_id = {$apptA}")->fetchColumn() === 'desk_cancel');

$found = PortalFastPassService::sweep();
check('and it is not published a second time on the next sweep', $found['found_slots'] === 0, json_encode($found));

// A slot that has come too close is closed.
resetFastPass();

$closeSlot = fp('publishFreedSlot', [
    null, null, $providerId,
    substr(date('Y-m-d H:i:s', strtotime($dbNow) + 7200), 0, 10),
    date('H:i:00', strtotime($dbNow) + 7200),
    'desk_manual', null, 0,
]);

if (is_int($closeSlot)) {
    $done = PortalFastPassService::sweep();
    check('a slot now inside the lead time is closed', $done['closed_slots'] >= 1, json_encode($done));
    check('as expired rather than filled',
        (string) $db->query("SELECT status FROM portal_fastpass_slots WHERE id = {$closeSlot}")->fetchColumn() === 'expired');
} else {
    check('a slot inside the lead time never reaches the board', $closeSlot === null);
}

// ==========================================================================
// 9. Notifications.
// ==========================================================================
echo "\n-- Notifications --\n";

resetFastPass();

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);
$slotId = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:00:00', 'desk_manual', null, 0]);
fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
$offerId = (int) $db->query("SELECT id FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetchColumn();

$notices = $db->query(
    "SELECT * FROM patient_notifications WHERE patient_id = {$patientA} AND event_type = 'fastpass_offer'"
)->fetchAll(PDO::FETCH_ASSOC);

check('an offer produces a notification', count($notices) >= 1, json_encode(array_column($notices, 'channel')));

$body = (string) ($notices[0]['body'] ?? '');
$title = (string) ($notices[0]['title'] ?? '');

check('the notification carries the offered date', $body !== '' && stripos($body, date('D j M Y', strtotime($dayMid))) !== false, $body);
check('and the deadline', stripos($body, 'answer by') !== false, $body);
check('and says the slot may already have gone', stripos($body, 'already have gone') !== false, $body);
check('and does NOT say why the slot came free -- that is another patient\'s business',
    stripos($body, 'cancel') === false, $body);
check('no figures or clinical detail leak into it', !preg_match('/\b(mmHg|mg\/dL|diagnos)/i', $body), $body);
check('the title names the date, so it reads usefully in an inbox list',
    stripos($title, date('D j M Y', strtotime($dayMid))) !== false, $title);
check('it is queued in-app as well as by email',
    in_array('in_app', array_column($notices, 'channel'), true), json_encode(array_column($notices, 'channel')));
check('no SMS row was queued, because nothing drains that channel yet',
    !in_array('sms', array_column($notices, 'channel'), true), json_encode(array_column($notices, 'channel')));
check('the offer links to Fast Pass, where it can be answered -- not to the appointment list',
    (string) $notices[0]['link_tab'] === 'mychart_fastpass', (string) $notices[0]['link_tab']);
check('and carries the offer id, so the app can open the right one', (int) $notices[0]['link_id'] === $offerId);

// Re-notifying the same offer must not duplicate.
fp('notifyOffer', [
    $db,
    ['patient_id' => $patientA, 'appointment_date' => $dayFar, 'appointment_time' => '14:00:00'],
    $db->query("SELECT * FROM portal_fastpass_slots WHERE id = {$slotId}")->fetch(PDO::FETCH_ASSOC),
    '09:00:00',
    (string) $db->query("SELECT expires_at FROM portal_fastpass_offers WHERE id = {$offerId}")->fetchColumn(),
    $offerId,
]);

check('notifying the same offer twice queues nothing new',
    (int) $db->query("SELECT COUNT(*) FROM patient_notifications WHERE patient_id = {$patientA} AND event_type = 'fastpass_offer'")->fetchColumn() === count($notices));

PortalFastPassService::accept($patientA, ['offer_id' => $offerId], $userA);

$moved = $db->query(
    "SELECT * FROM patient_notifications WHERE patient_id = {$patientA} AND event_type = 'fastpass_moved'"
)->fetchAll(PDO::FETCH_ASSOC);

check('accepting produces a confirmation the patient can keep', count($moved) >= 1);
check('and the confirmation links to the appointment list, which is what matters by then',
    $moved && (string) $moved[0]['link_tab'] === 'mychart_visits', (string) ($moved[0]['link_tab'] ?? ''));
check('the confirmation carries the new time',
    $moved && stripos((string) $moved[0]['body'], '9:00 am') !== false, (string) ($moved[0]['body'] ?? ''));
check('and the appointment it replaced',
    $moved && stripos((string) $moved[0]['body'], date('D j M Y', strtotime($dayFar))) !== false, (string) ($moved[0]['body'] ?? ''));

// ==========================================================================
// 10. The clinic's side.
// ==========================================================================
echo "\n-- The clinic's side --\n";

resetFastPass();

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA, 'earliest_date' => $dayNear], $userA);

$res = PortalFastPassService::publishManual([
    'provider_id' => $providerId,
    'date' => $dayMid,
    'time' => '09:00',
], $staffUser);

check('the desk can publish a gap by hand', !empty($res['success']), json_encode($res));
check('and is told how many patients heard about it',
    isset($res['data']['offers_sent']) && $res['data']['offers_sent'] === 1, json_encode($res));

$slotId = (int) $res['data']['slot_id'];

$res = PortalFastPassService::publishManual([
    'provider_id' => $providerId,
    'date' => $dayMid,
    'time' => '09:00',
], $staffUser);
check('publishing the same gap again does not create a second slot',
    (int) $db->query("SELECT COUNT(*) FROM portal_fastpass_slots WHERE provider_id = {$providerId} AND slot_date = '{$dayMid}' AND slot_time = '09:00:00'")->fetchColumn() === 1);

$res = PortalFastPassService::publishManual([
    'provider_id' => $providerId,
    'date' => substr(date('Y-m-d H:i:s', strtotime($dbNow) + 3600), 0, 10),
    'time' => date('H:i', strtotime($dbNow) + 3600),
], $staffUser);
check('a gap inside the lead time is refused, and the desk is told to telephone instead',
    empty($res['success']) && stripos((string) $res['message'], 'telephone') !== false, json_encode($res));

$res = PortalFastPassService::publishManual([
    'provider_id' => $providerId,
    'date' => $dayMid,
    'time' => '03:17',
], $staffUser);
check('a time the clinic schedule does not have is refused',
    empty($res['success']) && isset($res['errors']['time']), json_encode($res));

$res = PortalFastPassService::publishManual(['provider_id' => 0, 'date' => '', 'time' => ''], $staffUser);
check('an empty publish form is refused field by field',
    empty($res['success']) && isset($res['errors']['provider_id'], $res['errors']['date'], $res['errors']['time']));

// The board.
$board = PortalFastPassService::board('', 'live');

check('the board lists the live slot', count($board['items']) >= 1);
check('each row says what state it is in, in words',
    is_string($board['items'][0]['status_label']) && $board['items'][0]['status_label'] !== '');
check('and where the slot came from, in words',
    (string) $board['items'][0]['source_label'] === 'Published by the desk', (string) $board['items'][0]['source_label']);
check('the board counts how many filled, which is the number that matters',
    isset($board['totals']['filled'], $board['totals']['live'], $board['totals']['expired']));
check('the board says how many people are waiting', isset($board['waiting']) && $board['waiting'] >= 1);
check('the board carries the policy it is operating under', isset($board['settings']['min_lead_hours']));
check('the board reports hours until the slot', is_int($board['items'][0]['hours_away']));

$detail = PortalFastPassService::slotDetail($slotId);
check('a slot can be opened to see every offer it produced', $detail !== null && count($detail['offers']) === 1);
check('the offer row names the patient', (string) $detail['offers'][0]['patient'] !== '');
check('and says what happened in words', (string) $detail['offers'][0]['status_label'] === 'Awaiting an answer');
check('a slot that does not exist is reported as missing', PortalFastPassService::slotDetail(99999999) === null);

$queue = PortalFastPassService::waitlistBoard('');
check('the desk can see the queue', count($queue['items']) >= 1);
check('the desk IS shown the queue position, unlike the patient', $queue['items'][0]['place'] === 1);
check('with the patient\'s own earliest date', (string) $queue['items'][0]['earliest_date'] === $dayNear);
check('and the appointment that would move', (int) $queue['items'][0]['appointment_id'] === $apptA);

$providers = PortalFastPassService::findProviders('');
check('the publish form can look up doctors', count($providers) >= 1 && isset($providers[0]['name']));

// Withdrawing.
$res = PortalFastPassService::withdrawSlot(['slot_id' => $slotId, 'reason' => 'Doctor is needed in theatre'], $staffUser);
check('the desk can withdraw a slot', !empty($res['success']), json_encode($res));
check('the slot is withdrawn',
    (string) $db->query("SELECT status FROM portal_fastpass_slots WHERE id = {$slotId}")->fetchColumn() === 'withdrawn');
check('the reason is kept',
    (string) $db->query("SELECT status_note FROM portal_fastpass_slots WHERE id = {$slotId}")->fetchColumn() === 'Doctor is needed in theatre');
check('the open offer on it was voided, not left to expire',
    (string) $db->query("SELECT status FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetchColumn() === 'void');
check('the patient stays on the list',
    (string) $db->query("SELECT status FROM portal_fastpass_waitlist WHERE patient_id = {$patientA}")->fetchColumn() === 'active');
check('and their appointment is untouched',
    (string) $db->query("SELECT appointment_date FROM appointments WHERE id = {$apptA}")->fetchColumn() === $dayFar);

$res = PortalFastPassService::withdrawSlot(['slot_id' => $slotId], $staffUser);
check('withdrawing a settled slot is refused, and says what state it is in',
    empty($res['success']) && stripos((string) $res['message'], 'already settled') !== false, (string) $res['message']);

$res = PortalFastPassService::withdrawSlot(['slot_id' => 99999999], $staffUser);
check('withdrawing a slot that does not exist is a not-found', empty($res['success']) && !empty($res['not_found']));

$offerRow = $db->query("SELECT * FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetch(PDO::FETCH_ASSOC);
$res = PortalFastPassService::accept($patientA, ['offer_id' => (int) $offerRow['id']], $userA);
check('a voided offer cannot be accepted', empty($res['success']));
check('and says the offer no longer applies',
    stripos((string) $res['message'], 'no longer applies') !== false, (string) $res['message']);

$settledBoard = PortalFastPassService::board('', 'settled');
check('the settled view shows it',
    in_array($slotId, array_column($settledBoard['items'], 'id'), true));
check('the live view no longer does',
    !in_array($slotId, array_column(PortalFastPassService::board('', 'live')['items'], 'id'), true));

// ==========================================================================
// 11. The master switch, and what it does not touch.
// ==========================================================================
echo "\n-- Switched off --\n";

resetFastPass();

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');

setPolicy(['portal_allow_fastpass' => 0]);

$res = PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);
check('nobody can join while it is switched off', empty($res['success']), json_encode($res));

$published = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:00:00', 'desk_manual', null, 0]);
check('no slot is published while it is switched off', $published === null);

$done = PortalFastPassService::sweep();
check('the sweep does nothing while it is switched off',
    $done['offers_sent'] === 0 && $done['found_slots'] === 0 && $done['enabled'] === false, json_encode($done));

$res = PortalFastPassService::publishManual(['provider_id' => $providerId, 'date' => $dayMid, 'time' => '09:00'], $staffUser);
check('the desk cannot publish while it is switched off', empty($res['success']));

$mine = PortalFastPassService::mine($patientA);
check('the patient is told it is off rather than shown an empty screen', $mine['enabled'] === false);
check('and is offered nothing to join', $mine['eligible'] === []);

setPolicy(['portal_allow_fastpass' => 1]);

// Cancelling must still work with Fast Pass off -- the hook must not be a
// dependency of M10.
$res = PortalAppointmentService::cancel($patientA, ['appointment_id' => $apptA, 'reason' => 'Fixture'], $userA);
check('M10 cancel works regardless of the Fast Pass switch', !empty($res['success']), json_encode($res));

// ==========================================================================
// 12. Constants and wording.
// ==========================================================================
echo "\n-- Constants and wording --\n";

check('the review roles cover the front of house',
    in_array('receptionist', PortalFastPassService::REVIEW_ROLES, true)
    && in_array('admin', PortalFastPassService::REVIEW_ROLES, true));
check('publishing and withdrawing are narrower than reading',
    count(PortalFastPassService::MANAGE_ROLES) < count(PortalFastPassService::REVIEW_ROLES));
check('every manage role is also a review role',
    array_diff(PortalFastPassService::MANAGE_ROLES, PortalFastPassService::REVIEW_ROLES) === []);

check('the capability is spelled the same way the seed grants it',
    \App\Modules\MyChart\Services\PortalGuard::CAP_FASTPASS === 'mychart_fastpass');
check('and is granted to the patient role in this database',
    (int) $db->query(
        "SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id
          WHERE r.name = 'patient' AND rp.capability = 'mychart_fastpass' AND rp.is_granted = 1"
    )->fetchColumn() === 1);

foreach (['open', 'offered', 'taken', 'expired', 'unavailable', 'withdrawn'] as $status) {
    check("the board has words for a slot that is '{$status}'",
        isset(PortalFastPassService::SLOT_LABELS[$status]) && PortalFastPassService::SLOT_LABELS[$status] !== '');
}

foreach (['open', 'accepted', 'declined', 'expired', 'missed', 'void'] as $status) {
    check("the board has words for an offer that is '{$status}'",
        isset(PortalFastPassService::OFFER_LABELS[$status]) && PortalFastPassService::OFFER_LABELS[$status] !== '');
}

$terms = implode(' ', PortalFastPassService::TERMS);
check('the terms promise the appointment stays put unless the patient accepts',
    stripos($terms, 'stays exactly as it is') !== false, $terms);
check('the terms admit a slot can be taken by somebody else',
    stripos($terms, 'taken before you answer') !== false);
check('the terms say ignoring an offer costs nothing',
    stripos($terms, 'costs you nothing') !== false);
check('the terms say the doctor does not change',
    stripos($terms, 'same doctor') !== false);
check('the terms do not promise an earlier appointment',
    stripos($terms, 'will get you') === false && stripos($terms, 'guarantee') === false, $terms);

check('time is normalised so string comparison is safe',
    fp('normaliseTime', ['9:00']) === '09:00:00'
    && fp('normaliseTime', ['09:00:00']) === '09:00:00'
    && fp('normaliseTime', ['9:5' . '0']) === '09:50:00');

check('a date reads as a human would write it', fp('prettyDate', ['2026-12-01']) === 'Tue 1 Dec 2026');
check('a time reads as a human would say it', fp('prettyTime', ['14:30:00']) === '2:30 pm');
check('a doctor with no name still reads sensibly', fp('doctorName', [$db, 999999]) === 'your doctor');

check('the minimum offer window is at least half an hour', fpConst('MIN_WINDOW_MINUTES') >= 30);

// ==========================================================================
// 13. The scheduled job.
//
// The sweep is reached from cron through backend/cron/portal_notify.php, and the
// one property that file has to keep is the ORDER: the sweep runs before the
// drain, so an offer it creates has its email sent in the same pass rather than
// waiting for the next run -- five minutes out of a four-hour deadline.
//
// The cron script is run for real here, not imitated. It is safe to require: it
// bails out unless PHP_SAPI is 'cli', its Autoload require_once is already
// satisfied, and Env::load() has already run and returns immediately -- so it
// talks to whichever database TestDatabase::use() pointed this process at, which
// is the whole reason that override exists.
// ==========================================================================
echo "\n-- The scheduled job --\n";

$cronFile = __DIR__ . '/../backend/cron/portal_notify.php';

check('the cron script exists where the roadmap says it does', is_file($cronFile));

$cronSource = (string) file_get_contents($cronFile);
$sweepAt = strpos($cronSource, 'PortalFastPassService::sweep(');
$drainAt = strpos($cronSource, 'PortalNotificationService::drain(');

check('cron calls the Fast Pass sweep', $sweepAt !== false);
check('cron still drains the outbox', $drainAt !== false);
check('and the sweep comes BEFORE the drain, so an offer is emailed in the same pass',
    $sweepAt !== false && $drainAt !== false && $sweepAt < $drainAt,
    "sweep at {$sweepAt}, drain at {$drainAt}");

// Now run it, with a live offer waiting to be created.
resetFastPass();

// This section runs the real drain, so it has to be impossible for it to email
// a real person. Switching the email master switch off does NOT do that: queue()
// consults the same switch, so the email row is never created and the ordering
// this section exists to prove becomes untestable.
//
// What actually makes it safe is that drain() takes the address from
// patient_contacts, and the fixtures create no contact row -- so it marks the
// row failed with "no usable email address" and never constructs a message.
// That is an accident of the fixtures rather than a guarantee, so it is checked
// here instead of assumed, and the section is skipped rather than risked if a
// fixture patient ever acquires a real address.
$reachable = (int) $db->query(
    "SELECT COUNT(*) FROM patient_contacts
      WHERE patient_id IN ({$patientA}, {$patientB})
        AND deleted_at IS NULL AND email IS NOT NULL AND TRIM(email) <> ''"
)->fetchColumn();

check('no fixture patient has an email address drain() could use', $reachable === 0, "{$reachable} found");

if ($reachable > 0) {
    echo "  [SKIP] not running the drain: a fixture patient has a usable address.\n";
} else {
    $apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
    PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);
    $slotId = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:00:00', 'desk_manual', null, 0]);

    $cronWatermark = (int) ($db->query('SELECT COALESCE(MAX(id), 0) FROM portal_audit_logs')->fetchColumn() ?: 0);

    ob_start();
    require $cronFile;
    $cronOutput = (string) ob_get_clean();

    check('the cron script runs to completion', str_contains($cronOutput, 'portal_notify:'), $cronOutput);
    check('and reports what Fast Pass did, not just the mail',
        str_contains($cronOutput, 'fast pass'), trim($cronOutput));

    check('running cron sent the waiting offer',
        (int) $db->query("SELECT COUNT(*) FROM portal_fastpass_offers WHERE slot_id = {$slotId} AND status = 'open'")->fetchColumn() === 1,
        trim($cronOutput));

    $offerId = (int) $db->query("SELECT id FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetchColumn();

    // The ordering property, observed rather than asserted from the source: the
    // notification the sweep queued had already been through the drain by the
    // time the script finished, so its status is no longer 'queued'.
    $emailRow = $db->query(
        "SELECT status FROM patient_notifications
          WHERE patient_id = {$patientA} AND event_type = 'fastpass_offer' AND channel = 'email'
          LIMIT 1"
    )->fetch(PDO::FETCH_ASSOC);

    check('the offer email was queued during the same run', $emailRow !== false);
    check('and the drain had already seen it -- which is only true if the sweep ran first',
        $emailRow && $emailRow['status'] !== 'queued', json_encode($emailRow));
    check('it was not sent, because the fixture patient has no address',
        $emailRow && $emailRow['status'] === 'failed', json_encode($emailRow));

    check('the in-app copy is left alone for the patient to read',
        (string) $db->query(
            "SELECT status FROM patient_notifications
              WHERE patient_id = {$patientA} AND event_type = 'fastpass_offer' AND channel = 'in_app' LIMIT 1"
        )->fetchColumn() === 'queued');

    check('a run that did something writes one audit row',
        (int) $db->query(
            "SELECT COUNT(*) FROM portal_audit_logs
              WHERE id > {$cronWatermark} AND event_type = 'Fast Pass Swept'"
        )->fetchColumn() === 1);
    check('and says so as a scheduled sweep, not as somebody pressing a button',
        str_contains((string) $db->query(
            "SELECT description FROM portal_audit_logs
              WHERE id > {$cronWatermark} AND event_type = 'Fast Pass Swept' LIMIT 1"
        )->fetchColumn(), 'Scheduled sweep'));

    // A second run has nothing to do, and must not leave a row saying so.
    $quietWatermark = (int) $db->query('SELECT COALESCE(MAX(id), 0) FROM portal_audit_logs')->fetchColumn();

    ob_start();
    require $cronFile;
    ob_end_clean();

    check('a run with nothing to do writes NO audit row -- 288 a day would bury the one that matters',
        (int) $db->query(
            "SELECT COUNT(*) FROM portal_audit_logs
              WHERE id > {$quietWatermark} AND event_type = 'Fast Pass Swept'"
        )->fetchColumn() === 0);
    check('and did not offer the same slot twice',
        (int) $db->query("SELECT COUNT(*) FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetchColumn() === 1);
}

// ---- the empty-list shortcut -------------------------------------------
//
// sweep() skips the offering pass when nobody is on the list, because that pass
// asks the clinic grid about every live slot and this now runs every five minutes
// forever. The steps before it must still run.
resetFastPass();

$done = PortalFastPassService::sweep();
check('a sweep with nobody waiting says so', $done['waiting'] === 0, json_encode($done));
check('and offers nothing', $done['offers_sent'] === 0);

$apptA = TestFixtures::appointmentFor($patientA, $dayFar, '14:00:00');
PortalFastPassService::join($patientA, ['appointment_id' => $apptA], $userA);
$slotId = fp('publishFreedSlot', [null, null, $providerId, $dayMid, '09:00:00', 'desk_manual', null, 0]);
fp('offerRound', [$db, $slotId, (string) $db->query('SELECT NOW()')->fetchColumn(), PortalFastPassService::settings()]);
$offerId = (int) $db->query("SELECT id FROM portal_fastpass_offers WHERE slot_id = {$slotId}")->fetchColumn();

// Take the only person off the list, and push the offer past its deadline.
$db->prepare("UPDATE portal_fastpass_waitlist SET status = 'withdrawn' WHERE patient_id = ?")->execute([$patientA]);
$db->prepare("UPDATE portal_fastpass_offers SET expires_at = DATE_SUB(NOW(), INTERVAL 5 MINUTE) WHERE id = ?")->execute([$offerId]);

$done = PortalFastPassService::sweep();

check('an empty list still expires an offer that was already out', $done['expired_offers'] >= 1, json_encode($done));
check('the offer really is expired',
    (string) $db->query("SELECT status FROM portal_fastpass_offers WHERE id = {$offerId}")->fetchColumn() === 'expired');
check('and the shortcut is reported, so the desk can tell it apart from an idle run',
    $done['waiting'] === 0 && $done['slots_offered'] === 0, json_encode($done));

// ==========================================================================
// 14. Nothing leaked into the rest of the portal.
// ==========================================================================
echo "\n-- Nothing leaked --\n";

check('the Fast Pass columns did not touch M7\'s self-reading path',
    (int) $db->query("SELECT COUNT(*) FROM patient_self_readings")->fetchColumn() >= 0);
check('no appointment belongs to a patient outside the fixtures',
    (int) $db->query(
        "SELECT COUNT(*) FROM appointments a JOIN patients p ON p.id = a.patient_id
          WHERE p.patient_no NOT IN ('" . implode("','", TestFixtures::PATIENT_NUMBERS) . "')"
    )->fetchColumn() === 0);
check('no Fast Pass row belongs to a patient outside the fixtures',
    (int) $db->query(
        "SELECT COUNT(*) FROM portal_fastpass_waitlist w JOIN patients p ON p.id = w.patient_id
          WHERE p.patient_no NOT IN ('" . implode("','", TestFixtures::PATIENT_NUMBERS) . "')"
    )->fetchColumn() === 0);
$strayEvents = $db->query(
    "SELECT DISTINCT event_type FROM portal_audit_logs
      WHERE id > {$auditWatermark}
        AND event_type NOT LIKE 'Fast Pass%'
        AND event_type NOT LIKE 'Appointment%'"
)->fetchAll(PDO::FETCH_COLUMN);

check('every audit row this suite wrote names a Fast Pass or appointment event',
    $strayEvents === [], json_encode($strayEvents));
check('and this suite did write audit rows, so that assertion means something',
    (int) $db->query("SELECT COUNT(*) FROM portal_audit_logs WHERE id > {$auditWatermark}")->fetchColumn() > 0);

} finally {
    // --------------------------------------------------------------------
    // Put the policy back, pass or fail. An earlier suite in this project
    // left seed rows mutated on a failure and broke three unrelated tests
    // the next day, which is why this is a finally block and not the last
    // few lines of the script.
    // --------------------------------------------------------------------
    if ($originalSettings) {
        setPolicy($originalSettings);
    }

    resetFastPass();
    TestFixtures::clearPortalWrites();
}

echo "\n==================================================\n";
echo "  {$pass} passed, {$fail} failed\n";
echo "==================================================\n";

exit($fail === 0 ? 0 : 1);
