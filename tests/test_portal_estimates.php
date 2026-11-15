<?php

declare(strict_types=1);

/**
 * Automated Verification: cost estimates (Phase M16)
 *
 * Runs against the disposable database from tests/build_test_database.php and
 * refuses to run anywhere else, because issuing an estimate writes rows and a
 * stray estimate in a real patient's portal is a figure nobody quoted them.
 *
 *   php tests/build_test_database.php --fresh   (once)
 *   php tests/test_portal_estimates.php
 *
 * The assertions worth knowing about before reading the rest:
 *
 *   - An estimate is a SNAPSHOT. Changing the package price afterwards must not
 *     change what the patient was told, and the fingerprint must notice that it
 *     changed. Both are asserted directly, because the whole phase rests on it.
 *
 *   - A breakdown is shown only when it ADDS UP. Three fixture packages cover
 *     the three outcomes: reconciles, does not reconcile, and has no items.
 *
 *   - The patient must never see the reconciliation diagnostic. It names the
 *     hospital's own arithmetic failure in raw figures, and it is written for
 *     the desk.
 */

require_once __DIR__ . '/lib/test_fixtures.php';

use App\Core\Database;
use App\Modules\MyChart\Services\PortalCostEstimateService;
use App\Modules\MyChart\Services\PortalGuard;

try {
    $database = TestDatabase::use();
} catch (Throwable $e) {
    echo 'REFUSED: ' . $e->getMessage() . "\n";
    exit(1);
}

echo "==================================================\n";
echo "   Automated Verification: Cost Estimates (M16)\n";
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
$packages = TestFixtures::packages();
$patientId = $world['patient_id'];
$patientUser = TestFixtures::patientUser();
$actorId = $world['staff_user_id'];

// A clean slate, so counts are the same on a second run.
$db->prepare('DELETE FROM portal_estimate_requests WHERE patient_id = ?')->execute([$patientId]);
$db->prepare('DELETE FROM portal_cost_estimates WHERE patient_id = ?')->execute([$patientId]);

// --------------------------------------------------------------------------
// 1. Reconciliation. The decision that governs everything the patient sees.
// --------------------------------------------------------------------------
echo "\n-- Does the itemisation add up? --\n";

$ok = PortalCostEstimateService::reconcile($db, $packages['ok'], 'discounted');
check('a package whose covered amounts match the discounted price reconciles',
    $ok['state'] === 'reconciled', json_encode($ok['state']));
check('and its lines come back to be copied', count($ok['lines']) === 3, (string) count($ok['lines']));
check('the line totals sum to the quoted figure', $ok['item_total'] === '9000.00', $ok['item_total']);

$okStd = PortalCostEstimateService::reconcile($db, $packages['ok'], 'standard');
check('the same package reconciles against the standard price by the other route',
    $okStd['state'] === 'reconciled', json_encode($okStd['state']));
check('and that route gives a different, larger total', $okStd['item_total'] === '10000.00', $okStd['item_total']);

$off = PortalCostEstimateService::reconcile($db, $packages['off'], 'discounted');
check('a package that is 100 short does not reconcile', $off['state'] === 'unavailable', json_encode($off['state']));
check('no lines are offered when it does not add up', $off['lines'] === []);
check('and the desk is told by how much it is out',
    str_contains((string) $off['note'], '100.00'), (string) $off['note']);

$none = PortalCostEstimateService::reconcile($db, $packages['empty'], 'standard');
check('a package with no items at all reports "none", not a failure',
    $none['state'] === 'none', json_encode($none['state']));
check('and says so in a sentence the desk can act on',
    str_contains((string) $none['note'], 'no itemised list'), (string) $none['note']);

check('an unknown package is refused rather than priced',
    PortalCostEstimateService::reconcile($db, 999999, 'standard')['state'] === 'none');

// Nothing is massaged into place. If a line total were scaled or rounded to make
// the sum fit, the "off" package above would reconcile, and it must not.
check('nothing is scaled or rounded to force a match',
    PortalCostEstimateService::reconcile($db, $packages['off'], 'standard')['state'] === 'unavailable');

// --------------------------------------------------------------------------
// 2. The catalogue the patient browses.
// --------------------------------------------------------------------------
echo "\n-- The price list --\n";

$catalogue = PortalCostEstimateService::catalogue();
$labels = array_column($catalogue['items'], 'label');

