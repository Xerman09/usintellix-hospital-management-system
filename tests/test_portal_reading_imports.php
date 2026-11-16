<?php

declare(strict_types=1);

/**
 * Automated Verification: imported readings (Phase M17a)
 *
 * Runs against the disposable database from tests/build_test_database.php and
 * refuses to run anywhere else: importing writes readings into a patient's
 * chart and can raise care-team alerts.
 *
 *   php tests/build_test_database.php --fresh   (once)
 *   php tests/test_portal_reading_imports.php
 *
 * The suite is mostly about two things.
 *
 * ONE: an import must not page anybody about history. M7 raises one urgent
 * alert per out-of-band reading, which is right for a reading somebody just
 * took and a disaster for three months of backfill. The assertions check that
 * historical out-of-band readings are flagged and raise NOTHING, that recent
 * ones raise exactly ONE alert for the whole batch, and that the alert says
 * which readings it deliberately left alone.
 *
 * TWO: a re-sync is the normal case, not an error. A health app asked for
 * "everything since January" hands over the same samples every time, and the
 * second import must be quiet rather than doubling the chart.
 */

require_once __DIR__ . '/lib/test_fixtures.php';

use App\Core\Database;
use App\Modules\MyChart\Services\PortalGuard;
use App\Modules\MyChart\Services\PortalReadingImportService;
use App\Modules\MyChart\Services\PortalSelfReadingService;

try {
    $database = TestDatabase::use();
} catch (Throwable $e) {
    echo 'REFUSED: ' . $e->getMessage() . "\n";
    exit(1);
}

echo "==================================================\n";
echo "   Automated Verification: Imported Readings (M17a)\n";
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

$clean = static function () use ($db, $patientId): void {
    $db->prepare('DELETE FROM patient_self_readings WHERE patient_id = ?')->execute([$patientId]);
    $db->prepare('DELETE FROM portal_reading_imports WHERE patient_id = ?')->execute([$patientId]);
    $db->exec("DELETE FROM alerts WHERE alert_type = 'patient_reading_import'");
};

$clean();

$dbNow = (string) $db->query('SELECT NOW()')->fetchColumn();
$alerts = static fn(): int => (int) Database::connection()
    ->query("SELECT COUNT(*) FROM alerts WHERE alert_type = 'patient_reading_import'")->fetchColumn();

// A blood pressure above the seeded band (180/110), and one inside it.
// Above the seeded band (180/110) but well inside M7's plausibility ceiling of
// 300 -- the point is "outside the band we watch", not "impossible". $tag only
// varies the external id, so two batches can carry the same timestamp without
// colliding.
$bad = static fn(string $at, string $tag = ''): array => [
    'kind' => 'bp', 'taken_at' => $at, 'value_1' => 195, 'value_2' => 115,
    'external_id' => 'bad-' . md5($at . '|' . $tag),
];
$good = static fn(string $at): array => [
    'kind' => 'bp', 'taken_at' => $at, 'value_1' => 122, 'value_2' => 78,
    'external_id' => 'good-' . md5($at),
];
$ago = static fn(int $seconds) => date('Y-m-d H:i:s', strtotime($dbNow) - $seconds);

// --------------------------------------------------------------------------
// 1. Time. The trap that bit M15a.
// --------------------------------------------------------------------------
echo "\n-- Putting an incoming timestamp on the database's clock --\n";

$drift = strtotime($dbNow) - time();

echo "  (PHP and MySQL are " . round($drift / 3600, 1) . "h apart on this machine)\n";

check('a naive timestamp is taken at face value',
    PortalReadingImportService::toDatabaseClock('2026-11-14 08:30', $dbNow) === '2026-11-14 08:30:00',
    (string) PortalReadingImportService::toDatabaseClock('2026-11-14 08:30', $dbNow));

// A zoned timestamp names an absolute moment and has to be re-expressed on
// whatever wall clock the database keeps -- which is not necessarily PHP's.
$utc = PortalReadingImportService::toDatabaseClock('2026-11-14T08:30:00Z', $dbNow);
$expected = date('Y-m-d H:i:s', strtotime('2026-11-14T08:30:00Z') + $drift);

check('a UTC timestamp is converted onto the database clock', $utc === $expected, "{$utc} vs {$expected}");

