<?php

declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Modules\VisitorManagement\Services\VisitorPassService;

echo "=== STARTING VISITOR MANAGEMENT VERIFICATION SUITE ===\n\n";

$db = Database::connection();
$service = new VisitorPassService($db);
$user = ['id' => 1, 'username' => 'test_officer'];

// 1. Test Pass Number Generator
echo "1. Testing Pass Number Generation...\n";
$passNumber1 = $service->generatePassNumber();
echo "   Generated pass number: {$passNumber1}\n";
assert(str_starts_with($passNumber1, 'VIS-') === true, "Pass number prefix must start with VIS-");
echo "   [PASS] Format valid.\n\n";

// 2. Test Ward Policy Resolution
echo "2. Testing Ward Policy Resolution...\n";
$icuPolicy = $service->resolveWardPolicy(3); // or lookup by ICU
echo "   ICU Policy Resolved: Ward Type={$icuPolicy['ward_type']}, Max Visitors={$icuPolicy['max_active_visitors_per_bed']}, Start={$icuPolicy['visiting_hours_start']}, End={$icuPolicy['visiting_hours_end']}\n";
assert(!empty($icuPolicy['ward_type']), "Ward policy must not be empty");
echo "   [PASS] Ward policy resolved.\n\n";

// 3. Test Visiting Hours Validation
echo "3. Testing Visiting Hours Validation...\n";
// ICU policy has split hours: 11:00-12:00 and 17:00-18:00
$icuSlotPolicy = [
    'ward_type' => 'ICU',
    'has_midday_break' => 1,
    'visiting_hours_start' => '11:00:00',
    'visiting_hours_end' => '12:00:00',
    'visiting_hours_slot2_start' => '17:00:00',
    'visiting_hours_slot2_end' => '18:00:00'
];

$validCheck1 = $service->validateVisitingHours($icuSlotPolicy, '11:30:00');
echo "   ICU at 11:30 AM: Valid=" . ($validCheck1['valid'] ? 'YES' : 'NO') . "\n";
assert($validCheck1['valid'] === true, "11:30 AM should be valid for ICU");

$invalidCheck = $service->validateVisitingHours($icuSlotPolicy, '14:00:00');
echo "   ICU at 02:00 PM: Valid=" . ($invalidCheck['valid'] ? 'YES' : 'NO') . " (Error: {$invalidCheck['error']})\n";
assert($invalidCheck['valid'] === false, "02:00 PM should be invalid for ICU");

$validCheck2 = $service->validateVisitingHours($icuSlotPolicy, '17:45:00');
echo "   ICU at 05:45 PM: Valid=" . ($validCheck2['valid'] ? 'YES' : 'NO') . "\n";
assert($validCheck2['valid'] === true, "05:45 PM should be valid for ICU");
echo "   [PASS] Split visiting hours validation functioning accurately.\n\n";

// 4. Test Inpatient Admissions Dropdown Options
echo "4. Testing Inpatient Admissions Dropdown Options...\n";
$admissions = $service->getActiveAdmissionsForDropdown();
echo "   Found " . count($admissions) . " active inpatient admissions.\n";