check('the catalogue returns the visible packages', count($catalogue['items']) > 0, json_encode($labels));
check('it carries the five standing caveats', count($catalogue['caveats']) === 5, (string) count($catalogue['caveats']));
check('it says "this is an estimate, not a bill" first',
    str_contains($catalogue['caveats'][0], 'not a bill'), $catalogue['caveats'][0]);
check('it warns that out-of-hours care costs more',
    (bool) array_filter($catalogue['caveats'], static fn($c) => stripos($c, 'out-of-hours') !== false));
check('it says what the insurer pays is their decision',
    (bool) array_filter($catalogue['caveats'], static fn($c) => stripos($c, 'insurer') !== false));

$okRow = null;
$offRow = null;

foreach ($catalogue['items'] as $i) {
    if ($i['package_id'] === $packages['ok']) { $okRow = $i; }
    if ($i['package_id'] === $packages['off']) { $offRow = $i; }
}

check('both prices are published, labelled, rather than one being chosen here',
    $okRow !== null && $okRow['standard_total'] === '10000.00' && $okRow['discounted_total'] === '9000.00',
    json_encode([$okRow['standard_total'] ?? null, $okRow['discounted_total'] ?? null]));
check('a package that can be shown line by line says so',
    ($okRow['has_breakdown'] ?? null) === true);
check('one that cannot says so too, rather than leaving it to be discovered',
    ($offRow['has_breakdown'] ?? null) === false);
check('the currency comes from settings, not a hardcoded symbol',
    ($catalogue['money']['currency_code'] ?? '') !== '' && isset($catalogue['money']['currency_symbol']),
    json_encode($catalogue['money']));

// --------------------------------------------------------------------------
// 3. Asking. A question is a question.
// --------------------------------------------------------------------------
echo "\n-- A patient asks what something costs --\n";

$res = PortalCostEstimateService::request($patientId, [], $patientUser);
check('asking about nothing at all is refused', empty($res['success']), json_encode($res));
check('and the refusal names the field', isset($res['errors']['asked_about']));

$res = PortalCostEstimateService::request($patientId, ['package_id' => 999999], $patientUser);
check('asking about a package that is not published is refused', empty($res['success']));
check('without confirming whether that package exists',
    !str_contains(strtolower(json_encode($res)), 'no such'), json_encode($res));

$res = PortalCostEstimateService::request($patientId, [
    'asked_about' => str_repeat('x', 256),
], $patientUser);
check('an over-long question is refused', empty($res['success']) && isset($res['errors']['asked_about']));

$res = PortalCostEstimateService::request($patientId, [
    'package_id' => $packages['ok'],
    'note' => 'Roughly how much, and can I pay in instalments?',
], $patientUser);
check('a patient can ask about a published package', !empty($res['success']), json_encode($res));

$requestId = (int) $db->query(
    "SELECT id FROM portal_estimate_requests WHERE patient_id = {$patientId} AND deleted_at IS NULL ORDER BY id DESC LIMIT 1"
)->fetchColumn();

$row = $db->query("SELECT * FROM portal_estimate_requests WHERE id = {$requestId}")->fetch(PDO::FETCH_ASSOC);
check('the question is recorded as pending', ($row['status'] ?? '') === 'pending');
check('their own words are kept', str_contains((string) $row['note'], 'instalments'));

check('no estimate exists yet -- asking is not getting',
    (int) $db->query("SELECT COUNT(*) FROM portal_cost_estimates WHERE patient_id = {$patientId}")->fetchColumn() === 0);

$res = PortalCostEstimateService::request($patientId, ['asked_about' => 'A scope my doctor mentioned'], $patientUser);
check('free text is allowed, for the common case with no package', !empty($res['success']), json_encode($res));

// The cap exists so one patient cannot fill the desk's queue.
$res = PortalCostEstimateService::request($patientId, ['asked_about' => 'Another thing'], $patientUser);
check('a third question is still allowed at the default cap of 3', !empty($res['success']), json_encode($res));

$res = PortalCostEstimateService::request($patientId, ['asked_about' => 'A fourth thing'], $patientUser);
check('a fourth is refused once the cap is reached', empty($res['success']), json_encode($res));
check('and the refusal says how many are waiting rather than just "no"',
    str_contains((string) ($res['message'] ?? ''), '3'), (string) ($res['message'] ?? ''));