$offset = PortalReadingImportService::toDatabaseClock('2026-11-14T08:30:00+08:00', $dbNow);
$expected = date('Y-m-d H:i:s', strtotime('2026-11-14T08:30:00+08:00') + $drift);

check('and so is one with an explicit offset', $offset === $expected, "{$offset} vs {$expected}");
check('two spellings of the same moment land on the same wall clock',
    PortalReadingImportService::toDatabaseClock('2026-11-14T00:30:00Z', $dbNow)
    === PortalReadingImportService::toDatabaseClock('2026-11-14T08:30:00+08:00', $dbNow));
check('unparseable text returns null rather than a guess',
    PortalReadingImportService::toDatabaseClock('sometime last week', $dbNow) === null);

// --------------------------------------------------------------------------
// 2. THE RULE. Importing history must not page anybody.
// --------------------------------------------------------------------------
echo "\n-- Historical out-of-band readings raise nothing --\n";

$history = [];

for ($i = 40; $i >= 30; $i--) {
    $history[] = $bad($ago($i * 86400), 'hist');
}

$res = PortalReadingImportService::import($patientId, [
    'source_app' => 'Apple Health',
    'device_name' => 'Omron HEM-7156T',
    'readings' => $history,
], $patientUser, true);

check('the batch is accepted', !empty($res['success']), json_encode($res));
check('all eleven readings land', $res['data']['accepted'] === 11, (string) $res['data']['accepted']);
check('all eleven are outside the band', $res['data']['flagged'] === 11, (string) $res['data']['flagged']);

// The assertion the phase exists for.
check('and NOT ONE of them raises an alert', $alerts() === 0, (string) $alerts());
check('the service says so too', $res['data']['alerted'] === 0 && $res['data']['care_team_told'] === false);

check('they are still flagged on the chart, so nothing is hidden',
    (int) $db->query("SELECT COUNT(*) FROM patient_self_readings WHERE patient_id = {$patientId} AND out_of_band = 1")->fetchColumn() === 11);
check('and none is stamped as alerted',
    (int) $db->query("SELECT COUNT(*) FROM patient_self_readings WHERE patient_id = {$patientId} AND alerted_at IS NOT NULL")->fetchColumn() === 0);

// The patient is told the readings are marked, without being told somebody is
// acting on figures from six weeks ago.
check('the patient is told they are marked for the next contact',
    str_contains($res['message'], 'next contact'), $res['message']);
check('and is NOT told the care team was told',
    !str_contains($res['message'], 'care team has been told'), $res['message']);

echo "\n-- A recent out-of-band reading raises exactly one --\n";

$res = PortalReadingImportService::import($patientId, [
    'source_app' => 'Apple Health',
    'readings' => [$bad($ago(3600))],
], $patientUser, true);

check('it is accepted', $res['data']['accepted'] === 1);
check('it counts as alertable', $res['data']['alerted'] === 1);
check('exactly one alert exists', $alerts() === 1, (string) $alerts());
check('and the patient is told the care team knows',
    str_contains($res['message'], 'care team has been told'), $res['message']);

$alert = $db->query(
    "SELECT title, body, urgency FROM alerts WHERE alert_type = 'patient_reading_import' ORDER BY id DESC LIMIT 1"
)->fetch(PDO::FETCH_ASSOC);

check('the alert names the reading and the source',
    str_contains((string) $alert['title'], 'Blood pressure')
    && str_contains((string) $alert['title'], 'Apple Health'), (string) $alert['title']);
check('the body says it is self-reported, not a clinical measurement',
    str_contains((string) $alert['body'], 'not a clinical measurement'));
check('and says it is one alert for the whole import',
    str_contains((string) $alert['body'], 'not one per reading'));

echo "\n-- A mixed batch: one alert, and it says what it left alone --\n";

$db->exec("DELETE FROM alerts WHERE alert_type = 'patient_reading_import'");

$mixed = [];

for ($i = 1; $i <= 4; $i++) {
    $mixed[] = $bad($ago($i * 1800), 'mix-recent');
}

for ($i = 20; $i <= 23; $i++) {
    $mixed[] = $bad($ago($i * 86400), 'mix-old');
}

