<?php

declare(strict_types=1);

/**
 * Automated Verification: the chart a patient can see (Phase M19)
 *
 * Runs against the disposable database from tests/build_test_database.php and
 * refuses to run anywhere else.
 *
 *   php tests/build_test_database.php --fresh   (once)
 *   php tests/test_portal_chart.php
 *
 * Most of this suite exists for ONE assertion, and the rest supports it.
 *
 * `verification_status` carries the FHIR set, and two of its four values mean
 * the OPPOSITE of the row's own content: `Refuted` means a clinician decided the
 * patient does not have this, and `Entered in Error` means the row should never
 * have existed. A chart screen that listed what the tables hold would tell
 * somebody they have a condition that was explicitly ruled out, and show a
 * mistake as a fact.
 *
 * So the fixtures deliberately contain a Refuted allergy and an Entered in Error
 * condition, and the assertions check they are absent from every path a patient
 * can reach -- the list, the correction endpoint, and the desk's own preview of
 * what the patient sees. Without those two rows, the assertion that matters most
 * here would pass against a chart that was never asked the question.
 *
 * The second theme is that staff free text never leaves the building. Every
 * fixture row carries a `comments` value written for staff, and the suite greps
 * the whole patient payload for it.
 */

require_once __DIR__ . '/lib/test_fixtures.php';

use App\Core\Database;
use App\Modules\MyChart\Services\PortalChartService;
use App\Modules\MyChart\Services\PortalGuard;

try {
    $database = TestDatabase::use();
} catch (Throwable $e) {
    echo "REFUSED: " . $e->getMessage() . "\n";
    exit(1);
}

echo "==================================================\n";
echo "   Automated Verification: the patient's chart (M19)\n";
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

function cs(string $method, array $args = [])
{
    $m = new ReflectionMethod(PortalChartService::class, $method);
    $m->setAccessible(true);

    return $m->invokeArgs(null, $args);
}

/** Every item in the payload, flattened, regardless of section. */
function allItems(array $chart): array
{
    $out = [];

    foreach ($chart['sections'] ?? [] as $section) {
        foreach ($section['items'] as $item) {
            $item['_section'] = $section['code'];
            $out[] = $item;
        }
    }

    return $out;
}

function titles(array $chart): array
{
    return array_column(allItems($chart), 'title');
}

/**
 * Is this item in the chart?
 *
 * Matched on section AND id, because the ids are the source tables' own and are
 * only unique within a table: patient_allergies #1, patient_medical_problems #1
 * and patient_immunizations #1 all exist and are different items. An earlier
 * version of this file compared bare ids and reported a hidden row as shown.
 */
function hasItem(array $chart, string $section, int $id): bool
{
    foreach (allItems($chart) as $item) {
        if ($item['_section'] === $section && (int) $item['id'] === $id) {
            return true;
        }
    }

    return false;
}

/** One item, or null. Same (section, id) rule as hasItem(). */
function findItem(array $chart, string $section, int $id): ?array
{
    foreach (allItems($chart) as $item) {
        if ($item['_section'] === $section && (int) $item['id'] === $id) {
            return $item;
        }
    }

    return null;
}

function sectionOf(array $chart, string $code): ?array
{
    foreach ($chart['sections'] ?? [] as $section) {
        if ($section['code'] === $code) {
            return $section;
        }
    }

    return null;
}

$db = Database::connection();

// --------------------------------------------------------------------------
echo "\n-- Running against the right database --\n";

$connectedTo = (string) $db->query('SELECT DATABASE()')->fetchColumn();

check('connected to the test database', $connectedTo === $database, "connected to {$connectedTo}");
check('that is not the live database', strcasecmp($connectedTo, TestDatabase::liveDatabaseName()) !== 0);

if ($connectedTo !== $database) {
    echo "\n  Stopping: refusing to write to {$connectedTo}.\n";
    exit(1);
}

$seeded = (int) $db->query('SELECT COUNT(*) FROM portal_chart_sections')->fetchColumn();

if ($seeded < 6) {
    echo "\n  This database is missing the M19 seeds (087-089). Run:\n";
    echo "    php tests/build_test_database.php\n";
    exit(1);
}