$extra = (int) $db->query(
    "SELECT id FROM portal_estimate_requests WHERE patient_id = {$patientId} AND deleted_at IS NULL ORDER BY id DESC LIMIT 1"
)->fetchColumn();

$res = PortalCostEstimateService::withdrawRequest($patientId, $extra, $patientUser);
check('a patient can take a question back', !empty($res['success']), json_encode($res));
check('withdrawing soft-deletes rather than inventing a status',
    $db->query("SELECT deleted_at FROM portal_estimate_requests WHERE id = {$extra}")->fetchColumn() !== null);

$queueIds = array_column(PortalCostEstimateService::queue('pending')['items'], 'id');
check('and it leaves the queue at the desk', !in_array($extra, $queueIds, true), json_encode($queueIds));

$res = PortalCostEstimateService::withdrawRequest($patientId, $extra, $patientUser);
check('withdrawing the same question twice is refused', empty($res['success']));

// --------------------------------------------------------------------------
// 4. Issuing. The snapshot.
// --------------------------------------------------------------------------
echo "\n-- The desk issues an estimate --\n";

$res = PortalCostEstimateService::issue(['patient_id' => 0, 'package_id' => $packages['ok']], $actorId);
check('issuing without a patient is refused', empty($res['success']) && isset($res['errors']['patient_id']));

$res = PortalCostEstimateService::issue(['patient_id' => $patientId, 'package_id' => 0], $actorId);
check('issuing without a package is refused', empty($res['success']) && isset($res['errors']['package_id']));

$res = PortalCostEstimateService::issue([
    'patient_id' => $patientId, 'package_id' => $packages['ok'], 'price_basis' => 'whatever',
], $actorId);
check('an invented price basis is refused', empty($res['success']) && isset($res['errors']['price_basis']));

$res = PortalCostEstimateService::issue([
    'patient_id' => 999999, 'package_id' => $packages['ok'], 'price_basis' => 'standard',
], $actorId);
check('issuing to a patient who is not on file is refused', empty($res['success']) && isset($res['errors']['patient_id']));

$res = PortalCostEstimateService::issue([
    'patient_id' => $patientId,
    'package_id' => $packages['ok'],
    'price_basis' => 'discounted',
    'request_id' => $requestId,
    'note_to_patient' => 'Your surgeon has asked for one extra night, which is not in this figure.',
], $actorId);

check('the desk can issue an estimate', !empty($res['success']), json_encode($res));

$estimateId = (int) ($res['data']['id'] ?? 0);
$estimateNo = (string) ($res['data']['estimate_no'] ?? '');

check('it gets a reference the patient can quote', preg_match('/^EST-\d{4}-\d{4}$/', $estimateNo) === 1, $estimateNo);

$est = $db->query("SELECT * FROM portal_cost_estimates WHERE id = {$estimateId}")->fetch(PDO::FETCH_ASSOC);

check('the quoted figure is the basis the desk chose', (string) $est['quoted_total'] === '9000.00', (string) $est['quoted_total']);
check('both prices are kept, so the choice is auditable',
    (string) $est['standard_total'] === '10000.00' && (string) $est['discounted_total'] === '9000.00');
check('the currency is snapshotted onto the row', ($est['currency_code'] ?? '') !== '');
check('the inclusions prose is snapshotted', !empty($est['includes_text']));
check('a fingerprint of the source prices is recorded', strlen((string) $est['source_fingerprint']) === 64);
check('priced_at is stamped', !empty($est['priced_at']));
check('it is valid until a date rather than for ever', !empty($est['valid_until']));
check('the breakdown state is recorded as reconciled', ($est['breakdown_state'] ?? '') === 'reconciled');

check('the lines were copied',
    (int) $db->query("SELECT COUNT(*) FROM portal_cost_estimate_lines WHERE estimate_id = {$estimateId}")->fetchColumn() === 3);

check('the copied lines sum to the quoted figure',
    (string) $db->query("SELECT SUM(line_total) FROM portal_cost_estimate_lines WHERE estimate_id = {$estimateId}")->fetchColumn() === '9000.00',
    (string) $db->query("SELECT SUM(line_total) FROM portal_cost_estimate_lines WHERE estimate_id = {$estimateId}")->fetchColumn());

check('the question it answers is marked answered and linked',
    (string) $db->query("SELECT status FROM portal_estimate_requests WHERE id = {$requestId}")->fetchColumn() === 'answered');