$res = PortalReadingImportService::import($patientId, [
    'source_app' => 'Apple Health',
    'readings' => $mixed,
], $patientUser, true);

$importId = (int) $res['data']['import_id'];

check('all eight land', $res['data']['accepted'] === 8, (string) $res['data']['accepted']);
check('all eight are flagged', $res['data']['flagged'] === 8);
check('four of them are recent enough to matter', $res['data']['alerted'] === 4);
check('but there is still only ONE alert', $alerts() === 1, (string) $alerts());

$body = (string) $db->query(
    "SELECT body FROM alerts WHERE alert_type = 'patient_reading_import' ORDER BY id DESC LIMIT 1"
)->fetchColumn();

check('the alert counts the recent ones', str_contains($body, '4 readings in the last 24 hours'), substr($body, 0, 200));
// A clinician who sees a flagged run and one alert should know that was chosen.
check('and says plainly that the older ones deliberately did not alert',
    str_contains($body, 'deliberately did not raise an alert'), substr($body, 0, 400));
check('explaining why', str_contains($body, 'importing history must not page anybody'));

// Every reading the alert covers must be stamped, not just the one it was named
// after -- otherwise M7's "already alerted" view disagrees with what happened.
$stamped = (int) $db->query(
    "SELECT COUNT(*) FROM patient_self_readings WHERE import_id = {$importId} AND alert_id IS NOT NULL"
)->fetchColumn();

check('all four recent readings carry the alert id, not just one', $stamped === 4, (string) $stamped);

$unstamped = (int) $db->query(
    "SELECT COUNT(*) FROM patient_self_readings WHERE import_id = {$importId} AND out_of_band = 1 AND alert_id IS NULL"
)->fetchColumn();

check('and the four historical ones carry none', $unstamped === 4, (string) $unstamped);

echo "\n-- With the alert window at zero, nothing alerts --\n";

$db->exec("DELETE FROM alerts WHERE alert_type = 'patient_reading_import'");
$db->exec('UPDATE general_settings SET portal_import_alert_hours = 0');

$res = PortalReadingImportService::import($patientId, [
    'source_app' => 'Apple Health',
    'readings' => [$bad($ago(60), 'zero-window')],
], $patientUser, true);

check('a reading from a minute ago is still flagged', $res['data']['flagged'] === 1);
// A hospital that wants no automatic paging from device data is making a
// defensible choice, so zero is allowed rather than clamped up to a default.
check('but raises no alert when the window is zero', $alerts() === 0, (string) $alerts());

$db->exec('UPDATE general_settings SET portal_import_alert_hours = 24');

// --------------------------------------------------------------------------
// 3. Re-syncing is the normal case.
// --------------------------------------------------------------------------
echo "\n-- A re-sync is quiet --\n";

$clean();

$first = PortalReadingImportService::import($patientId, [
    'source_app' => 'Apple Health', 'readings' => $history,
], $patientUser, true);

$again = PortalReadingImportService::import($patientId, [
    'source_app' => 'Apple Health', 'readings' => $history,
], $patientUser, true);

check('the second run accepts nothing', $again['data']['accepted'] === 0, (string) $again['data']['accepted']);
check('and reports them as already held', $again['data']['duplicates'] === 11, (string) $again['data']['duplicates']);
check('it is not an error', !empty($again['success']));
check('the chart did not double', (int) $db->query(
    "SELECT COUNT(*) FROM patient_self_readings WHERE patient_id = {$patientId}")->fetchColumn() === 11);
check('and nothing was flagged a second time', $again['data']['flagged'] === 0);

// "0 readings saved, 11 already in your record" is true and reads like failure.
check('the patient is told what actually happened',
    str_contains($again['message'], 'Nothing new'), $again['message']);

echo "\n-- Duplicates inside one payload --\n";

$clean();

$res = PortalReadingImportService::import($patientId, [
    'source_app' => 'CSV paste',
    'readings' => [
        ['kind' => 'glucose', 'taken_at' => '2026-11-10 09:00', 'value_1' => 110],
        ['kind' => 'glucose', 'taken_at' => '2026-11-10 09:00', 'value_1' => 110],
        // Same minute, different second: a watch re-reporting one sample.
        ['kind' => 'glucose', 'taken_at' => '2026-11-10 09:00:40', 'value_1' => 110],
        ['kind' => 'glucose', 'taken_at' => '2026-11-10 09:01', 'value_1' => 110],
    ],
], null, false);

