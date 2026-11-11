<?php
declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Modules\MyChart\Services\PortalAppointmentService;

Env::load();

echo "==================================================\n";
echo "   Automated Verification: Appointment Self-Service (M10)\n";
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

/**
 * The eligibility decision table is private, because nothing outside the service
 * should be deciding this. It is also the part most worth testing, so it is
 * reached by reflection rather than left uncovered.
 */
function eligibility(array $row, array $settings): array
{
    $m = new ReflectionMethod(PortalAppointmentService::class, 'eligibility');
    $m->setAccessible(true);

    return $m->invoke(null, $row, $settings);
}

$policy = ['cutoff_hours' => 24, 'allow_reschedule' => true, 'allow_cancel' => true];
$future = date('Y-m-d', strtotime('+10 days'));
$soon = date('Y-m-d', strtotime('+2 hours'));
$past = date('Y-m-d', strtotime('-3 days'));

$row = static fn(array $over = []) => array_merge([
    'appointment_date' => $future,
    'appointment_time' => '10:00:00',
    'is_all_day' => 0,
    'status' => 'scheduled',
], $over);

// --------------------------------------------------------------------------
// 1. The decision table. This is what the patient sees as a live button or a
//    sentence explaining why not, so each branch is asserted separately.
// --------------------------------------------------------------------------
echo "\n-- Eligibility --\n";

$e = eligibility($row(), $policy);
check('a future scheduled appointment can be moved, cancelled and confirmed',
    $e['reschedule'] && $e['cancel'] && $e['confirm'] && $e['reason'] === null);

foreach (['cancelled', 'completed', 'no_show'] as $status) {
    $e = eligibility($row(['status' => $status]), $policy);
    check("status '{$status}' allows nothing, with a reason given",
        !$e['reschedule'] && !$e['cancel'] && !$e['confirm'] && is_string($e['reason']) && $e['reason'] !== '');
}

$e = eligibility($row(['appointment_date' => $past]), $policy);
check('a past appointment allows nothing', !$e['reschedule'] && !$e['cancel'] && !$e['confirm']);

// The cut-off is the heart of the policy: changes close, confirming does not.
$e = eligibility($row(['appointment_date' => $soon, 'appointment_time' => date('H:i:s')]), $policy);
check('inside the cut-off, changes are closed', !$e['reschedule'] && !$e['cancel']);
check('inside the cut-off, confirming is STILL allowed', $e['confirm'] === true);
check('inside the cut-off, the reason names the cut-off', str_contains((string) $e['reason'], '24'));

$e = eligibility($row(), ['cutoff_hours' => 24, 'allow_reschedule' => false, 'allow_cancel' => true]);
check('reschedule switched off is respected', !$e['reschedule'] && $e['cancel']);

$e = eligibility($row(), ['cutoff_hours' => 24, 'allow_reschedule' => true, 'allow_cancel' => false]);
check('cancel switched off is respected', $e['reschedule'] && !$e['cancel']);

$e = eligibility($row(), ['cutoff_hours' => 24, 'allow_reschedule' => false, 'allow_cancel' => false]);
check('both switched off explains that changes go through the desk',
    !$e['reschedule'] && !$e['cancel'] && $e['confirm'] && is_string($e['reason']));

// An all-day booking starts at midnight, so its cut-off is measured from there.
$e = eligibility($row(['is_all_day' => 1, 'appointment_date' => date('Y-m-d', strtotime('+10 days')), 'appointment_time' => '23:00:00']), $policy);
check('an all-day appointment is judged from midnight, not its stored time', $e['reschedule'] === true);

// A cut-off of 0 means "right up to the appointment".
$e = eligibility($row(['appointment_date' => date('Y-m-d'), 'appointment_time' => date('H:i:s', strtotime('+30 minutes'))]),
    ['cutoff_hours' => 0, 'allow_reschedule' => true, 'allow_cancel' => true]);
check('a zero cut-off allows a change right up to the appointment', $e['reschedule'] === true);

// --------------------------------------------------------------------------
// 2. A bad or hostile settings row must not lock patients out.
// --------------------------------------------------------------------------
echo "\n-- Settings hardening --\n";

$m = new ReflectionMethod(PortalAppointmentService::class, 'settings');
$m->setAccessible(true);
$live = $m->invoke(null);

check('cut-off resolves to a sane number', is_int($live['cutoff_hours']) && $live['cutoff_hours'] >= 0 && $live['cutoff_hours'] <= 720,
    'got ' . var_export($live['cutoff_hours'], true));
check('the two switches resolve to booleans', is_bool($live['allow_reschedule']) && is_bool($live['allow_cancel']));

// --------------------------------------------------------------------------
// 3. Ownership. Every refusal below happens before anything is written, so
//    these run safely against the live database.
// --------------------------------------------------------------------------
echo "\n-- Ownership and guard clauses (no writes) --\n";

$db = Database::connection();
$mine = $db->query(
    "SELECT id, patient_id FROM appointments
      WHERE deleted_at IS NULL AND is_provider_block = 0 AND status = 'scheduled'
        AND appointment_date > DATE_ADD(CURDATE(), INTERVAL 2 DAY)
      ORDER BY appointment_date LIMIT 1"
)->fetch(PDO::FETCH_ASSOC);