check('and points at the estimate',
    (int) $db->query("SELECT estimate_id FROM portal_estimate_requests WHERE id = {$requestId}")->fetchColumn() === $estimateId);

// --------------------------------------------------------------------------
// 5. The snapshot holds. This is the whole phase.
// --------------------------------------------------------------------------
echo "\n-- The figure does not move when the price list does --\n";

check('the estimate is not stale when nothing has changed',
    PortalCostEstimateService::isStale($estimateId) === false,
    var_export(PortalCostEstimateService::isStale($estimateId), true));

$db->prepare('UPDATE billing_service_packages SET discounted_price = discounted_price + 1500 WHERE id = ?')
   ->execute([$packages['ok']]);

$after = PortalCostEstimateService::show($patientId, $estimateId);

check('after the package is repriced, the patient still sees the figure they were quoted',
    $after['quoted_total'] === '9000.00', $after['quoted_total']);
check('and the lines still sum to it',
    array_sum(array_map(static fn($l) => (float) $l['line_total'], $after['lines'])) === 9000.0);
check('but the desk can tell the estimate has been overtaken',
    PortalCostEstimateService::isStale($estimateId) === true,
    var_export(PortalCostEstimateService::isStale($estimateId), true));

$db->prepare('UPDATE billing_service_packages SET discounted_price = discounted_price - 1500 WHERE id = ?')
   ->execute([$packages['ok']]);

check('putting the price back clears the staleness again',
    PortalCostEstimateService::isStale($estimateId) === false);

check('staleness is unknowable for an estimate that does not exist',
    PortalCostEstimateService::isStale(999999) === null);

// --------------------------------------------------------------------------
// 6. What the patient reads.
// --------------------------------------------------------------------------
echo "\n-- What the patient reads --\n";

$mine = PortalCostEstimateService::mine($patientId);

check('the patient sees their estimate', count($mine['estimates']) === 1, (string) count($mine['estimates']));
check('and their outstanding questions', count($mine['requests']) >= 1);

$shown = $mine['estimates'][0];

check('money is pre-formatted with the estimate\'s own currency',
    isset($shown['quoted_display']) && str_contains($shown['quoted_display'], '9,000'), $shown['quoted_display'] ?? '');
check('it is not presented as expired on the day it was issued', $shown['expired'] === false);
check('it carries a sentence to show rather than a bare status',
    str_contains($shown['status_text'], 'expect'), $shown['status_text']);
check('it says whether cover is on file', isset($shown['insurance_on_file']));

// Both branches matter and they say different things, so both are asserted.
// insurance_on_file is snapshotted at issue time -- an estimate must not start
// claiming cover because a card was added afterwards -- so the second branch
// needs its own estimate issued after the cover exists.
check('with no cover recorded, it says the patient would pay this',
    $shown['insurance_on_file'] === false
    && str_contains($shown['insurance_text'], 'what you would pay'), $shown['insurance_text']);

$db->prepare('INSERT INTO patient_insurances (patient_id, insurance_id, created_at) VALUES (?, ?, NOW())')
   ->execute([$patientId, $world['insurer_id']]);

$withCover = PortalCostEstimateService::issue([
    'patient_id' => $patientId, 'package_id' => $packages['ok'], 'price_basis' => 'standard',
], $actorId);
$withCoverId = (int) ($withCover['data']['id'] ?? 0);
$coverEst = PortalCostEstimateService::show($patientId, $withCoverId);

check('with cover recorded, the estimate notes it', $coverEst['insurance_on_file'] === true);
check('and says plainly that what the insurer pays is their decision',
    str_contains($coverEst['insurance_text'], 'their decision'), $coverEst['insurance_text']);
check('while still quoting the full price rather than a share of it',
    $coverEst['quoted_total'] === '10000.00', $coverEst['quoted_total']);

// The earlier estimate was issued before the cover existed and must not have
// changed its mind about it.
check('the estimate issued before the cover still reads as it did',
    PortalCostEstimateService::show($patientId, $estimateId)['insurance_on_file'] === false);

$db->prepare('DELETE FROM patient_insurances WHERE patient_id = ?')->execute([$patientId]);
$db->prepare('DELETE FROM portal_cost_estimates WHERE id = ?')->execute([$withCoverId]);

$full = PortalCostEstimateService::show($patientId, $estimateId);