check('the same reading twice in one payload counts once', $res['data']['accepted'] === 2, (string) $res['data']['accepted']);
check('and the repeats are reported as duplicates', $res['data']['duplicates'] === 2, (string) $res['data']['duplicates']);

echo "\n-- A hand-entered reading is never blocked by the dedupe keys --\n";

$clean();

// The unique keys only constrain rows that carry them, and record() sets
// neither. A patient typing the same reading twice is their business.
$a = PortalSelfReadingService::record($patientId, [
    'kind' => 'weight', 'value_1' => 180, 'taken_at' => '2026-11-10 07:00',
], $world['patient_user_id']);
$b = PortalSelfReadingService::record($patientId, [
    'kind' => 'weight', 'value_1' => 180, 'taken_at' => '2026-11-10 07:00',
], $world['patient_user_id']);

check('M7 still accepts a reading typed by hand', !empty($a['success']), json_encode($a));
check('and accepts an identical one, as it did before', !empty($b['success']), json_encode($b));

// --------------------------------------------------------------------------
// 4. Plausibility. One bad sample must not lose the batch.
// --------------------------------------------------------------------------
echo "\n-- Implausible readings are refused, the rest survive --\n";

$clean();

$res = PortalReadingImportService::import($patientId, [
    'source_app' => 'CSV paste',
    'readings' => [
        ['kind' => 'bp', 'taken_at' => '2026-11-10 08:00', 'value_1' => 900, 'value_2' => 400],
        ['kind' => 'bp', 'taken_at' => '2026-11-10 08:05', 'value_1' => 120, 'value_2' => 140],
        ['kind' => 'bp', 'taken_at' => '2026-11-10 08:10', 'value_1' => 125],
        ['kind' => 'heartrate', 'taken_at' => '2026-11-10 08:15', 'value_1' => 70],
        ['kind' => 'bp', 'taken_at' => 'not a date', 'value_1' => 120, 'value_2' => 80],
        ['kind' => 'bp', 'taken_at' => $ago(-86400), 'value_1' => 120, 'value_2' => 80],
        ['kind' => 'bp', 'taken_at' => $ago(500 * 86400), 'value_1' => 120, 'value_2' => 80],
        ['kind' => 'bp', 'taken_at' => '2026-11-10 08:20', 'value_1' => 122, 'value_2' => 78],
    ],
], null, false);

check('the good one is still saved', $res['data']['accepted'] === 1, (string) $res['data']['accepted']);
check('and the seven bad ones are refused', $res['data']['rejected'] === 7, (string) $res['data']['rejected']);

$why = [];

foreach ($res['data']['reject_reasons'] as $r) {
    $why[(int) $r['row']] = (string) $r['why'];
}

check('an impossible value is named as impossible',
    str_contains($why[1] ?? '', 'outside what a real reading can be'), $why[1] ?? '');
check('a diastolic above the systolic is caught',
    str_contains($why[2] ?? '', 'not below the top number'), $why[2] ?? '');
check('a blood pressure with one number is caught',
    str_contains($why[3] ?? '', 'needs both numbers'), $why[3] ?? '');
check('a measure the hospital does not track is named',
    str_contains($why[4] ?? '', 'heartrate'), $why[4] ?? '');
check('an unreadable time is quoted back', str_contains($why[5] ?? '', 'not a date'), $why[5] ?? '');
check('a future reading is refused', str_contains($why[6] ?? '', 'future'), $why[6] ?? '');
check('and one older than M7 allows is refused',
    str_contains($why[7] ?? '', 'days old'), $why[7] ?? '');

// A refused reading must not reach the chart at all, since an impossible value
// stored and then flagged would put a fault on the patient's record.
check('nothing implausible reached the chart',
    (int) $db->query("SELECT COUNT(*) FROM patient_self_readings WHERE patient_id = {$patientId} AND value_1 > 300")->fetchColumn() === 0);

check('the bounds are M7\'s own, not a second set',
    PortalSelfReadingService::KINDS['bp']['max_1'] === 300.0);