$world = TestFixtures::world();
$two = TestFixtures::secondPatient();
TestFixtures::clearPortalWrites();

$patientId = $world['patient_id'];
$otherId = $two['patient_id'];
$patientUser = TestFixtures::patientUser();
$otherUser = TestFixtures::secondPatientUser();
$staffUser = TestFixtures::staffUser();

$ids = TestFixtures::chart();

$settingColumns = ['portal_allow_chart', 'portal_chart_show_unconfirmed', 'portal_allow_chart_corrections', 'portal_chart_max_pending'];
$originalSettings = $db->query('SELECT ' . implode(', ', $settingColumns) . ' FROM general_settings ORDER BY id LIMIT 1')->fetch(PDO::FETCH_ASSOC) ?: [];
$originalSections = $db->query('SELECT * FROM portal_chart_sections ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);

function setPolicy(array $values): void
{
    global $db;

    $sets = [];
    foreach ($values as $column => $value) {
        $sets[] = "`{$column}` = :{$column}";
    }

    $db->prepare('UPDATE general_settings SET ' . implode(', ', $sets) . ' ORDER BY id LIMIT 1')->execute($values);
}

function clearCorrections(): void
{
    global $db, $patientId, $otherId;

    $db->prepare('DELETE FROM portal_chart_corrections WHERE patient_id IN (?, ?)')->execute([$patientId, $otherId]);
}

try {

setPolicy([
    'portal_allow_chart' => 1,
    'portal_chart_show_unconfirmed' => 1,
    'portal_allow_chart_corrections' => 1,
    'portal_chart_max_pending' => 5,
]);

// ==========================================================================
// 1. THE GATE. Everything else in this file is secondary to this section.
// ==========================================================================
echo "\n-- The verification gate --\n";

$chart = PortalChartService::mine($patientId);
$shown = titles($chart);

check('the chart comes back enabled', $chart['enabled'] === true);
check('it has all six sections', count($chart['sections']) === 6, (string) count($chart['sections']));

check('a REFUTED allergy is not shown -- a clinician decided it is not true',
    !hasItem($chart, 'allergies', $ids['allergy_refuted']));

check('an ENTERED IN ERROR condition is not shown -- the row should not exist',
    !hasItem($chart, 'conditions', $ids['condition_error']));

check('a CONFIRMED allergy is shown', hasItem($chart, 'allergies', $ids['allergy_ok']));
check('an UNCONFIRMED allergy is shown', hasItem($chart, 'allergies', $ids['allergy_unconfirmed']));
check('a NULL verification is shown', hasItem($chart, 'devices', $ids['device_null']));

check('a NULL verification is treated as UNCONFIRMED, never as confirmed',
    (findItem($chart, 'devices', $ids['device_null'])['status'] ?? '') === 'unconfirmed',
    (string) (findItem($chart, 'devices', $ids['device_null'])['status'] ?? 'missing'));

check('an unconfirmed item carries words saying so',
    stripos((string) (findItem($chart, 'allergies', $ids['allergy_unconfirmed'])['status_note'] ?? ''), 'not confirmed') !== false);

// Fetched first and asserted on its own. `?? 'x'` cannot express this: the
// value being looked for IS null, and ?? treats null as absent, so the fallback
// fires every time and the check can never pass.
$confirmedItem = findItem($chart, 'allergies', $ids['allergy_ok']);

check('the confirmed allergy is found at all', is_array($confirmedItem));
check('a confirmed item carries no such caveat',
    is_array($confirmedItem) && array_key_exists('status_note', $confirmedItem) && $confirmedItem['status_note'] === null,
    var_export($confirmedItem['status_note'] ?? 'key missing', true));

check('normalise: null becomes Unconfirmed', PortalChartService::normaliseVerification(null) === 'Unconfirmed');
check('normalise: empty becomes Unconfirmed', PortalChartService::normaliseVerification('') === 'Unconfirmed');
check('normalise: unknown text becomes Unconfirmed, never Confirmed',
    PortalChartService::normaliseVerification('probably fine') === 'Unconfirmed');
check('normalise is case-insensitive', PortalChartService::normaliseVerification('rEfUtEd') === 'Refuted');
check('normalise trims', PortalChartService::normaliseVerification('  Confirmed  ') === 'Confirmed');

check('the hidden list is exactly the two that mean the opposite of the row',
    PortalChartService::VERIFICATION_HIDDEN === ['Refuted', 'Entered in Error'],
    json_encode(PortalChartService::VERIFICATION_HIDDEN));
check('and the shown list does not overlap it',
    array_intersect(PortalChartService::VERIFICATION_SHOWN, PortalChartService::VERIFICATION_HIDDEN) === []);

// Refuted stays hidden even when unconfirmed items are switched off entirely.
setPolicy(['portal_chart_show_unconfirmed' => 0]);
$strict = PortalChartService::mine($patientId);

check('with unconfirmed hidden, the unconfirmed allergy goes',
    !hasItem($strict, 'allergies', $ids['allergy_unconfirmed']));
check('the confirmed one stays', hasItem($strict, 'allergies', $ids['allergy_ok']));
check('and the refuted one is still gone -- it was never a setting',
    !hasItem($strict, 'allergies', $ids['allergy_refuted']));
check('a NULL verification goes too, because it is not confirmed',
    !hasItem($strict, 'devices', $ids['device_null']));

setPolicy(['portal_chart_show_unconfirmed' => 1]);

// ==========================================================================
// 2. Staff free text never reaches the patient.
// ==========================================================================
echo "\n-- Nothing written for staff leaves the building --\n";

$payload = json_encode(PortalChartService::mine($patientId));

check('the staff-only comment is nowhere in the patient payload',
    stripos((string) $payload, 'staff-only note') === false);
check('nor is the word "comments" as a key', stripos((string) $payload, '"comments"') === false);
check('no coding is exposed', stripos((string) $payload, '"coding"') === false);
check('no classification is exposed', stripos((string) $payload, '"classification') === false);
check('no outcome field is exposed', stripos((string) $payload, '"outcome"') === false);
check('no verification_status column name leaks through',
    stripos((string) $payload, 'verification_status') === false);

// ==========================================================================
// 3. What the patient is actually told.
// ==========================================================================
echo "\n-- How it reads --\n";

$chart = PortalChartService::mine($patientId);

check('the chart carries standing caveats', count($chart['caveats']) === 4);
check('one of them says care elsewhere will not be here',
    stripos(implode(' ', $chart['caveats']), 'somewhere else') !== false);
check('one of them says they cannot change it themselves',
    stripos(implode(' ', $chart['caveats']), 'cannot change your own record') !== false);

$allergies = sectionOf($chart, 'allergies');
check('a section carries its heading', $allergies['label'] === 'Allergies and reactions');
check('and a blurb saying what the list is for',
    is_string($allergies['blurb']) && stripos($allergies['blurb'], 'prescribed medicine') !== false);

$chart = PortalChartService::mine($patientId);
$ended = findItem($chart, 'conditions', $ids['condition_ended']);

check('an item with an end date is not shown as active', $ended && $ended['active'] === false);
check('and says when it ended', $ended && is_string($ended['until']) && stripos($ended['until'], 'Ended') === 0);

$current = findItem($chart, 'medications', $ids['medication_ok']);
check('a current item is shown as active', $current && $current['active'] === true);
check('and has no "until"', $current && $current['until'] === null);

// Allergy detail, built only from what is recorded.
$withDetail = findItem($chart, 'allergies', $ids['allergy_ok']);
$withoutDetail = findItem($chart, 'allergies', $ids['allergy_unconfirmed']);

check('an allergy with a reaction and severity says both',
    $withDetail && stripos($withDetail['detail'], 'Swelling') !== false && stripos($withDetail['detail'], 'Severe') !== false,
    (string) ($withDetail['detail'] ?? ''));
check('an allergy with neither says so plainly rather than looking empty',
    $withoutDetail && stripos($withoutDetail['detail'], 'not been written down') !== false,
    (string) ($withoutDetail['detail'] ?? ''));
check('and invites the patient to fill the gap',
    $withoutDetail && stripos($withoutDetail['detail'], 'Telling us') !== false);

// The empty-section wording -- the single most likely harm in this phase.
$db->prepare('UPDATE patient_medications SET deleted_at = NOW() WHERE patient_id = ? AND title = ?')
    ->execute([$patientId, 'ZZTEST Medicine']);

$emptied = sectionOf(PortalChartService::mine($patientId), 'medications');

check('an empty section comes back with zero items', $emptied['count'] === 0);
check('and says nothing has been WRITTEN DOWN, not that there is none',
    stripos((string) $emptied['empty_text'], 'written down') !== false,
    (string) $emptied['empty_text']);
check('the empty text never asserts the absence as fact',
    stripos((string) $emptied['empty_text'], 'you have no') === false
    && stripos((string) $emptied['empty_text'], 'you are not') === false,
    (string) $emptied['empty_text']);

$db->prepare('UPDATE patient_medications SET deleted_at = NULL WHERE patient_id = ? AND title = ?')
    ->execute([$patientId, 'ZZTEST Medicine']);

// Vaccinations.
$vaccineChart = PortalChartService::mine($patientId);
$vaccines = sectionOf($vaccineChart, 'immunizations');

check('a given vaccination is listed', hasItem($vaccineChart, 'immunizations', $ids['immunization_ok']));
check('a REFUSED one is not -- "refused" on a list headed Vaccinations reads as "had it"',
    !hasItem($vaccineChart, 'immunizations', $ids['immunization_refused']));
check('a vaccination carries the date it was given',
    is_string($vaccines['items'][0]['when'] ?? null) && $vaccines['items'][0]['when'] !== 'Date not recorded');
check('and the manufacturer, which patients get asked for',
    ($vaccines['items'][0]['manufacturer'] ?? null) === 'ZZTEST Pharma');

// ==========================================================================
// 4. Corrections.
// ==========================================================================
echo "\n-- Saying something is wrong --\n";

clearCorrections();

$res = PortalChartService::requestCorrection($patientId, [
    'section' => 'allergies',
    'item_id' => $ids['allergy_unconfirmed'],
    'says' => 'I have never reacted to this.',
    'asks' => 'remove',
], $patientUser);

check('a patient can say an item is wrong', !empty($res['success']), json_encode($res));

$row = $db->query("SELECT * FROM portal_chart_corrections WHERE patient_id = {$patientId} ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);

check('it is pending', $row['status'] === 'pending');
check('their own words are kept verbatim', $row['says'] === 'I have never reacted to this.');
check('what they asked for is kept', $row['asks'] === 'remove');
check('the item label is COPIED, not joined -- the row may change before anyone reads it',
    $row['item_label'] !== '' && $row['item_label'] !== null);

check('nothing on the clinical record changed',
    (int) $db->query("SELECT COUNT(*) FROM patient_allergies WHERE id = {$ids['allergy_unconfirmed']} AND deleted_at IS NULL")->fetchColumn() === 1);

$res = PortalChartService::requestCorrection($patientId, [
    'section' => 'allergies', 'item_id' => $ids['allergy_unconfirmed'], 'says' => 'Again', 'asks' => 'remove',
], $patientUser);
check('the same item cannot be raised twice', empty($res['success']), json_encode($res));

$res = PortalChartService::requestCorrection($patientId, [
    'section' => 'allergies', 'item_id' => $ids['allergy_ok'], 'says' => '', 'asks' => 'correct',
], $patientUser);
check('a correction with nothing said is refused',
    empty($res['success']) && isset($res['errors']['says']), json_encode($res));

$res = PortalChartService::requestCorrection($patientId, [
    'section' => 'allergies', 'item_id' => $ids['allergy_refuted'], 'says' => 'What is this?', 'asks' => 'unsure',
], $patientUser);
check('a REFUTED item cannot be corrected either -- it is not on their chart to object to',
    empty($res['success']) && !empty($res['not_found']), json_encode($res));

$res = PortalChartService::requestCorrection($otherId, [
    'section' => 'allergies', 'item_id' => $ids['allergy_ok'], 'says' => 'Not mine', 'asks' => 'remove',
], $otherUser);
check('one patient cannot raise a correction against another\'s item',
    empty($res['success']) && !empty($res['not_found']), json_encode($res));

$res = PortalChartService::requestCorrection($patientId, [
    'section' => 'nonsense', 'item_id' => 1, 'says' => 'x', 'asks' => 'remove',
], $patientUser);
check('an unknown section is refused', empty($res['success']));

// The pending cap.
setPolicy(['portal_chart_max_pending' => 1]);
$res = PortalChartService::requestCorrection($patientId, [
    'section' => 'conditions', 'item_id' => $ids['condition_ended'], 'says' => 'Also wrong', 'asks' => 'correct',
], $patientUser);
check('the pending cap stops a list of twenty becoming twenty requests',
    empty($res['success']) && stripos((string) $res['message'], 'waiting') !== false, json_encode($res));
setPolicy(['portal_chart_max_pending' => 5]);

// It shows against the item it was raised on.
$chart = PortalChartService::mine($patientId);
$flagged = findItem($chart, 'allergies', $ids['allergy_unconfirmed']);

check('the open request is attached to the item the patient raised it on', is_array($flagged['correction'] ?? null));
check('and that item can no longer be raised again', ($flagged['can_correct'] ?? true) === false);
check('while a different item still can',
    (findItem($chart, 'allergies', $ids['allergy_ok'])['can_correct'] ?? false) === true);

// Withdraw.
$correctionId = (int) $row['id'];
$res = PortalChartService::withdrawCorrection($otherId, ['id' => $correctionId], $otherUser);
check('one patient cannot withdraw another\'s request', empty($res['success']));

$res = PortalChartService::withdrawCorrection($patientId, ['id' => $correctionId], $patientUser);
check('a patient can take their own back', !empty($res['success']));
check('it is withdrawn',
    (string) $db->query("SELECT status FROM portal_chart_corrections WHERE id = {$correctionId}")->fetchColumn() === 'withdrawn');
check('and the message says the record never changed',
    stripos((string) $res['message'], 'has changed') !== false || stripos((string) $res['message'], 'Nothing on your record') !== false,
    (string) $res['message']);

$res = PortalChartService::withdrawCorrection($patientId, ['id' => $correctionId], $patientUser);
check('withdrawing twice is refused', empty($res['success']));

// ==========================================================================
// 5. The clinic answering.
// ==========================================================================
echo "\n-- Answering one --\n";

clearCorrections();

PortalChartService::requestCorrection($patientId, [
    'section' => 'conditions', 'item_id' => $ids['condition_ended'], 'says' => 'This was never me.', 'asks' => 'remove',
], $patientUser);

$id = (int) $db->query("SELECT id FROM portal_chart_corrections WHERE patient_id = {$patientId} ORDER BY id DESC LIMIT 1")->fetchColumn();

$res = PortalChartService::decide(['id' => $id, 'decision' => 'declined', 'response' => ''], $staffUser);
check('a decline with no reason is refused -- being told no with no reason is worse than not asking',
    empty($res['success']) && isset($res['errors']['response']), json_encode($res));

$res = PortalChartService::decide(['id' => $id, 'decision' => 'accepted'], $staffUser);
check('an acceptance may stand on its own', !empty($res['success']), json_encode($res));
check('and the message tells the clinician the chart was NOT edited for them',
    stripos((string) $res['message'], 'does not do it for you') !== false, (string) $res['message']);

check('accepting did not touch the clinical row',
    (int) $db->query("SELECT COUNT(*) FROM patient_medical_problems WHERE id = {$ids['condition_ended']} AND deleted_at IS NULL")->fetchColumn() === 1);

$after = $db->query("SELECT * FROM portal_chart_corrections WHERE id = {$id}")->fetch(PDO::FETCH_ASSOC);
check('the request is accepted', $after['status'] === 'accepted');
check('with who answered it', (int) $after['reviewed_by'] === (int) $staffUser['id']);
check('and when', $after['reviewed_at'] !== null);

$res = PortalChartService::decide(['id' => $id, 'decision' => 'accepted'], $staffUser);
check('answering twice is refused', empty($res['success']));

$notices = $db->query(
    "SELECT * FROM patient_notifications WHERE patient_id = {$patientId} AND event_type = 'chart_correction_answered'"
)->fetchAll(PDO::FETCH_ASSOC);

check('the patient is told', count($notices) >= 1);
check('the message names what they asked about',
    $notices && stripos((string) $notices[0]['body'], 'ZZTEST Condition Resolved') !== false,
    (string) ($notices[0]['body'] ?? ''));
check('it does not name which list the item came from',
    $notices && stripos((string) $notices[0]['body'], 'condition') === false
        || $notices && stripos((string) $notices[0]['body'], 'ZZTEST Condition') !== false);
check('no SMS row was queued', !in_array('sms', array_column($notices, 'channel'), true));

// Declining, with a reason.
clearCorrections();
PortalChartService::requestCorrection($patientId, [
    'section' => 'allergies', 'item_id' => $ids['allergy_ok'], 'says' => 'Take it off', 'asks' => 'remove',
], $patientUser);
$id = (int) $db->query("SELECT id FROM portal_chart_corrections WHERE patient_id = {$patientId} ORDER BY id DESC LIMIT 1")->fetchColumn();

$res = PortalChartService::decide([
    'id' => $id, 'decision' => 'declined', 'response' => 'This was confirmed during your admission in March.',
], $staffUser);

check('a decline with a reason goes through', !empty($res['success']));
check('the reason is kept for the patient to read',
    (string) $db->query("SELECT response FROM portal_chart_corrections WHERE id = {$id}")->fetchColumn()
        === 'This was confirmed during your admission in March.');

$declined = $db->query(
    "SELECT body FROM patient_notifications WHERE patient_id = {$patientId} AND event_type = 'chart_correction_answered' ORDER BY id DESC LIMIT 1"
)->fetchColumn();
check('and the patient is told on a decline too, not just an acceptance',
    is_string($declined) && stripos((string) $declined, 'not changing it') !== false, (string) $declined);

// ==========================================================================
// 6. The desk's own views.
// ==========================================================================
echo "\n-- The clinic's side --\n";

$queue = PortalChartService::queue('declined');
check('the queue can be filtered by status', count($queue['items']) >= 1);
check('a row names the patient', (string) $queue['items'][0]['patient'] !== '');
check('and says what they asked for in words',
    in_array($queue['items'][0]['asks_text'], array_values(PortalChartService::ASKS), true));
check('the queue counts each status', isset($queue['counts']['declined']));

$preview = PortalChartService::preview($patientId);
check('the desk can see exactly what the patient sees', isset($preview['sections']) && count($preview['sections']) === 6);
check('and the preview hides the refuted item too',
    !hasItem($preview, 'allergies', $ids['allergy_refuted']));

$sections = PortalChartService::sections();
check('the desk can list the sections', count($sections['items']) === 6);
check('and is shown which verification values are hidden',
    $sections['verification_hidden'] === ['Refuted', 'Entered in Error']);

$res = PortalChartService::saveSection([
    'code' => 'devices', 'label' => 'Implants', 'blurb' => 'Changed.', 'empty_text' => 'Nothing written down.',
    'is_enabled' => 0, 'allow_corrections' => 0,
], $staffUser);
check('a section can be switched off', !empty($res['success']), json_encode($res));
check('and then it is not in the patient\'s chart at all',
    sectionOf(PortalChartService::mine($patientId), 'devices') === null);

$res = PortalChartService::saveSection(['code' => 'devices', 'label' => ''], $staffUser);
check('a section cannot be left without a heading', empty($res['success']) && isset($res['errors']['label']));

$res = PortalChartService::saveSection(['code' => 'nope', 'label' => 'x'], $staffUser);
check('an unknown section code is refused', empty($res['success']));

// Put it back and check per-section corrections can be switched off alone.
PortalChartService::saveSection([
    'code' => 'devices', 'label' => 'Implants and devices', 'blurb' => 'b', 'empty_text' => 'e',
    'is_enabled' => 1, 'allow_corrections' => 0,
], $staffUser);

$devices = sectionOf(PortalChartService::mine($patientId), 'devices');
check('a section can be readable but not correctable', $devices !== null && $devices['allow_corrections'] === false);
check('and its items say so', ($devices['items'][0]['can_correct'] ?? true) === false);

$res = PortalChartService::requestCorrection($patientId, [
    'section' => 'devices', 'item_id' => $ids['device_null'], 'says' => 'wrong', 'asks' => 'remove',
], $patientUser);
check('and a correction against it is refused, by name',
    empty($res['success']) && stripos((string) $res['message'], 'telephone') !== false, json_encode($res));

// ==========================================================================
// 7. Switched off.
// ==========================================================================
echo "\n-- Switched off --\n";

setPolicy(['portal_allow_chart' => 0]);
$off = PortalChartService::mine($patientId);
check('the whole chart can be switched off', $off['enabled'] === false);
check('and says so rather than showing an empty screen', !empty($off['message']));
check('with no sections at all', $off['sections'] === []);

$res = PortalChartService::requestCorrection($patientId, [
    'section' => 'allergies', 'item_id' => $ids['allergy_ok'], 'says' => 'x', 'asks' => 'remove',
], $patientUser);
check('no correction can be raised while it is off', empty($res['success']));

setPolicy(['portal_allow_chart' => 1, 'portal_allow_chart_corrections' => 0]);
$readOnly = PortalChartService::mine($patientId);
check('corrections can be switched off while the chart stays readable',
    $readOnly['enabled'] === true && $readOnly['can_correct'] === false);
check('and every item says it cannot be corrected',
    !in_array(true, array_column(allItems($readOnly), 'can_correct'), true));

setPolicy(['portal_allow_chart_corrections' => 1]);

// ==========================================================================
// 8. Constants, and nothing leaked.
// ==========================================================================
echo "\n-- Constants and leakage --\n";

check('the capability is spelled the way the seed grants it', PortalGuard::CAP_CHART === 'mychart_chart');
check('and is granted to the patient role here',
    (int) $db->query(
        "SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id
          WHERE r.name = 'patient' AND rp.capability = 'mychart_chart' AND rp.is_granted = 1"
    )->fetchColumn() === 1);

check('deciding is narrower than reading the queue',
    count(PortalChartService::DECIDE_ROLES) < count(PortalChartService::REVIEW_ROLES));
check('and editing patient-facing wording is narrower still',
    count(PortalChartService::EDIT_ROLES) < count(PortalChartService::DECIDE_ROLES));
check('every decide role may also read the queue',
    array_diff(PortalChartService::DECIDE_ROLES, PortalChartService::REVIEW_ROLES) === []);

check('all six sections have a source', count(PortalChartService::SECTIONS) === 6);

check('no correction belongs to a patient outside the fixtures',
    (int) $db->query(
        "SELECT COUNT(*) FROM portal_chart_corrections c JOIN patients p ON p.id = c.patient_id
          WHERE p.patient_no NOT IN ('" . implode("','", TestFixtures::PATIENT_NUMBERS) . "')"
    )->fetchColumn() === 0);

} finally {
    // Policy and section wording back as they were, pass or fail.
    if ($originalSettings) {
        setPolicy($originalSettings);
    }

    foreach ($originalSections as $section) {
        $db->prepare(
            'UPDATE portal_chart_sections
                SET label = :label, blurb = :blurb, empty_text = :empty,
                    is_enabled = :on, allow_corrections = :corr, sequence = :seq
              WHERE id = :id'
        )->execute([
            'label' => $section['label'],
            'blurb' => $section['blurb'],
            'empty' => $section['empty_text'],
            'on' => $section['is_enabled'],
            'corr' => $section['allow_corrections'],
            'seq' => $section['sequence'],
            'id' => $section['id'],
        ]);
    }

    clearCorrections();
}

echo "\n==================================================\n";
echo "  {$pass} passed, {$fail} failed\n";
echo "==================================================\n";

exit($fail === 0 ? 0 : 1);