check('opening it gives the lines', count($full['lines']) === 3);
check('each line carries a display string, not a raw number to format',
    isset($full['lines'][0]['line_display']) && $full['lines'][0]['line_display'] !== '');
check('the desk\'s note reaches the patient',
    str_contains((string) $full['note_to_patient'], 'extra night'));
check('a reconciled estimate shows no apology for a missing breakdown',
    $full['breakdown_note'] === null, var_export($full['breakdown_note'], true));

check('another patient\'s estimate is not readable',
    PortalCostEstimateService::show($patientId + 9999, $estimateId) === null);
check('nor is an estimate that does not exist',
    PortalCostEstimateService::show($patientId, 999999) === null);

// --------------------------------------------------------------------------
// 7. The two cases where no breakdown can be shown.
// --------------------------------------------------------------------------
echo "\n-- When the itemisation cannot be shown --\n";

$res = PortalCostEstimateService::issue([
    'patient_id' => $patientId, 'package_id' => $packages['off'], 'price_basis' => 'discounted',
], $actorId);
$offId = (int) ($res['data']['id'] ?? 0);
$offEst = PortalCostEstimateService::show($patientId, $offId);

check('an estimate from a package that does not add up is still issued',
    !empty($res['success']), json_encode($res));
check('its breakdown state says unavailable', $offEst['breakdown_state'] === 'unavailable');
check('no lines were copied',
    (int) $db->query("SELECT COUNT(*) FROM portal_cost_estimate_lines WHERE estimate_id = {$offId}")->fetchColumn() === 0);

// The diagnostic is for the desk. It names the hospital's own arithmetic
// failure, in raw unformatted figures, and must not reach a patient.
$storedNote = (string) $db->query("SELECT breakdown_note FROM portal_cost_estimates WHERE id = {$offId}")->fetchColumn();

check('the desk keeps the arithmetic in the row', str_contains($storedNote, 'difference of'), $storedNote);
check('but the patient is NOT shown the discrepancy',
    !str_contains((string) $offEst['breakdown_note'], 'difference of'), (string) $offEst['breakdown_note']);
check('nor any raw figure from it',
    !str_contains((string) $offEst['breakdown_note'], '17900'), (string) $offEst['breakdown_note']);
check('they are told it is priced as one bundle instead',
    str_contains((string) $offEst['breakdown_note'], 'one bundle'), (string) $offEst['breakdown_note']);

$res = PortalCostEstimateService::issue([
    'patient_id' => $patientId, 'package_id' => $packages['empty'], 'price_basis' => 'standard',
], $actorId);
$emptyId = (int) ($res['data']['id'] ?? 0);
$emptyEst = PortalCostEstimateService::show($patientId, $emptyId);

check('a package with no items can still be estimated', !empty($res['success']), json_encode($res));
check('its breakdown state is none', $emptyEst['breakdown_state'] === 'none');
check('and the patient gets the same plain sentence',
    str_contains((string) $emptyEst['breakdown_note'], 'one bundle'));

// --------------------------------------------------------------------------
// 8. Declining, and withdrawing an estimate.
// --------------------------------------------------------------------------
echo "\n-- Declining and withdrawing --\n";

$openId = (int) $db->query(
    "SELECT id FROM portal_estimate_requests
      WHERE patient_id = {$patientId} AND status = 'pending' AND deleted_at IS NULL
      ORDER BY id LIMIT 1"
)->fetchColumn();

$res = PortalCostEstimateService::decline($openId, [], $actorId);
check('declining without a reason is refused', empty($res['success']) && isset($res['errors']['review_note']));

$res = PortalCostEstimateService::decline($openId, [
    'review_note' => 'We cannot price this until your surgeon decides what is needed.',
], $actorId);
check('declining with a reason is accepted', !empty($res['success']), json_encode($res));

$row = $db->query("SELECT status, review_note FROM portal_estimate_requests WHERE id = {$openId}")->fetch(PDO::FETCH_ASSOC);
check('the question is marked declined', ($row['status'] ?? '') === 'declined');
check('and the reason the patient will read is stored', !empty($row['review_note']));

$mine = PortalCostEstimateService::mine($patientId);
$declined = null;

foreach ($mine['requests'] as $r) {
    if ($r['id'] === $openId) { $declined = $r; }
}

check('the patient sees the decline with its reason',
    $declined !== null && str_contains((string) $declined['review_note'], 'surgeon'), json_encode($declined));