// --------------------------------------------------------------------------
// 5. Batch-level refusals.
// --------------------------------------------------------------------------
echo "\n-- Batch limits --\n";

$res = PortalReadingImportService::import($patientId, ['readings' => [$good($ago(7200))]], null, false);
check('an import with no source is refused', empty($res['success']) && isset($res['errors']['source_app']));

$res = PortalReadingImportService::import($patientId, ['source_app' => 'X', 'readings' => []], null, false);
check('an empty import is refused', empty($res['success']) && isset($res['errors']['readings']));

$db->exec('UPDATE general_settings SET portal_import_max_rows = 3');
$res = PortalReadingImportService::import($patientId, [
    'source_app' => 'X',
    'readings' => [$good($ago(100)), $good($ago(200)), $good($ago(300)), $good($ago(400))],
], null, false);
check('a batch over the row limit is refused whole', empty($res['success']));
check('and says how many it will take',
    str_contains((string) ($res['errors']['readings'] ?? ''), '3'),
    (string) ($res['errors']['readings'] ?? ''));
$db->exec('UPDATE general_settings SET portal_import_max_rows = 500');

$db->exec('UPDATE general_settings SET portal_allow_reading_import = 0');
$res = PortalReadingImportService::import($patientId, [
    'source_app' => 'X', 'readings' => [$good($ago(100))],
], null, false);
check('nothing imports while the feature is switched off', empty($res['success']), json_encode($res));
check('and the patient is told they can still type them in',
    str_contains((string) PortalReadingImportService::mine($patientId)['blocked_reason'], 'by hand'));
$db->exec('UPDATE general_settings SET portal_allow_reading_import = 1');

// --------------------------------------------------------------------------
// 6. The paste parser.
// --------------------------------------------------------------------------
echo "\n-- Parsing pasted text --\n";

$rows = PortalReadingImportService::parseDelimited(
    "measure, when, value, second\n"
    . "bp, 2026-11-14 08:30, 128, 82\n"
    . "glucose, 2026-11-14 09:00, 110\n"
    . "# a comment\n"
    . "\n"
    . "bp\t2026-11-13 08:00\t135\t85\n"
);

check('the header line is skipped and three readings come back', count($rows) === 3, (string) count($rows));
check('commas parse', $rows[0]['kind'] === 'bp' && $rows[0]['value_1'] === '128');
check('tabs parse too', $rows[2]['kind'] === 'bp' && $rows[2]['value_2'] === '85');
check('comments and blank lines are ignored',
    !array_filter($rows, static fn($r) => str_contains((string) $r['taken_at'], 'comment')));

$rows = PortalReadingImportService::parseDelimited("2026-11-12 07:00, 71.5\n2026-11-11 07:00, 71.9\n", 'weight');

check('a two-column paste works when the measure is given once', count($rows) === 2);
check('and every row takes that measure', $rows[0]['kind'] === 'weight' && $rows[1]['kind'] === 'weight');

// Parsing never rejects a line it cannot make sense of; validateOne() does, so
// the staff member sees which line was wrong instead of one unhelpful failure
// for the whole paste, or -- worse -- a line quietly vanishing.
$rows = PortalReadingImportService::parseDelimited(
    "bp, 2026-11-14 08:30, 128, 82\n"
    . "bp, total nonsense, 128, 82\n"
    . "bp, 2026-11-13 08:30, 126, 80\n"
);

check('a malformed line mid-paste is kept, not dropped', count($rows) === 3, (string) count($rows));

$result = PortalReadingImportService::validateOne($rows[1], $dbNow);

check('and validateOne is what refuses it', isset($result['error']), json_encode($result));
check('naming the line back to the reader',
    str_contains((string) ($result['error'] ?? ''), 'total nonsense'), (string) ($result['error'] ?? ''));

// A single digit-free line at the top IS a header by that rule, which is the
// right reading of a one-line paste.
check('a lone header line still parses to nothing',
    PortalReadingImportService::parseDelimited("measure, when, value\n") === []);

// --------------------------------------------------------------------------
// 7. Provenance.
// --------------------------------------------------------------------------
echo "\n-- Provenance reaches the chart and the patient --\n";

$clean();

