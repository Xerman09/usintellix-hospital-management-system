<?php
/**
 * Automated Verification: Confidential Communications Preference Enforcement
 * Statutory Citation: 45 CFR § 164.522(b)
 */

declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Core\AuditLogger;
use App\Modules\Patients\Services\PatientService;
use App\Modules\Patients\Models\Patient;

Env::load();

$passed = 0;
$failed = 0;

function report(bool $condition, string $title, string $detail = ''): void {
    global $passed, $failed;
    if ($condition) {
        $passed++;
        echo "  [PASS] {$title}\n";
    } else {
        $failed++;
        echo "  [FAIL] {$title}\n";
    }
    if ($detail !== '') {
        echo "         -> {$detail}\n";
    }
}

echo "======================================================================\n";
echo "  CONFIDENTIAL COMMUNICATIONS (§ 164.522(b)) TEST SUITE\n";
echo "======================================================================\n\n";

$pdo = Database::connection();
$service = new PatientService();
$adminUserId = 1;

// 1. Schema & Migration 205 Verification
echo "1. Testing Database Schema & Columns (Migration 205)...\n";
$stmt = $pdo->query("SHOW COLUMNS FROM patients");
$patientCols = $stmt->fetchAll(PDO::FETCH_COLUMN);

$expectedPatientCols = [
    'allow_voicemail',
    'preferred_contact_method',
    'confidential_address_line',
    'confidential_city',
    'confidential_state',
    'confidential_postal_code',
    'confidential_phone',
    'confidential_email',
    'communication_restrictions_notes',
    'has_confidential_restrictions'
];

foreach ($expectedPatientCols as $col) {
    report(in_array($col, $patientCols, true), "patients column '{$col}' exists");
}

$stmt = $pdo->query("SHOW TABLES LIKE 'hipaa_confidential_communications_log'");
report($stmt->rowCount() > 0, "Table 'hipaa_confidential_communications_log' exists in database");

$logCols = $pdo->query("SHOW COLUMNS FROM hipaa_confidential_communications_log")->fetchAll(PDO::FETCH_COLUMN);
$expectedLogCols = [
    'id', 'patient_id', 'operator_id', 'allow_voicemail', 'allow_sms',
    'allow_voice_calls', 'allow_email', 'allow_postcard', 'preferred_contact_method',
    'confidential_address', 'confidential_phone', 'confidential_email',
    'restriction_notes', 'has_restrictions', 'action', 'created_at'
];

foreach ($expectedLogCols as $col) {
    report(in_array($col, $logCols, true), "hipaa_confidential_communications_log column '{$col}' exists");
}

// 2. Patient Registration with Binding Restrictions
echo "\n2. Testing Patient Registration with Statutory Communication Restrictions...\n";
$uniqueSuffix = time() . '_' . rand(100, 999);
$regData = [
    'username' => 'test_conf_pat_' . $uniqueSuffix,
    'password' => 'SecurePass123!#',
    'first_name' => 'Eleanor',
    'middle_name' => 'Rose',
    'last_name' => 'Vance',
    'sex' => 'female',
    'birthdate' => '1992-06-15',
    'civil_status' => 'Single',
    'blood_type' => 'O+',
    'height' => '168',
    'weight' => '62',
    'allow_sms' => 'no',
    'allow_voice_calls' => 'yes',
    'allow_voicemail' => 'no', // Strict legal restriction
    'allow_email' => 'yes',
    'allow_postcard' => 'no',
    'preferred_contact_method' => 'mobile_phone',
    'confidential_phone' => '555-0144-SECURE',
    'confidential_address_line' => 'P.O. Box 7721',
    'confidential_city' => 'Metropolis',
    'confidential_state' => 'NY',
    'confidential_postal_code' => '10001',
    'communication_restrictions_notes' => 'DO NOT leave voicemails referencing medical appointments or lab results. Only call mobile after 6 PM.'
];

$regResult = $service->register($regData, $adminUserId);
report($regResult['success'], "Patient registered successfully with § 164.522(b) preferences", $regResult['message'] ?? '');

$patientId = (int) ($regResult['data']['patient_id'] ?? 0);
report($patientId > 0, "Registered patient received valid ID: {$patientId}");

// Check persistence in database
$savedPatient = (new Patient())->where('id', $patientId)->first();
report($savedPatient['allow_voicemail'] === 'no', "allow_voicemail persisted as 'no'");
report($savedPatient['allow_sms'] === 'no', "allow_sms persisted as 'no'");
report($savedPatient['preferred_contact_method'] === 'mobile_phone', "preferred_contact_method persisted as 'mobile_phone'");
report($savedPatient['confidential_address_line'] === 'P.O. Box 7721', "confidential_address_line persisted correctly");
report((int) $savedPatient['has_confidential_restrictions'] === 1, "has_confidential_restrictions automatically computed as 1 (ACTIVE)");

// Check historical ledger
$logStmt = $pdo->prepare("SELECT * FROM hipaa_confidential_communications_log WHERE patient_id = ? ORDER BY id DESC LIMIT 1");
$logStmt->execute([$patientId]);
$logRow = $logStmt->fetch(PDO::FETCH_ASSOC);
report(!empty($logRow), "hipaa_confidential_communications_log recorded initial registration entry");
report($logRow['action'] === 'INITIAL_PREFERENCES_RECORDED' || $logRow['action'] === 'RESTRICTION_SET', "Log action correctly recorded: " . ($logRow['action'] ?? ''));