$res = PortalCostEstimateService::decline($openId, ['review_note' => 'Again'], $actorId);
check('declining the same question twice is refused', empty($res['success']));

$before = count(PortalCostEstimateService::mine($patientId)['estimates']);

$res = PortalCostEstimateService::withdrawEstimate($offId, [], $actorId);
check('withdrawing an estimate without a reason is refused', empty($res['success']) && isset($res['errors']['reason']));

$res = PortalCostEstimateService::withdrawEstimate($offId, ['reason' => 'Priced from the wrong package.'], $actorId);
check('the desk can withdraw an estimate', !empty($res['success']), json_encode($res));

check('the patient no longer sees it',
    count(PortalCostEstimateService::mine($patientId)['estimates']) === $before - 1);
check('but the row is kept, with the reason, so the history is answerable',
    (string) $db->query("SELECT withdraw_reason FROM portal_cost_estimates WHERE id = {$offId}")->fetchColumn() !== '');
check('and the patient cannot open it any more',
    PortalCostEstimateService::show($patientId, $offId) === null);

$res = PortalCostEstimateService::withdrawEstimate($offId, ['reason' => 'Again'], $actorId);
check('withdrawing it twice is refused', empty($res['success']));

// --------------------------------------------------------------------------
// 9. Expiry, computed on read.
// --------------------------------------------------------------------------
echo "\n-- Expiry --\n";

$db->prepare('UPDATE portal_cost_estimates SET valid_until = ? WHERE id = ?')
   ->execute([date('Y-m-d', strtotime('-1 day')), $estimateId]);

$expired = PortalCostEstimateService::show($patientId, $estimateId);

check('an estimate past its date reads as expired', $expired['expired'] === true);
check('and says what to do about it',
    str_contains($expired['status_text'], 'current one'), $expired['status_text']);
check('but is still readable, rather than vanishing',
    $expired['quoted_total'] === '9000.00', $expired['quoted_total']);

$db->prepare('UPDATE portal_cost_estimates SET valid_until = ? WHERE id = ?')
   ->execute([date('Y-m-d', strtotime('+30 days')), $estimateId]);

check('putting the date back makes it current again',
    PortalCostEstimateService::show($patientId, $estimateId)['expired'] === false);

// --------------------------------------------------------------------------
// 10. The desk's package screen.
// --------------------------------------------------------------------------
echo "\n-- The desk's view of the packages --\n";

$deskPackages = PortalCostEstimateService::packages('Zz Test');
$byId = [];

foreach ($deskPackages['items'] as $p) {
    $byId[$p['package_id']] = $p;
}

check('the desk sees the fixture packages', count($deskPackages['items']) >= 2, (string) count($deskPackages['items']));
check('each one reports both bases separately',
    isset($byId[$packages['ok']]['breakdown']['standard']['state'], $byId[$packages['ok']]['breakdown']['discounted']['state']));
check('the reconciling package reports reconciled at both',
    $byId[$packages['ok']]['breakdown']['standard']['state'] === 'reconciled'
    && $byId[$packages['ok']]['breakdown']['discounted']['state'] === 'reconciled');
check('the failing one reports unavailable at both',
    $byId[$packages['off']]['breakdown']['standard']['state'] === 'unavailable'
    && $byId[$packages['off']]['breakdown']['discounted']['state'] === 'unavailable');
check('and the desk is told why in figures',
    str_contains((string) $byId[$packages['off']]['breakdown']['discounted']['note'], 'difference of'));
check('whether a package reaches patients is answered in a sentence',
    str_starts_with($byId[$packages['ok']]['reaches_patients']['why'], 'Yes'),
    $byId[$packages['ok']]['reaches_patients']['why']);

$res = PortalCostEstimateService::saveVisibility([
    'package_id' => $packages['off'],
    'patient_label' => '',
], $actorId);
check('saving with no patient-facing name is refused', empty($res['success']) && isset($res['errors']['patient_label']));

$res = PortalCostEstimateService::saveVisibility([
    'package_id' => $packages['off'],
    'patient_label' => 'Zz Test Package (does not reconcile)',
    'is_patient_visible' => 0,
    'hide_reason' => 'Fixture: hidden to prove the switch works.',
], $actorId);
check('an admin can switch a package off for patients', !empty($res['success']), json_encode($res));

$hidden = array_column(PortalCostEstimateService::catalogue()['items'], 'package_id');
check('a hidden package leaves the patient catalogue', !in_array($packages['off'], $hidden, true), json_encode($hidden));