PortalReadingImportService::import($patientId, [
    'source_app' => 'Apple Health',
    'device_name' => 'Omron HEM-7156T',
    'readings' => [$good($ago(7200))],
], $patientUser, true);

$row = $db->query(
    "SELECT source, source_app, device_name, import_id, dedupe_hash, external_id
     FROM patient_self_readings WHERE patient_id = {$patientId} ORDER BY id DESC LIMIT 1"
)->fetch(PDO::FETCH_ASSOC);

check('the reading is marked as coming from a device', ($row['source'] ?? '') === 'device');
check('the app is recorded', ($row['source_app'] ?? '') === 'Apple Health');
check('the device is recorded', ($row['device_name'] ?? '') === 'Omron HEM-7156T');
check('it points at its import batch', $row['import_id'] !== null);
check('and carries a dedupe key', strlen((string) $row['dedupe_hash']) === 40);

// M7's own reader has to carry it through, or neither the patient's log nor the
// clinician's panel can show where a reading came from.
$readings = PortalSelfReadingService::readings($patientId, 'bp', 90);

check('M7\'s reader returns the source app', ($readings[0]['source_app'] ?? null) === 'Apple Health',
    json_encode($readings[0] ?? null));
check('and the device name', ($readings[0]['device_name'] ?? null) === 'Omron HEM-7156T');
check('the clinician panel carries it too, through the same reader',
    str_contains(json_encode(PortalSelfReadingService::chart($patientId, 90)), 'Apple Health'));

$byHand = PortalSelfReadingService::record($patientId, [
    'kind' => 'bp', 'value_1' => 118, 'value_2' => 76, 'taken_at' => $ago(3600),
], $world['patient_user_id']);

check('a hand-typed reading still records', !empty($byHand['success']), json_encode($byHand));

$typed = $db->query(
    "SELECT source, source_app, dedupe_hash FROM patient_self_readings WHERE id = " . (int) $byHand['data']['id']
)->fetch(PDO::FETCH_ASSOC);

check('it is marked as the patient\'s own', ($typed['source'] ?? '') === 'patient');
check('with no source app', $typed['source_app'] === null);
check('and no dedupe key, so it is outside the unique indexes', $typed['dedupe_hash'] === null);

// --------------------------------------------------------------------------
// 8. Reading the imports back.
// --------------------------------------------------------------------------
echo "\n-- The patient's and the clinician's views --\n";

$clean();

PortalReadingImportService::import($patientId, [
    'source_app' => 'Apple Health', 'readings' => $history,
], $patientUser, true);

PortalReadingImportService::import($patientId, [
    'source_app' => 'Clinic paste', 'readings' => [$good($ago(7200))],
], TestFixtures::staffUser(), false);

$mine = PortalReadingImportService::mine($patientId);

check('the patient sees both imports', count($mine['items']) === 2, (string) count($mine['items']));
check('and which they did themselves',
    $mine['items'][1]['by_you'] === true && $mine['items'][0]['by_you'] === false,
    json_encode(array_column($mine['items'], 'by_you')));
check('each carries a sentence rather than bare numbers', !empty($mine['items'][0]['summary']));
check('and the dates it covers', !empty($mine['items'][1]['covers']['from']));

$history2 = PortalReadingImportService::history($patientId);
$oldBatch = null;

foreach ($history2['items'] as $i) {
    if ($i['source_app'] === 'Apple Health') { $oldBatch = $i; }
}

check('the clinician sees the flagged count', ($oldBatch['flagged_count'] ?? 0) === 11);
check('and that none of them was alertable', ($oldBatch['alertable_count'] ?? -1) === 0);
// The difference between those two is the thing worth seeing.
check('with the historical count worked out for them', ($oldBatch['historical_flagged'] ?? 0) === 11);
// Not ($oldBatch['alert_id'] ?? 'x') === null -- the coalesce would replace the
// very NULL being tested for, so the check could never pass.
check('and no alert',
    array_key_exists('alert_id', (array) $oldBatch) && $oldBatch['alert_id'] === null,
    json_encode($oldBatch['alert_id'] ?? 'MISSING'));
check('the clinician view carries the caveats about device data',
    (bool) array_filter($history2['caveats'], static fn($c) => stripos($c, 'not from a clinical measurement') !== false));

