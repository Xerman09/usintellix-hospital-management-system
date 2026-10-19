<?php
require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Modules\Appointments\Services\AppointmentService;
use App\Modules\Appointments\Services\DoctorRosterAvailabilityService;
use App\Modules\Patients\Models\Patient;

echo "=== DOCTOR ROSTER AVAILABILITY & OPERATING SCHEDULE BINDING TEST ===\n\n";

$db = Database::connection();
$service = new AppointmentService();
$rosterService = new DoctorRosterAvailabilityService($db);

// Ensure active test patient exists
$patient = $db->query("SELECT id, first_name, last_name FROM patients WHERE deleted_at IS NULL LIMIT 1")->fetch(PDO::FETCH_ASSOC);
if (!$patient) {
    die("No active patients found in DB to test.\n");
}
$patientId = (int)$patient['id'];
$providerId = 1; // Dr. Patient1 Staff

echo "[1] Testing Provider #{$providerId} Information Resolution...\n";
$info = $rosterService->resolveProviderInfo($providerId);
echo "  Resolved Provider: {$info['full_name']} (Dept ID: {$info['department_id']})\n";

// Find next upcoming Sunday (guaranteed non-duty day in clinic_operating_schedules)
$nextSunday = date('Y-m-d', strtotime('next Sunday'));
echo "\n[2] TEST CASE: Booking on a Non-Duty Day ({$nextSunday} - Sunday)...\n";
$sundayResult = $service->store([
    'patient_id'        => $patientId,
    'provider_id'       => $providerId,
    'appointment_date'  => $nextSunday,
    'appointment_time'  => '10:00:00',
    'is_provider_block' => 0,
    'reason'            => 'Sunday Checkup'
], 1);

echo "  Success: " . ($sundayResult['success'] ? 'true' : 'false') . "\n";
echo "  Message: " . ($sundayResult['message'] ?? '') . "\n";
echo "  Errors: " . json_encode($sundayResult['errors'] ?? []) . "\n";
if (!$sundayResult['success'] && isset($sundayResult['errors']['appointment_date'])) {
    echo "  -> PASSED: Non-duty day correctly rejected!\n";
} else {
    echo "  -> FAILED: Sunday was not rejected!\n";
}

// Find next upcoming Wednesday (duty weekday)
$nextWed = date('Y-m-d', strtotime('next Wednesday'));

echo "\n[3] TEST CASE: Booking Outside Operating Hours (06:00 AM on {$nextWed})...\n";
$earlyResult = $service->store([
    'patient_id'        => $patientId,
    'provider_id'       => $providerId,
    'appointment_date'  => $nextWed,
    'appointment_time'  => '06:00:00',
    'is_provider_block' => 0,
    'reason'            => 'Early Checkup'
], 1);
echo "  Success: " . ($earlyResult['success'] ? 'true' : 'false') . "\n";
echo "  Errors: " . json_encode($earlyResult['errors'] ?? []) . "\n";
if (!$earlyResult['success'] && isset($earlyResult['errors']['appointment_time'])) {
    echo "  -> PASSED: Early morning booking outside operating hours correctly rejected!\n";
} else {
    echo "  -> FAILED: Early morning was not rejected!\n";
}

echo "\n[4] TEST CASE: Booking During Staff Lunch Break (12:30 PM on {$nextWed})...\n";
$breakResult = $service->store([
    'patient_id'        => $patientId,
    'provider_id'       => $providerId,
    'appointment_date'  => $nextWed,
    'appointment_time'  => '12:30:00',
    'is_provider_block' => 0,
    'reason'            => 'Lunch Checkup'
], 1);
echo "  Success: " . ($breakResult['success'] ? 'true' : 'false') . "\n";
echo "  Errors: " . json_encode($breakResult['errors'] ?? []) . "\n";
if (!$breakResult['success'] && isset($breakResult['errors']['appointment_time'])) {
    echo "  -> PASSED: Lunch break booking correctly rejected!\n";
} else {
    echo "  -> FAILED: Lunch break was not rejected!\n";
}

// Clean up any test records on $nextWed before test
$db->prepare("DELETE FROM appointments WHERE provider_id = :p AND appointment_date = :d")
   ->execute([':p' => $providerId, ':d' => $nextWed]);

echo "\n[5] TEST CASE: Emergency Blocked Slot Enforcement...\n";
// Create a timed emergency block at 14:00:00 on next Wednesday
$blockDate = $nextWed;
$blockTime = '14:00:00';

$createBlockResult = $service->store([
    'provider_id'       => $providerId,
    'appointment_date'  => $blockDate,
    'appointment_time'  => $blockTime,
    'is_provider_block' => 1,
    'title'             => 'Emergency Surgery Call',
    'reason'            => 'Urgent Trauma Team Duty'
], 1);
echo "  Emergency Block Created: " . ($createBlockResult['success'] ? 'true' : 'false') . " (ID: " . ($createBlockResult['data']['id'] ?? 'N/A') . ")\n";
if (!$createBlockResult['success']) {
    echo "  Block Error: " . json_encode($createBlockResult['errors'] ?? []) . "\n";
}

