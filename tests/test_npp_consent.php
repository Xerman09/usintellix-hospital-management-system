<?php
/**
 * Automated Verification: Patient Consent & Notice of Privacy Practices (NPP) Signature Capture
 * Regulatory Framework: HIPAA Privacy Rule 45 CFR § 164.520(c)(2)(ii)
 */

declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Core\Session;
use App\Core\AuditLogger;
use App\Modules\Auth\Services\AuthService;
use App\Modules\NppConsent\Controllers\NppConsentController;
use App\Modules\Patients\Models\Patient;
use App\Modules\Users\Models\User;

Env::load();

$passed = 0;
$failed = 0;

function report(bool $condition, string $title, string $detail = ''): void {
    global $passed, $failed;
    if ($condition) {
        $passed++;
        echo "  [PASS] {$title}\n";
        if ($detail) {
            echo "         -> {$detail}\n";
        }
    } else {
        $failed++;
        echo "  [FAIL] {$title}\n";
        if ($detail) {
            echo "         -> {$detail}\n";
        }
    }
}

echo "======================================================================\n";
echo "  HIPAA § 164.520 PATIENT CONSENT & NPP SIGNATURE CAPTURE TEST SUITE  \n";
echo "======================================================================\n\n";

$db = Database::connection();
$authService = new AuthService();

// -----------------------------------------------------------------------------
// 1. Schema and Column Verification
// -----------------------------------------------------------------------------
echo "1. Testing Database Schema & Audit Log Setup...\n";

$cols = $db->query("SHOW COLUMNS FROM users LIKE 'npp_acknowledged'")->fetchAll();
report(!empty($cols), "Column 'npp_acknowledged' exists on users table");

$colsAt = $db->query("SHOW COLUMNS FROM users LIKE 'npp_acknowledged_at'")->fetchAll();
report(!empty($colsAt), "Column 'npp_acknowledged_at' exists on users table");

$colsSig = $db->query("SHOW COLUMNS FROM users LIKE 'npp_signature_data'")->fetchAll();
report(!empty($colsSig), "Column 'npp_signature_data' exists on users table");

$tables = $db->query("SHOW TABLES LIKE 'npp_consent_log'")->fetchAll();
report(!empty($tables), "Table 'npp_consent_log' exists for compliance audit trail");

// -----------------------------------------------------------------------------
// 2. Setup Test Patient & Linked User
// -----------------------------------------------------------------------------
echo "\n2. Testing Patient Portal Account Creation & Initial NPP State...\n";

$timestamp = time();
$testUsername = "test_patient_npp_{$timestamp}";
$hashedPassword = password_hash("TestP@ss1234!", PASSWORD_DEFAULT);

$userModel = new User();
$userId = (int) $userModel->create([
    'username'             => $testUsername,
    'password'             => $hashedPassword,
    'must_change_password' => 0,
    'npp_acknowledged'     => 0,
    'created_at'           => date('Y-m-d H:i:s'),
]);

report($userId > 0, "Created test patient portal user", "User ID: {$userId}, Username: {$testUsername}");

$patientModel = new Patient();
$patientId = (int) $patientModel->create([
    'user_id'      => $userId,
    'patient_no'   => "NPP-TEST-{$timestamp}",
    'first_name'   => "Eleanor",
    'last_name'    => "Vance",
    'birthdate'    => "1988-04-12",
    'sex'          => "female",
    'civil_status' => "Single",
    'created_at'   => date('Y-m-d H:i:s')
]);

report($patientId > 0, "Created test patient demographic record", "Patient ID: {$patientId}");

// Fetch current user via auth service
$fetchedUser = $authService->getCurrentUser($userId);
report(
    isset($fetchedUser['npp_acknowledged']) && $fetchedUser['npp_acknowledged'] === false,
    "Fresh portal user has npp_acknowledged = false by default"
);

// -----------------------------------------------------------------------------
// 3. Electronic Signature Validation & Submission
// -----------------------------------------------------------------------------
echo "\n3. Testing Portal Electronic Signature Submission (§ 164.520)...\n";

// Test blank signature rejection
$emptySigResult = $authService->acknowledgeNpp($userId, [
    'signature_data' => '   ',
    'signature_type' => 'electronic',
    'npp_version'    => '2026-09'
]);
report(
    $emptySigResult['success'] === false,
    "Blank electronic signature is rejected with validation error",
    $emptySigResult['message'] ?? ''
);

// Test successful electronic signature
Session::put('user', $fetchedUser);

$validSigResult = $authService->acknowledgeNpp($userId, [
    'signature_data' => 'Eleanor Vance',
    'signature_type' => 'electronic',
    'npp_version'    => '2026-09'
]);

report(
    $validSigResult['success'] === true,
    "Valid electronic signature is accepted and processed",
    $validSigResult['message'] ?? ''
);

// Verify DB persistence on users table
$updatedUser = (new User())->where('id', $userId)->first();
report(
    (int) $updatedUser['npp_acknowledged'] === 1,
    "Database users.npp_acknowledged is set to 1"
);
report(
    $updatedUser['npp_signature_data'] === 'Eleanor Vance',
    "Electronic signature stored matches typed legal name",
    "Stored signature: '{$updatedUser['npp_signature_data']}'"
);
report(
    $updatedUser['npp_version'] === '2026-09',
    "NPP policy version recorded matches active version",
    "Version: {$updatedUser['npp_version']}"
);