$recent = PortalReadingImportService::recent('');

check('the desk list shows imports across patients', count($recent['items']) >= 2);
check('with the patient on each row', !empty($recent['items'][0]['patient']['name']));
check('and the measures it accepts, for the form', count($recent['kinds']) === count(PortalSelfReadingService::KINDS));

$readingsOf = PortalReadingImportService::readingsOf((int) $oldBatch['id']);

check('one import\'s readings can be listed', count($readingsOf) === 11, (string) count($readingsOf));
check('each formatted as a reading rather than raw columns',
    str_contains((string) $readingsOf[0]['reading'], '/'), (string) $readingsOf[0]['reading']);
check('and marked out of band', $readingsOf[0]['out_of_band'] === true);
check('but not alerted', $readingsOf[0]['alerted'] === false);

$found = PortalReadingImportService::findPatients('Testpatient');
check('patient lookup works for the staff form', count($found) >= 1, json_encode($found));
check('a one-character search returns nothing', PortalReadingImportService::findPatients('T') === []);

// --------------------------------------------------------------------------
// 9. Wiring.
// --------------------------------------------------------------------------
echo "\n-- Wiring --\n";

check('the capability constant exists', PortalGuard::CAP_READING_IMPORT === 'mychart_reading_import');
check('it is granted to the patient role by seed 083',
    (int) $db->query(
        "SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id
          WHERE r.name = 'patient' AND rp.capability = 'mychart_reading_import' AND rp.is_granted = 1"
    )->fetchColumn() === 1);

check('the notification type is seeded',
    (int) $db->query("SELECT COUNT(*) FROM portal_notification_types WHERE event_type = 'readings_imported'")->fetchColumn() === 1);

$notification = $db->query(
    "SELECT body_template, default_email, default_in_app FROM portal_notification_types WHERE event_type = 'readings_imported'"
)->fetch(PDO::FETCH_ASSOC);

check('it carries counts, not values', str_contains((string) $notification['body_template'], '{count}'));
// A blood sugar in an email says something about the patient to whoever reads
// the phone, and M7 already keeps the numbers behind the login.
check('and no reading value placeholder',
    !str_contains((string) $notification['body_template'], '{value}'));
check('email is off and in-app is on -- it is information, not an action',
    (int) $notification['default_email'] === 0 && (int) $notification['default_in_app'] === 1);

check('loading readings for somebody is limited to clinical roles',
    PortalReadingImportService::IMPORT_ROLES === ['admin', 'doctor', 'clinician', 'nurse'],
    json_encode(PortalReadingImportService::IMPORT_ROLES));
check('but anybody who may read the chart may read import history',
    in_array('cna', PortalReadingImportService::REVIEW_ROLES, true));

$keys = $db->query(
    "SELECT INDEX_NAME FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'patient_self_readings'
        AND NON_UNIQUE = 0 AND INDEX_NAME LIKE 'uq_self_reading%'
      GROUP BY INDEX_NAME"
)->fetchAll(PDO::FETCH_COLUMN);

check('both dedupe indexes exist and are unique', count($keys) === 2, json_encode($keys));

// --------------------------------------------------------------------------
echo "\n-- Cleaning up --\n";

$clean();
$db->exec('UPDATE general_settings SET portal_allow_reading_import = 1, portal_import_alert_hours = 24,
           portal_import_max_rows = 500, portal_import_max_per_day = 20');

check('the readings this suite wrote are gone',
    (int) $db->query("SELECT COUNT(*) FROM patient_self_readings WHERE patient_id = {$patientId}")->fetchColumn() === 0);
check('the import rows are gone',
    (int) $db->query("SELECT COUNT(*) FROM portal_reading_imports WHERE patient_id = {$patientId}")->fetchColumn() === 0);
check('and its alerts are gone', $alerts() === 0);
check('the settings are back to their defaults',
    (int) $db->query('SELECT portal_import_alert_hours FROM general_settings ORDER BY id LIMIT 1')->fetchColumn() === 24);

echo "\n==================================================\n";
echo "   {$pass} passed, {$fail} failed\n";
echo "==================================================\n";
echo "  (database: {$database} -- safe to drop at any time)\n";

exit($fail > 0 ? 1 : 0);
