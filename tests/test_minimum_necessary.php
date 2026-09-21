<?php

declare(strict_types=1);

/**
 * HIPAA § 164.502(b) Minimum Necessary PHI Access Control Test Suite
 * USIntellix Hospital Management System
 */

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Core\Session;
use App\Core\PhiAccessGuard;
use App\Core\AuditLogger;
use App\Modules\Patients\Models\Patient;

Env::load();

echo "\n======================================================================\n";
echo "  HIPAA § 164.502(b) STRICT MINIMUM NECESSARY ACCESS VERIFICATION     \n";
echo "======================================================================\n\n";

$db = Database::getInstance()->getConnection();
$passed = 0;
$failed = 0;

function reportTest(string $title, bool $success, string $details = ''): void {
    global $passed, $failed;
    if ($success) {
        $passed++;
        echo "  [PASS] {$title}\n";
        if ($details) {
            echo "         -> {$details}\n";
        }
    } else {
        $failed++;
        echo "  [FAIL] {$title}\n";
        if ($details) {
            echo "         -> {$details}\n";
        }
    }
}

// ----------------------------------------------------------------------------
// TEST 1: Role Classification Engine
// ----------------------------------------------------------------------------
echo "1. Testing Role Classification Engine (PhiAccessGuard)...\n";

$clinicalRoles = ['admin', 'doctor', 'clinician', 'nurse'];
$nonClinicalRoles = ['receptionist', 'accountant', 'staff', 'patient'];

$allClinicalClassified = true;
foreach ($clinicalRoles as $role) {
    if (!PhiAccessGuard::isClinicalRole($role)) {
        $allClinicalClassified = false;
        break;
    }
}
reportTest('Clinical roles correctly identified', $allClinicalClassified, implode(', ', $clinicalRoles));

$allNonClinicalClassified = true;
foreach ($nonClinicalRoles as $role) {
    if (PhiAccessGuard::isClinicalRole($role)) {
        $allNonClinicalClassified = false;
        break;
    }
}
reportTest('Non-clinical roles excluded from clinical access', $allNonClinicalClassified, implode(', ', $nonClinicalRoles));

reportTest('Lab roles include lab_technician', PhiAccessGuard::isLabRole('lab_technician') && !PhiAccessGuard::isLabRole('receptionist'));
reportTest('Doctor roles include doctor/clinician only', PhiAccessGuard::isDoctorRole('doctor') && PhiAccessGuard::isDoctorRole('clinician') && !PhiAccessGuard::isDoctorRole('nurse'));

echo "\n";

// ----------------------------------------------------------------------------
// TEST 2: Direct Assertion & 403 Response Behavior
// ----------------------------------------------------------------------------
echo "2. Testing Enforcement Interception via Isolated Subprocess...\n";

// Test 2a: Assert clinical access rejects receptionist
$cmd2a = 'php -r "require_once \'backend/app/Core/Autoload.php\'; App\Core\PhiAccessGuard::assertClinicalAccess([\'role\' => \'receptionist\']);"';
$out2a = shell_exec($cmd2a . ' 2>&1');
$json2a = json_decode((string) $out2a, true);

$is2aRestricted = is_array($json2a) && 
    ($json2a['code'] ?? '') === 'HIPAA_NON_CLINICAL_RESTRICTED' && 
    ($json2a['success'] ?? true) === false;
reportTest('Non-clinical receptionist blocked from clinical chart (403)', $is2aRestricted, $json2a['message'] ?? 'No message');

// Test 2b: Assert lab access rejects receptionist
$cmd2b = 'php -r "require_once \'backend/app/Core/Autoload.php\'; App\Core\PhiAccessGuard::assertLabAccess([\'role\' => \'receptionist\']);"';
$out2b = shell_exec($cmd2b . ' 2>&1');
$json2b = json_decode((string) $out2b, true);

$is2bRestricted = is_array($json2b) && 
    ($json2b['code'] ?? '') === 'HIPAA_LAB_RESTRICTED' && 
    ($json2b['success'] ?? true) === false;
reportTest('Receptionist blocked from laboratory records (403)', $is2bRestricted, $json2b['message'] ?? 'No message');

// Test 2c: Assert lab access allows lab_technician
$cmd2c = 'php -r "require_once \'backend/app/Core/Autoload.php\'; App\Core\PhiAccessGuard::assertLabAccess([\'role\' => \'lab_technician\']); echo \'ALLOWED\';"';
$out2c = trim((string) shell_exec($cmd2c . ' 2>&1'));
reportTest('Lab technician allowed access to laboratory records', $out2c === 'ALLOWED', 'Result: ' . $out2c);