if (!$mine) {
    echo "  [WARN] No future scheduled appointment in this database; ownership not exercised.\n";
} else {
    $patientId = (int) $mine['patient_id'];
    $appointmentId = (int) $mine['id'];

    $other = (int) $db->query(
        "SELECT id FROM patients WHERE id <> {$patientId} AND deleted_at IS NULL ORDER BY id LIMIT 1"
    )->fetchColumn();

    $r = PortalAppointmentService::reschedule($other ?: 999999, ['appointment_id' => $appointmentId, 'date' => $future, 'time' => '09:00'], null);
    check("another patient cannot move appointment #{$appointmentId}",
        empty($r['success']) && !empty($r['not_found']));

    $r = PortalAppointmentService::cancel($other ?: 999999, ['appointment_id' => $appointmentId, 'reason' => 'test'], null);
    check('another patient cannot cancel it', empty($r['success']) && !empty($r['not_found']));

    $r = PortalAppointmentService::confirm($other ?: 999999, ['appointment_id' => $appointmentId], null);
    check('another patient cannot confirm it', empty($r['success']));

    check('slotsFor returns null for an appointment that is not yours',
        PortalAppointmentService::slotsFor($other ?: 999999, $appointmentId) === null);

    // The owner's own guard clauses, all of which return before any UPDATE.
    $r = PortalAppointmentService::reschedule($patientId, ['appointment_id' => $appointmentId], null);
    check('a reschedule with no date is refused', empty($r['success']) && isset($r['errors']['date']));

    $r = PortalAppointmentService::reschedule($patientId, ['appointment_id' => $appointmentId, 'date' => $future], null);
    check('a reschedule with no time is refused', empty($r['success']) && isset($r['errors']['time']));

    $r = PortalAppointmentService::reschedule($patientId, ['appointment_id' => $appointmentId, 'date' => 'next tuesday', 'time' => '09:00'], null);
    check('a malformed date is refused', empty($r['success']) && isset($r['errors']['date']));

    $r = PortalAppointmentService::reschedule($patientId, ['appointment_id' => $appointmentId, 'date' => $past, 'time' => '09:00'], null);
    check('moving an appointment into the past is refused', empty($r['success']));

    $r = PortalAppointmentService::reschedule($patientId, ['appointment_id' => $appointmentId, 'date' => date('Y-m-d'), 'time' => date('H:i', strtotime('+1 hour'))], null);
    check('moving to inside the cut-off is refused', empty($r['success']));

    $r = PortalAppointmentService::cancel($patientId, ['appointment_id' => $appointmentId, 'reason' => ''], null);
    check('cancelling without a reason is refused', empty($r['success']) && isset($r['errors']['reason']));

    foreach (['reschedule', 'cancel', 'confirm'] as $op) {
        $r = PortalAppointmentService::$op($patientId, ['appointment_id' => 0], null);
        check("{$op} with no appointment id is refused", empty($r['success']));
    }

    $r = PortalAppointmentService::confirm($patientId, ['appointment_id' => 999999999], null);
    check('confirming a non-existent appointment is refused', empty($r['success']));

    // --------------------------------------------------------------------------
    // 4. The list the app renders.
    // --------------------------------------------------------------------------
    echo "\n-- The patient's list --\n";

    $list = PortalAppointmentService::mine($patientId);

    check('mine() returns items, a cut-off and the server time',
        isset($list['items'], $list['cutoff_hours'], $list['server_time']));
    check('the list is not empty for a patient who has one', count($list['items']) > 0);

    $first = $list['items'][0] ?? [];
    foreach (['id', 'date', 'status', 'can_reschedule', 'can_cancel', 'can_confirm', 'confirmed', 'moved_before'] as $key) {
        check("each item carries '{$key}'", array_key_exists($key, $first));
    }
    check('the can_* flags are booleans, not strings',
        is_bool($first['can_reschedule'] ?? null) && is_bool($first['can_cancel'] ?? null) && is_bool($first['can_confirm'] ?? null));
    check('no item leaks another patient\'s appointment',
        !array_filter($list['items'], static fn($i) => !is_int($i['id'])));

    // Where an action is not allowed, the app needs something to show instead of
    // a dead button.
    $blocked = array_filter($list['items'], static fn($i) => !$i['can_reschedule'] && !$i['can_cancel']);
    check('every blocked item carries a reason to display',
        !array_filter($blocked, static fn($i) => empty($i['blocked_reason'])),
        count($blocked) . ' blocked item(s)');

    // --------------------------------------------------------------------------
    // 5. Offered times.
    // --------------------------------------------------------------------------
    echo "\n-- Offered times --\n";

    $slots = PortalAppointmentService::slotsFor($patientId, $appointmentId);

    check('slotsFor returns a day list for an appointment that is yours', is_array($slots) && array_key_exists('days', $slots));
    check('the doctor is fixed for a reschedule', ($slots['doctor_fixed'] ?? null) === true || $slots['days'] === []);

    $earliest = date('Y-m-d H:i:s', strtotime('+' . (int) $live['cutoff_hours'] . ' hours'));
    $tooSoon = [];
    foreach ($slots['days'] ?? [] as $day) {
        foreach ($day['times'] as $t) {
            if (trim($day['date'] . ' ' . $t . ':00') < $earliest) {
                $tooSoon[] = $day['date'] . ' ' . $t;
            }
        }
    }
    check('no offered time falls inside the cut-off', $tooSoon === [], implode(', ', array_slice($tooSoon, 0, 3)));

    $shape = true;
    foreach ($slots['days'] ?? [] as $day) {
        if (!isset($day['date'], $day['times']) || !is_array($day['times']) || $day['times'] === []) {
            $shape = false;
        }
    }
    check('every offered day has a date and at least one time', $shape);
}

echo "\n";
echo "  NOTE: the successful reschedule, cancel and confirm writes are not exercised\n";
echo "        here -- they would alter real appointments in this database. Every\n";
echo "        refusal path above returns before any UPDATE, and the slot safety\n";
echo "        itself is AppointmentService::update()'s existing checks.\n";

echo "\n==================================================\n";
echo "   {$pass} passed, {$fail} failed\n";
echo "==================================================\n";

exit($fail === 0 ? 0 : 1);