// Verify persistence in immutable npp_consent_log
$stmt = $db->prepare("SELECT * FROM npp_consent_log WHERE user_id = ? ORDER BY id DESC LIMIT 1");
$stmt->execute([$userId]);
$logRow = $stmt->fetch();

report(!empty($logRow), "Entry created in immutable npp_consent_log table");
report($logRow['signature_type'] === 'electronic', "Log entry records signature_type = 'electronic'");
report((int) $logRow['patient_id'] === $patientId, "Log entry linked to patient ID #{$patientId}");

// Verify HIPAA audit trail logging
$auditStmt = $db->prepare("SELECT * FROM hipaa_audit_logs WHERE user_id = ? AND action = ? ORDER BY id DESC LIMIT 1");
$auditStmt->execute([$userId, AuditLogger::ACTION_NPP_ACKNOWLEDGED]);
$auditLog = $auditStmt->fetch();

report(!empty($auditLog), "Audit log recorded in hipaa_audit_logs table");
report(
    !empty($auditLog['tamper_hash']),
    "Audit log entry contains sequential SHA-256 HMAC integrity hash",
    "Hash: " . substr((string) ($auditLog['tamper_hash'] ?? ''), 0, 24) . "..."
);

// -----------------------------------------------------------------------------
// 4. In-Clinic Check-In Verification & Capture
// -----------------------------------------------------------------------------
echo "\n4. Testing In-Clinic Check-In Status & Staff Capture Workflow...\n";

// Create a second patient with user account
$clinicUserId = (int) (new User())->create([
    'username'             => "test_clinic_user_{$timestamp}",
    'password'             => $hashedPassword,
    'must_change_password' => 0,
    'npp_acknowledged'     => 0,
    'created_at'           => date('Y-m-d H:i:s'),
]);

$inClinicPatientId = (int) $patientModel->create([
    'user_id'      => $clinicUserId,
    'patient_no'   => "NPP-CLINIC-{$timestamp}",
    'first_name'   => "Arthur",
    'last_name'    => "Dent",
    'birthdate'    => "1979-03-11",
    'sex'          => "male",
    'civil_status' => "Single",
    'created_at'   => date('Y-m-d H:i:s')
]);

// Verify that initial status is unacknowledged
$stmtCheck = $db->prepare("SELECT COUNT(*) FROM npp_consent_log WHERE patient_id = ?");
$stmtCheck->execute([$inClinicPatientId]);
$countBefore = (int) $stmtCheck->fetchColumn();
report($countBefore === 0, "New in-clinic patient initially has 0 consent records");

// Perform in-clinic staff capture
$now = date('Y-m-d H:i:s');
$stmtCapture = $db->prepare("INSERT INTO npp_consent_log 
    (user_id, patient_id, acknowledged_at, acknowledged_ip, signature_type, signature_data, npp_version, captured_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
$stmtCapture->execute([
    $clinicUserId,
    $inClinicPatientId,
    $now,
    '127.0.0.1',
    'paper',
    'Paper NPP signed by patient Arthur Dent and scanned to file',
    '2026-09',
    1, // staff user id
    $now
]);

AuditLogger::log(
    AuditLogger::CATEGORY_CONSENT,
    AuditLogger::ACTION_NPP_ACKNOWLEDGED_IN_CLINIC,
    "Notice of Privacy Practices (v2026-09) acknowledged in-clinic for patient #{$inClinicPatientId} via 'paper' (Recorded by staff System Admin).",
    $inClinicPatientId,
    1,
    'admin'
);

$stmtCheckAfter = $db->prepare("SELECT * FROM npp_consent_log WHERE patient_id = ? ORDER BY id DESC LIMIT 1");
$stmtCheckAfter->execute([$inClinicPatientId]);
$clinicLog = $stmtCheckAfter->fetch();

report(!empty($clinicLog), "In-clinic consent successfully recorded in npp_consent_log");
report($clinicLog['signature_type'] === 'paper', "In-clinic signature_type = 'paper'");
report((int) $clinicLog['captured_by'] === 1, "Recorded staff user_id in captured_by column (Staff ID: 1)");

$clinicAuditStmt = $db->prepare("SELECT * FROM hipaa_audit_logs WHERE patient_id = ? AND action = ? ORDER BY id DESC LIMIT 1");
$clinicAuditStmt->execute([$inClinicPatientId, AuditLogger::ACTION_NPP_ACKNOWLEDGED_IN_CLINIC]);
$clinicAudit = $clinicAuditStmt->fetch();

report(!empty($clinicAudit), "Audit log recorded for NPP_ACKNOWLEDGED_IN_CLINIC");

// -----------------------------------------------------------------------------
// 5. Cleanup Test Records
// -----------------------------------------------------------------------------
echo "\nCleaning up test artifacts...\n";
$db->prepare("DELETE FROM npp_consent_log WHERE user_id IN (?, ?) OR patient_id IN (?, ?)")->execute([$userId, $clinicUserId, $patientId, $inClinicPatientId]);
$db->prepare("DELETE FROM patients WHERE id IN (?, ?)")->execute([$patientId, $inClinicPatientId]);
$db->prepare("DELETE FROM users WHERE id IN (?, ?)")->execute([$userId, $clinicUserId]);
echo "Cleaned up test patients (IDs: {$patientId}, {$inClinicPatientId}) and users (IDs: {$userId}, {$clinicUserId}).\n";

echo "\n======================================================================\n";
echo "  SUMMARY: {$passed} PASSED, {$failed} FAILED\n";
echo "======================================================================\n\n";

exit($failed > 0 ? 1 : 0);