echo "\n";

// ----------------------------------------------------------------------------
// TEST 3: Doctor Patient-Assignment Boundary & Break-Glass Requirement
// ----------------------------------------------------------------------------
echo "3. Testing Doctor Assignment Boundary & Break-Glass Protocol...\n";

// Create a temporary test user and patient
use App\Modules\Users\Models\User;

$testUsername = 'test_phi_user_' . time();
$testUserId = (int) (new User())->create([
    'username'   => $testUsername,
    'password'   => User::hashPassword('Password123!'),
    'role_id'    => 1,
    'created_at' => date('Y-m-d H:i:s')
]);

$testPatientNo = 'TEST-NO-' . time();
$patientModel = new Patient();
$testPatientId = (int) $patientModel->create([
    'user_id'      => $testUserId,
    'patient_no'   => $testPatientNo,
    'first_name'   => 'TestHipaa',
    'last_name'    => 'Patient',
    'sex'          => 'other',
    'birthdate'    => '1990-01-01',
    'provider_id'  => null, // Unassigned provider
    'created_at'   => date('Y-m-d H:i:s')
]);

reportTest('Created test patient for assignment testing', $testPatientId > 0, "Patient ID: {$testPatientId}, Patient No: {$testPatientNo}");

// Mock doctor user who is NOT assigned to this patient (ID 888888)
$unassignedDoctor = [
    'id'   => 888888,
    'role' => 'doctor'
];

$cmd3a = sprintf(
    'php -r "require_once \'backend/app/Core/Autoload.php\'; App\Core\Env::load(); App\Core\PhiAccessGuard::assertPatientAccess([\'id\' => 888888, \'role\' => \'doctor\'], %d);"',
    $testPatientId
);
$out3a = shell_exec($cmd3a . ' 2>&1');
$json3a = json_decode((string) $out3a, true);

$breakGlassRequired = is_array($json3a) && 
    ($json3a['code'] ?? '') === 'HIPAA_BREAK_GLASS_REQUIRED' &&
    !empty($json3a['break_glass_required']);
reportTest('Unassigned doctor blocked with HIPAA_BREAK_GLASS_REQUIRED (403)', $breakGlassRequired, $json3a['message'] ?? 'No message');

// Test 4: Break-Glass Execution and Override Grant
echo "\n4. Testing Emergency Break-Glass Execution & Session Grant...\n";

// Simulate emergency break glass:
Session::start();
$emergencyReason = 'Patient presented to trauma bay with severe cardiac arrest requiring immediate chart access';

// Call break-glass audit logging
AuditLogger::log(
    AuditLogger::CATEGORY_EMERGENCY,
    AuditLogger::ACTION_BREAK_GLASS,
    "EMERGENCY ACCESS (Break-Glass) invoked: " . $emergencyReason,
    $testPatientId
);

// Add to session
$grants = Session::get('break_glass_patients') ?? [];
if (!in_array($testPatientId, $grants, true)) {
    $grants[] = $testPatientId;
    Session::put('break_glass_patients', $grants);
}

// Verify Session has grant
$updatedGrants = Session::get('break_glass_patients') ?? [];
reportTest('Session recorded break-glass override', in_array($testPatientId, $updatedGrants, true), 'Patient in session: ' . implode(',', $updatedGrants));

// Verify isAssignedToPatient evaluates to TRUE after break-glass grant
$assignedAfterGrant = PhiAccessGuard::isAssignedToPatient($unassignedDoctor, $testPatientId);
reportTest('PhiAccessGuard::isAssignedToPatient returns TRUE after break-glass', $assignedAfterGrant, 'Emergency access authorized');

echo "\n";

// ----------------------------------------------------------------------------
// TEST 5: Cryptographic Audit Trail Verification
// ----------------------------------------------------------------------------
echo "5. Verifying Cryptographic Audit Trail for Break-Glass...\n";