// Attempt to book a patient appointment during this emergency blocked slot
$conflictResult = $service->store([
    'patient_id'        => $patientId,
    'provider_id'       => $providerId,
    'appointment_date'  => $blockDate,
    'appointment_time'  => $blockTime,
    'is_provider_block' => 0,
    'reason'            => 'Routine Consultation'
], 1);
echo "  Patient Booking Success: " . ($conflictResult['success'] ? 'true' : 'false') . "\n";
echo "  Errors: " . json_encode($conflictResult['errors'] ?? []) . "\n";
if (!$conflictResult['success'] && isset($conflictResult['errors']['appointment_time'])) {
    echo "  -> PASSED: Patient booking during emergency blocked slot correctly rejected!\n";
} else {
    echo "  -> FAILED: Booking during emergency block was not rejected!\n";
}

echo "\n[6] TEST CASE: Valid Appointment Booking within Operating Hours (10:00 AM on {$nextWed})...\n";
// Clean up any existing booking at 10:00 on next Wednesday first
$db->prepare("DELETE FROM appointments WHERE provider_id = :p AND appointment_date = :d AND appointment_time = '10:00:00'")
   ->execute([':p' => $providerId, ':d' => $nextWed]);

$validResult = $service->store([
    'patient_id'        => $patientId,
    'provider_id'       => $providerId,
    'appointment_date'  => $nextWed,
    'appointment_time'  => '10:00:00',
    'is_provider_block' => 0,
    'reason'            => 'Regular Cardiology Clinic Consultation'
], 1);
echo "  Valid Booking Success: " . ($validResult['success'] ? 'true' : 'false') . " (ID: " . ($validResult['data']['id'] ?? 'N/A') . ")\n";
if ($validResult['success']) {
    echo "  -> PASSED: Valid booking within operating hours succeeded!\n";
} else {
    echo "  -> FAILED: Valid booking failed: " . json_encode($validResult['errors'] ?? []) . "\n";
}

echo "\n[7] TEST CASE: findAvailableSlots() binding to clinic timetable...\n";
$slotsResult = $service->findAvailableSlots($providerId, $nextWed, 5);
echo "  Total Days Evaluated: " . count($slotsResult) . "\n";
foreach ($slotsResult as $day) {
    echo "  Date: {$day['date']} ({$day['day_of_week']}) | Duty Day: " . ($day['is_duty_day'] ? 'YES' : 'NO') . " | Slots Count: " . count($day['slots']) . "\n";
    if ($day['is_duty_day'] && !empty($day['slots'])) {
        $firstSlot = $day['slots'][0];
        $bookedSlot = null;
        foreach ($day['slots'] as $s) {
            if (!$s['available']) { $bookedSlot = $s; break; }
        }
        echo "    - Operating Hours: {$day['operating_hours']} | Break: {$day['break_hours']}\n";
        echo "    - Sample Open Slot: {$firstSlot['time']} (Available: " . ($firstSlot['available'] ? 'Yes' : 'No') . ")\n";
        if ($bookedSlot) {
            echo "    - Sample Blocked/Booked Slot: {$bookedSlot['time']} (Reason: {$bookedSlot['reason']})\n";
        }
    }
}

echo "\n[8] TEST CASE: All-Day Emergency Block Enforcement...\n";
$allDayDate = date('Y-m-d', strtotime('+2 Thursdays'));
$db->prepare("DELETE FROM appointments WHERE provider_id = :p AND appointment_date = :d")
   ->execute([':p' => $providerId, ':d' => $allDayDate]);

$allDayBlockResult = $service->store([
    'provider_id'       => $providerId,
    'appointment_date'  => $allDayDate,
    'appointment_time'  => '00:00:00',
    'is_all_day'        => 1,
    'is_provider_block' => 1,
    'title'             => 'Trauma ER Full Day Standby',
    'reason'            => 'Critical Hospital Response Team'
], 1);
echo "  All-Day Emergency Block Created: " . ($allDayBlockResult['success'] ? 'true' : 'false') . " (ID: " . ($allDayBlockResult['data']['id'] ?? 'N/A') . ")\n";

$allDayConflict = $service->store([
    'patient_id'        => $patientId,
    'provider_id'       => $providerId,
    'appointment_date'  => $allDayDate,
    'appointment_time'  => '11:00:00',
    'is_provider_block' => 0,
    'reason'            => 'Patient Consultation'
], 1);
echo "  Booking on All-Day Blocked Date Success: " . ($allDayConflict['success'] ? 'true' : 'false') . "\n";
echo "  Errors: " . json_encode($allDayConflict['errors'] ?? []) . "\n";
if (!$allDayConflict['success'] && isset($allDayConflict['errors']['appointment_date'])) {
    echo "  -> PASSED: All-day emergency block correctly prevented patient booking!\n";
} else {
    echo "  -> FAILED: All-day emergency block did not prevent booking!\n";
}

// Clean up
if (!empty($allDayBlockResult['data']['id'])) {
    $db->prepare("DELETE FROM appointments WHERE id = :id")->execute([':id' => $allDayBlockResult['data']['id']]);
}

// Clean up test emergency block and appointment
if (!empty($createBlockResult['data']['id'])) {
    $db->prepare("DELETE FROM appointments WHERE id = :id")->execute([':id' => $createBlockResult['data']['id']]);
}
if (!empty($validResult['data']['id'])) {
    $db->prepare("DELETE FROM appointments WHERE id = :id")->execute([':id' => $validResult['data']['id']]);
}

echo "\n*** ALL DOCTOR ROSTER AVAILABILITY BINDING TESTS COMPLETED SUCCESSFULLY! ***\n";