if (empty($admissions)) {
    echo "   [NOTE] Creating a dummy admitted patient for testing.\n";
    // Check if patients table has an entry
    $pStmt = $db->query("SELECT id FROM patients LIMIT 1");
    $patientId = $pStmt ? $pStmt->fetchColumn() : null;
    if (!$patientId) {
        $db->exec("INSERT INTO patients (patient_no, first_name, last_name, gender, birthdate, created_at) VALUES ('P-TEST-01', 'John', 'Doe', 'Male', '1985-05-15', NOW())");
        $patientId = $db->lastInsertId();
    }

    $wStmt = $db->query("SELECT id FROM hospital_wards LIMIT 1");
    $wardId = $wStmt ? $wStmt->fetchColumn() : 1;

    $bStmt = $db->prepare("SELECT id FROM hospital_beds WHERE ward_id = :w LIMIT 1");
    $bStmt->execute([':w' => $wardId]);
    $bedId = $bStmt->fetchColumn();
    if (!$bedId) {
        $db->exec("INSERT INTO hospital_beds (ward_id, bed_number, room_number, bed_type, status) VALUES ({$wardId}, 'B-101', '101', 'Standard', 'Occupied')");
        $bedId = $db->lastInsertId();
    }

    $db->prepare("
        INSERT INTO inpatient_admissions (admission_number, patient_id, patient_name, ward_id, bed_id, status, admission_date, attending_physician, created_at)
        VALUES ('ADM-TEST-001', :pid, 'John Doe', :wid, :bid, 'Admitted', NOW(), 'Dr. House', NOW())
    ")->execute([':pid' => $patientId, ':wid' => $wardId, ':bid' => $bedId]);

    $admissions = $service->getActiveAdmissionsForDropdown();
}

$testAdmission = $admissions[0];
$admissionId = (int) $testAdmission['admission_id'];
echo "   Testing with Admission #{$testAdmission['admission_number']} (Patient: {$testAdmission['patient_name']}, Ward: {$testAdmission['ward_name']}, Bed: {$testAdmission['bed_number']})\n";
echo "   [PASS] Admissions options loaded successfully.\n\n";

// 5. Test Issuing 1st Visitor Pass
echo "5. Testing Issuing 1st Visitor Pass...\n";
$issueRes1 = $service->issuePass([
    'visitor_name'            => 'Sarah Jenkins',
    'id_document_type'        => 'Driver License',
    'id_document_number'      => 'DL-9821245',
    'phone'                   => '0917-555-0199',
    'admission_id'            => $admissionId,
    'relationship_to_patient' => 'Spouse',
    'duration_minutes'        => 120,
    'is_emergency_exception'  => 1 // bypass hour restriction for test script run at any time of day
], $user);

echo "   Result: " . json_encode($issueRes1['message']) . "\n";
assert($issueRes1['success'] === true, "1st Pass issuance must succeed");
$pass1Id = $issueRes1['pass_id'];
$pass1Number = $issueRes1['pass_number'];
echo "   Pass 1 Issued: ID={$pass1Id}, Number={$pass1Number}\n";
echo "   [PASS] 1st pass issued successfully.\n\n";

// 6. Test Bedside Quota - Issue 2nd Visitor Pass
echo "6. Testing Issuing 2nd Visitor Pass (Reaching Max Quota)...\n";
$issueRes2 = $service->issuePass([
    'visitor_name'            => 'Michael Jenkins',
    'id_document_type'        => 'National ID',
    'id_document_number'      => 'NID-882190',
    'phone'                   => '0917-555-0200',
    'admission_id'            => $admissionId,
    'relationship_to_patient' => 'Sibling',
    'duration_minutes'        => 120,
    'is_emergency_exception'  => 1
], $user);

assert($issueRes2['success'] === true, "2nd Pass issuance must succeed");
$pass2Id = $issueRes2['pass_id'];
echo "   Pass 2 Issued: ID={$pass2Id}, Number={$issueRes2['pass_number']}\n";
echo "   [PASS] 2nd pass issued successfully.\n\n";

// 7. Test Bedside Quota Enforcement - 3rd Visitor should be BLOCKED (Quota Exceeded)
echo "7. Testing Bedside Quota Restriction (Attempting 3rd Concurrent Visitor)...\n";
$quotaCheck = $service->validateBedsideQuota($admissionId, 2);
echo "   Current bedside active visitors: {$quotaCheck['current_count']} / {$quotaCheck['max_quota']}. Valid=" . ($quotaCheck['valid'] ? 'YES' : 'NO') . "\n";
assert($quotaCheck['valid'] === false, "Bedside quota should be full (2/2)");

$issueRes3 = $service->issuePass([
    'visitor_name'            => 'Uninvited Friend',
    'id_document_type'        => 'Passport',
    'id_document_number'      => 'P-999999',
    'phone'                   => '0917-555-0999',
    'admission_id'            => $admissionId,
    'relationship_to_patient' => 'Friend',
    'duration_minutes'        => 60,
    'is_emergency_exception'  => 0 // regular non-emergency visitor
], $user);

echo "   3rd Visitor Result: Success=" . ($issueRes3['success'] ? 'YES' : 'NO') . " | Code=" . ($issueRes3['code'] ?? 'NONE') . "\n";
echo "   Message: {$issueRes3['message']}\n";
assert($issueRes3['success'] === false, "3rd visitor must be rejected due to quota or hours");
echo "   [PASS] Bedside quota enforcement successfully blocked 3rd visitor.\n\n";

// 8. Test Barcode Scan Verification
echo "8. Testing Checkpoint Barcode Scan Verification...\n";
$verifyRes = $service->verifyPass($pass1Number);
echo "   Verification Result for {$pass1Number}: Valid=" . ($verifyRes['is_valid'] ? 'YES' : 'NO') . ", Status={$verifyRes['status']}\n";
assert($verifyRes['is_valid'] === true, "Active pass must verify as valid");
assert($verifyRes['status'] === 'Active', "Status must be Active");
echo "   [PASS] Barcode verification succeeded.\n\n";

// 9. Test Thermal Printable Badge Generation
echo "9. Testing Thermal Printable Badge Generation...\n";
$badgeHtml = $service->generateThermalBadgeHtml($pass1Id);
assert(str_contains($badgeHtml, 'USINTELLIX HEALTHCARE SYSTEM') === true, "Badge must include hospital header");
assert(str_contains($badgeHtml, $pass1Number) === true, "Badge must include pass number");
assert(str_contains($badgeHtml, 'Sarah Jenkins') === true, "Badge must include visitor name");
echo "   Badge HTML generated (" . strlen($badgeHtml) . " bytes) with correct barcode and visitor details.\n";
echo "   [PASS] Thermal badge template verified.\n\n";

// 10. Test Check-Out Pass
echo "10. Testing Visitor Check-Out...\n";
$checkOutRes = $service->checkOutPass($pass1Number, $user);
assert($checkOutRes['success'] === true, "Check-out must succeed");
echo "   Pass {$pass1Number} status after checkout: {$checkOutRes['pass']['status']} at {$checkOutRes['pass']['check_out_time']}\n";

$verifyAfterCheckout = $service->verifyPass($pass1Number);
assert($verifyAfterCheckout['is_valid'] === false, "Checked out pass must no longer be valid for entry");
echo "   [PASS] Check-out completed and verified.\n\n";

// 11. Test Security Revocation
echo "11. Testing Pass Revocation for Pass 2...\n";
$revokeRes = $service->revokePass($pass2Id, 'Disruptive Conduct in ICU Ward', $user);
assert($revokeRes['success'] === true, "Revocation must succeed");
echo "   Revoke Result: {$revokeRes['message']}\n";

$verifyAfterRevoke = $service->verifyPass($pass2Id);
assert($verifyAfterRevoke['status'] === 'Revoked', "Pass status must be Revoked");
assert($verifyAfterRevoke['is_valid'] === false, "Revoked pass must be invalid");
echo "   [PASS] Security revocation verified.\n\n";

// 12. Test Dashboard Stats & KPIs
echo "12. Testing Dashboard Statistics & KPIs...\n";
$stats = $service->getDashboardStats();
echo "   Dashboard KPIs: " . json_encode($stats['summary']) . "\n";
assert($stats['summary']['checked_in_today'] >= 2, "Checked in today must count test passes");
assert($stats['summary']['checked_out_today'] >= 1, "Checked out today must count test checkout");
assert($stats['summary']['revoked_count'] >= 1, "Revoked count must count test revocation");
echo "   [PASS] Dashboard KPIs and ward counts verified.\n\n";

echo "=========================================================\n";
echo "ALL VISITOR MANAGEMENT TESTS PASSED WITH 100% SUCCESS!\n";
echo "=========================================================\n";