$auditStmt = $db->prepare("
    SELECT id, user_id, user_role, patient_id, event_category, action, description, tamper_hash, created_at 
    FROM hipaa_audit_logs 
    WHERE patient_id = :pid AND event_category = 'EMERGENCY_ACCESS' AND action = 'BREAK_GLASS' 
    ORDER BY id DESC LIMIT 1
");
$auditStmt->execute(['pid' => $testPatientId]);
$auditRecord = $auditStmt->fetch(PDO::FETCH_ASSOC);

reportTest('Break-Glass entry present in hipaa_audit_logs', !empty($auditRecord), 'Audit ID: ' . ($auditRecord['id'] ?? 'none'));
reportTest('Audit entry has sequential SHA-256 HMAC tamper hash', !empty($auditRecord['tamper_hash']) && strlen($auditRecord['tamper_hash']) === 64, 'Hash: ' . substr($auditRecord['tamper_hash'] ?? '', 0, 16) . '...');

$integrity = AuditLogger::verifyIntegrity();
reportTest('Cryptographic chain verification passes across entire log', $integrity['valid'] === true, "Verified records: {$integrity['total_verified']}");

echo "\n";

// ----------------------------------------------------------------------------
// TEST 6: Minimum Necessary Dashboard Summary Filtering
// ----------------------------------------------------------------------------
echo "6. Testing Dashboard Summary Filtering (§ 164.502(b))...\n";

$rawSummary = [
    'demographics' => [
        'first_name' => 'TestHipaa',
        'last_name'  => 'Patient',
        'patient_no' => $testPatientNo
    ],
    'appointments' => [
        ['id' => 101, 'appointment_date' => '2026-09-25 10:00:00']
    ],
    'billing' => [
        'balance' => 150.00
    ],
    // Sensitive clinical charts:
    'allergies' => [
        ['id' => 1, 'allergen' => 'Penicillin']
    ],
    'problems' => [
        ['id' => 2, 'problem_name' => 'Type 2 Diabetes', 'code' => 'E11.9']
    ],
    'soap_notes' => [
        ['id' => 3, 'subjective' => 'Patient complains of chronic chest pain', 'objective' => 'Elevated BP']
    ],
    'diagnoses' => [
        ['id' => 4, 'diagnosis' => 'Hypertension', 'code' => 'I10']
    ],
    'medications' => [
        ['id' => 5, 'drug_name' => 'Lisinopril 10mg']
    ],
    'vitals_history' => [
        ['id' => 6, 'bp_systolic' => 140, 'bp_diastolic' => 90]
    ]
];

// Test filtering for receptionist (non-clinical)
$receptionistUser = ['id' => 10, 'role' => 'receptionist'];
$filteredReceptionist = PhiAccessGuard::filterDashboardSummary($receptionistUser, $testPatientId, $rawSummary);

$clinicalRedacted = empty($filteredReceptionist['allergies']) &&
    empty($filteredReceptionist['problems']) &&
    empty($filteredReceptionist['soap_notes']) &&
    empty($filteredReceptionist['diagnoses']) &&
    empty($filteredReceptionist['medications']) &&
    empty($filteredReceptionist['vitals_history']);

$administrativePreserved = !empty($filteredReceptionist['demographics']) &&
    !empty($filteredReceptionist['appointments']) &&
    isset($filteredReceptionist['billing']);

$noticePresent = !empty($filteredReceptionist['_hipaa_minimum_necessary']['applied']) &&
    $filteredReceptionist['_hipaa_minimum_necessary']['clinical_redacted'] === true;

reportTest('Non-clinical view redacts all clinical arrays (SOAP, diagnoses, vitals, meds)', $clinicalRedacted);
reportTest('Non-clinical view preserves demographic and administrative data', $administrativePreserved);
reportTest('Minimum necessary notice metadata attached for frontend display', $noticePresent, $filteredReceptionist['_hipaa_minimum_necessary']['notice'] ?? '');

// Test filtering for clinical role (doctor)
$doctorUser = ['id' => 20, 'role' => 'doctor'];
$filteredDoctor = PhiAccessGuard::filterDashboardSummary($doctorUser, $testPatientId, $rawSummary);

$clinicalPreservedForDoctor = !empty($filteredDoctor['soap_notes']) &&
    !empty($filteredDoctor['diagnoses']) &&
    !empty($filteredDoctor['problems']) &&
    !empty($filteredDoctor['medications']);

reportTest('Clinical view (doctor) preserves full clinical charts', $clinicalPreservedForDoctor);

echo "\n";

// ----------------------------------------------------------------------------
// CLEANUP
// ----------------------------------------------------------------------------
$db->prepare("DELETE FROM patients WHERE id = :id")->execute(['id' => $testPatientId]);
$db->prepare("DELETE FROM users WHERE id = :id")->execute(['id' => $testUserId]);
echo "Cleaned up test patient ID: {$testPatientId} and user ID: {$testUserId}\n\n";

echo "======================================================================\n";
echo "  SUMMARY: {$passed} PASSED, {$failed} FAILED\n";
echo "======================================================================\n";

exit($failed > 0 ? 1 : 0);