$res = PortalCostEstimateService::request($patientId, ['package_id' => $packages['off']], $patientUser);
check('and can no longer be asked about', empty($res['success']), json_encode($res));

$deskAfter = PortalCostEstimateService::packages('Zz Test');

foreach ($deskAfter['items'] as $p) {
    if ($p['package_id'] === $packages['off']) {
        check('the desk is told why it is hidden rather than left guessing',
            str_contains($p['reaches_patients']['why'], 'prove the switch works'),
            $p['reaches_patients']['why']);
    }
}

// Put it back, so a second run starts where the first did.
PortalCostEstimateService::saveVisibility([
    'package_id' => $packages['off'],
    'patient_label' => 'Zz Test Package (does not reconcile)',
    'is_patient_visible' => 1,
    'sequence' => 900,
], $actorId);

// --------------------------------------------------------------------------
// 11. Wiring: capability, roles, numbering, money formatting.
// --------------------------------------------------------------------------
echo "\n-- Wiring --\n";

check('the capability constant exists', PortalGuard::CAP_COST_ESTIMATES === 'mychart_cost_estimates');
check('it is granted to the patient role by seed 077',
    (int) $db->query(
        "SELECT COUNT(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id
          WHERE r.name = 'patient' AND rp.capability = 'mychart_cost_estimates' AND rp.is_granted = 1"
    )->fetchColumn() === 1);

check('the notification type is seeded',
    (int) $db->query("SELECT COUNT(*) FROM portal_notification_types WHERE event_type = 'estimate_ready'")->fetchColumn() === 1);
check('and it carries no money amount in its wording',
    !preg_match('/[0-9]{3,}/', (string) $db->query(
        "SELECT body_template FROM portal_notification_types WHERE event_type = 'estimate_ready'"
    )->fetchColumn()));

check('issuing is restricted to billing and reception',
    PortalCostEstimateService::ISSUE_ROLES === ['admin', 'receptionist'], json_encode(PortalCostEstimateService::ISSUE_ROLES));
check('changing patient-facing wording is admin only',
    PortalCostEstimateService::EDIT_ROLES === ['admin'], json_encode(PortalCostEstimateService::EDIT_ROLES));
check('but the whole desk may read the queue',
    in_array('nurse', PortalCostEstimateService::REVIEW_ROLES, true));

// Estimate numbers must not collide, and must not borrow the hospital's own
// document counters.
$nos = $db->query("SELECT estimate_no FROM portal_cost_estimates ORDER BY id")->fetchAll(PDO::FETCH_COLUMN);
check('every estimate number is distinct', count($nos) === count(array_unique($nos)), json_encode($nos));
check('they are year-scoped and sequential',
    (bool) array_filter($nos, static fn($n) => str_starts_with((string) $n, 'EST-' . date('Y') . '-')), json_encode($nos));

$formatted = PortalCostEstimateService::formatMoney('1234.5', [
    'currency_symbol' => '#', 'currency_position' => 'suffix', 'decimal_places' => 1,
]);
check('money is formatted from the snapshot, symbol and position included',
    $formatted === '1,234.5#', $formatted);

$zeroPlaces = PortalCostEstimateService::formatMoney('99.99', [
    'currency_symbol' => 'K', 'currency_position' => 'prefix', 'decimal_places' => 0,
]);
check('a currency with no decimal places is respected', $zeroPlaces === 'K100', $zeroPlaces);

// --------------------------------------------------------------------------
echo "\n-- Cleaning up --\n";

$db->prepare('DELETE FROM portal_estimate_requests WHERE patient_id = ?')->execute([$patientId]);
$db->prepare('DELETE FROM portal_cost_estimates WHERE patient_id = ?')->execute([$patientId]);

check('the estimates this suite wrote are gone',
    (int) $db->query("SELECT COUNT(*) FROM portal_cost_estimates WHERE patient_id = {$patientId}")->fetchColumn() === 0);
check('and so are their lines, by cascade',
    (int) $db->query("SELECT COUNT(*) FROM portal_cost_estimate_lines")->fetchColumn() === 0);

echo "\n==================================================\n";
echo "   {$pass} passed, {$fail} failed\n";
echo "==================================================\n";
echo "  (database: {$database} -- safe to drop at any time)\n";

exit($fail > 0 ? 1 : 0);