// 3. Testing Direct Retrieval API Endpoint
echo "\n3. Testing Direct Preferences Retrieval Endpoint...\n";
$prefsResult = $service->getConfidentialPreferences($patientId);
report($prefsResult['success'], "getConfidentialPreferences() returned successfully");
report(isset($prefsResult['data']['has_confidential_restrictions']), "Response contains 'has_confidential_restrictions'");
report($prefsResult['data']['has_confidential_restrictions'] === true, "Preferences object reports has_confidential_restrictions = true");
report($prefsResult['data']['allow_voicemail'] === 'no', "Preferences object reports allow_voicemail = 'no'");
report(!empty($prefsResult['data']['warnings']), "Preferences response contains active warnings");

// 4. Testing Preferences Update via Direct Endpoint
echo "\n4. Testing Direct Update of Preferences (Clearing Restrictions)...\n";
$clearData = [
    'allow_voicemail' => 'yes',
    'allow_sms' => 'yes',
    'allow_voice_calls' => 'yes',
    'allow_postcard' => 'yes',
    'allow_email' => 'yes',
    'preferred_contact_method' => 'mobile_phone',
    'confidential_address_line' => '',
    'confidential_phone' => '',
    'communication_restrictions_notes' => ''
];

$updateResult = $service->setConfidentialPreferences($patientId, $clearData, $adminUserId);
report($updateResult['success'], "setConfidentialPreferences() succeeded");
report($updateResult['data']['has_confidential_restrictions'] === false, "Restrictions auto-evaluated to false when all standard options chosen");
report($updateResult['data']['allow_voicemail'] === 'yes', "allow_voicemail updated to 'yes'");

// Verify second ledger entry
$logStmt->execute([$patientId]);
$secondLogRow = $logStmt->fetch(PDO::FETCH_ASSOC);
report($secondLogRow['action'] === 'CONFIDENTIAL_COMM_RESTRICTION_REMOVED' || $secondLogRow['action'] === 'RESTRICTION_REMOVED', "Log action recorded as RESTRICTION_REMOVED");

// 5. Testing Re-applying Specific Restriction via Demographic Update
echo "\n5. Testing Re-applying Restriction via Standard Demographic update()...\n";
$demographicUpdate = array_merge($savedPatient, [
    'allow_voicemail' => 'no',
    'communication_restrictions_notes' => 'Strict: Never leave clinical voicemails.'
]);

$demoResult = $service->update($patientId, $demographicUpdate, $adminUserId);
report($demoResult['success'], "PatientService::update() succeeded");

$recheckedPatient = (new Patient())->where('id', $patientId)->first();
report((int) $recheckedPatient['has_confidential_restrictions'] === 1, "has_confidential_restrictions flipped back to 1 via update()");
report($recheckedPatient['allow_voicemail'] === 'no', "allow_voicemail updated to 'no'");

// 6. Testing Regulatory CSV Registry Export
echo "\n6. Testing Active Confidential Communications Registry Export to RFC 4180 CSV...\n";
$csv = $service->exportConfidentialRegistryCsv();
report(!empty($csv), "exportConfidentialRegistryCsv() generated non-empty CSV output");
report(strpos($csv, '45 CFR § 164.522(b)') !== false, "CSV contains statutory citation header '45 CFR § 164.522(b)'");
report(strpos($csv, 'HIPAA Confidential Communications Registry') !== false, "CSV contains registry title");
report(strpos($csv, 'Allow Voicemail') !== false, "CSV contains 'Allow Voicemail' column header");
report(strpos($csv, 'Eleanor Vance') !== false, "CSV contains test patient 'Eleanor Vance'");
report(strpos($csv, 'Strict: Never leave clinical voicemails.') !== false, "CSV contains test restriction notes");

// 7. Testing Audit Trail & HMAC-SHA-256 Cryptographic Chain
echo "\n7. Verifying Sequential Cryptographic Hash Chain Integrity...\n";
$auditStmt = $pdo->prepare("SELECT * FROM hipaa_audit_logs WHERE event_category = ? ORDER BY id DESC LIMIT 10");
$auditStmt->execute([AuditLogger::CATEGORY_COMMUNICATIONS]);
$auditRows = $auditStmt->fetchAll(PDO::FETCH_ASSOC);
report(count($auditRows) >= 3, "AuditLogger committed CONFIDENTIAL_COMMUNICATIONS events to hipaa_audit_logs", "Found " . count($auditRows) . " events");

$actionsFound = array_column($auditRows, 'action');
report(in_array(AuditLogger::ACTION_CONFIDENTIAL_COMM_RESTRICTION_SET, $actionsFound, true), "Audit log recorded CONFIDENTIAL_COMM_RESTRICTION_SET");
report(in_array(AuditLogger::ACTION_CONFIDENTIAL_COMM_RESTRICTION_REMOVED, $actionsFound, true), "Audit log recorded CONFIDENTIAL_COMM_RESTRICTION_REMOVED");
report(in_array(AuditLogger::ACTION_CONFIDENTIAL_COMM_EXPORT, $actionsFound, true), "Audit log recorded EXPORT_CONFIDENTIAL_COMM_CSV");

$chainRes = AuditLogger::verifyIntegrity();
report($chainRes['valid'], "Cryptographic hash chain is intact and untampered: " . $chainRes['message']);

// 8. Cleanup Test Patient
echo "\n8. Cleaning Up Fixture Patient...\n";
$removeRes = $service->remove($patientId, $adminUserId);
report($removeRes['success'], "Test patient safely soft-deleted");

echo "\n======================================================================\n";
echo "  TEST SUMMARY: {$passed} PASSED, {$failed} FAILED\n";
echo "======================================================================\n";

if ($failed > 0) {
    exit(1);
}
