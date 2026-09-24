<?php
/**
 * Automated Verification: Accounting of Disclosures Log (HIPAA § 164.528)
 * Regulatory Framework: 45 CFR § 164.528, 45 CFR § 164.512
 */

declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Core\AuditLogger;
use App\Modules\Disclosures\Services\DisclosureService;
use App\Modules\Patients\Models\Patient;

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
echo "  HIPAA § 164.528 ACCOUNTING OF DISCLOSURES LOG AUTOMATED TEST SUITE \n";
echo "======================================================================\n\n";

$db = Database::connection();
$disclosureService = new DisclosureService();

// -----------------------------------------------------------------------------
// 1. Schema & Migration 201 Verification
// -----------------------------------------------------------------------------
echo "1. Testing Database Schema & Statutory Columns (Migration 201)...\n";

$requiredColumns = [
    'legal_basis',
    'purpose',
    'recipient_address',
    'records_disclosed',
    'requestor_name',
    'disclosure_medium',
    'reference_number',
    'is_tpo_exempt',
    'deleted_at',
    'deleted_by'
];

foreach ($requiredColumns as $col) {
    $res = $db->query("SHOW COLUMNS FROM disclosures LIKE '{$col}'")->fetchAll();
    report(!empty($res), "Column '{$col}' exists on disclosures table");
}

$indexes = $db->query("SHOW INDEX FROM disclosures WHERE Key_name IN ('idx_disclosures_date', 'idx_disclosures_legal_basis')")->fetchAll();
report(count($indexes) >= 2, "Indexes idx_disclosures_date and idx_disclosures_legal_basis exist on disclosures");

// -----------------------------------------------------------------------------
// 2. Setup Test Patient
// -----------------------------------------------------------------------------
echo "\n2. Setting Up Test Patient for Accounting Ledger...\n";

$timestamp = time();

$userModel = new \App\Modules\Users\Models\User();
$testUserId = (int) $userModel->create([
    'username'             => "test_disc_user_{$timestamp}",
    'password'             => password_hash("TestP@ss1234!", PASSWORD_DEFAULT),
    'must_change_password' => 0,
    'npp_acknowledged'     => 1,
    'created_at'           => date('Y-m-d H:i:s')
]);

$patientModel = new Patient();
$testPatientId = (int) $patientModel->create([
    'user_id'      => $testUserId,
    'patient_no'   => "MRN-TEST-{$timestamp}",
    'first_name'   => "Eleanor",
    'last_name'    => "Vance-{$timestamp}",
    'birthdate'    => '1985-04-12',
    'sex'          => 'female',
    'civil_status' => 'Single',
    'created_at'   => date('Y-m-d H:i:s')
]);

report($testPatientId > 0, "Test patient Eleanor Vance created with ID #{$testPatientId}");

$testUser = [
    'id'   => 1,
    'role' => 'admin',
    'name' => 'System Administrator'
];

// -----------------------------------------------------------------------------
// 3. Validation Enforcement (§ 164.528(b)(2))
// -----------------------------------------------------------------------------
echo "\n3. Testing Statutory Input Validation (§ 164.528(b)(2))...\n";

// Empty recipient
$emptyRecipRes = $disclosureService->store($testPatientId, 1, [
    'recipient'         => '',
    'purpose'           => 'Mandatory reporting',
    'records_disclosed' => 'Labs'
], $testUser);
report(!$emptyRecipRes['success'], "Rejects disclosure with empty recipient");

// Empty purpose
$emptyPurposeRes = $disclosureService->store($testPatientId, 1, [
    'recipient'         => 'State Health Dept',
    'purpose'           => '',
    'records_disclosed' => 'Labs'
], $testUser);
report(!$emptyPurposeRes['success'], "Rejects disclosure with empty statement of purpose (§ 164.528(b)(2)(iv))");

// Empty records disclosed
$emptyRecordsRes = $disclosureService->store($testPatientId, 1, [
    'recipient'         => 'State Health Dept',
    'purpose'           => 'Communicable disease mandate',
    'records_disclosed' => ''
], $testUser);
report(!$emptyRecordsRes['success'], "Rejects disclosure with empty records disclosed (§ 164.528(b)(2)(iii))");

// -----------------------------------------------------------------------------
// 4. Record Disclosures & Verify Storage & Audit Trail
// -----------------------------------------------------------------------------
echo "\n4. Testing Disclosure Recording & Chained Audit Logging...\n";

$disc1 = $disclosureService->store($testPatientId, 1, [
    'disclosure_date'   => '2026-03-15 10:30:00',
    'legal_basis'       => 'court_order_subpoena',
    'recipient'         => 'County Superior Court',
    'recipient_address' => '300 Main St, Suite 400',
    'requestor_name'    => 'Judge Thomas Drake',
    'disclosure_medium' => 'electronic_portal',
    'reference_number'  => "SUBPOENA-{$timestamp}-1",
    'purpose'           => 'Subpoena duces tecum in civil matter Case #2026-CV-101',
    'records_disclosed' => 'Encounter progress notes from Jan 2026 - Mar 2026',
    'description'       => 'Electronic transmission verified via secure HIM portal'
], $testUser);

report($disc1['success'], "Successfully recorded Subpoena disclosure #{$disc1['data']['id']}");
$disc1Id = (int) $disc1['data']['id'];

// Verify fields in DB
$row1 = $db->query("SELECT * FROM disclosures WHERE id = {$disc1Id}")->fetch(PDO::FETCH_ASSOC);
report($row1['legal_basis'] === 'court_order_subpoena', "Database persisted legal_basis = 'court_order_subpoena'");
report($row1['recipient'] === 'County Superior Court', "Database persisted recipient = 'County Superior Court'");
report($row1['requestor_name'] === 'Judge Thomas Drake', "Database persisted requestor_name = 'Judge Thomas Drake'");
report($row1['reference_number'] === "SUBPOENA-{$timestamp}-1", "Database persisted reference_number");

// Verify Audit Log entry
$auditRow = $db->query("SELECT * FROM hipaa_audit_logs WHERE event_category = 'DISCLOSURE' AND action = 'RECORD_DISCLOSURE' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
report(!empty($auditRow) && (int) $auditRow['patient_id'] === $testPatientId, "AuditLogger recorded RECORD_DISCLOSURE event for patient #{$testPatientId}");

// Record second disclosure (Public Health)
$disc2 = $disclosureService->store($testPatientId, 1, [
    'disclosure_date'   => '2026-06-20 14:15:00',
    'legal_basis'       => 'public_health',
    'recipient'         => 'State Department of Public Health',
    'recipient_address' => '500 Capitol Way, Albany, NY',
    'requestor_name'    => 'Dr. Ronald Clark, State Epidemiologist',
    'disclosure_medium' => 'secure_email',
    'reference_number'  => "DOH-EPI-{$timestamp}",
    'purpose'           => 'Mandatory communicable disease surveillance report under Public Health Law',
    'records_disclosed' => 'COVID-19 & Influenza diagnostic PCR results',
    'description'       => 'Encrypted automated submission'
], $testUser);
report($disc2['success'], "Successfully recorded Public Health disclosure #{$disc2['data']['id']}");
$disc2Id = (int) $disc2['data']['id'];

// -----------------------------------------------------------------------------
// 5. Update & Soft-Deletion Operations
// -----------------------------------------------------------------------------
echo "\n5. Testing Update & Soft-Deletion Operations with Audit Logging...\n";

$updateRes = $disclosureService->update($disc1Id, [
    'recipient'         => 'County Superior Court (Criminal Division)',
    'purpose'           => 'Updated subpoena duces tecum pursuant to amended order',
    'records_disclosed' => 'Encounter progress notes and radiology imaging reports'
], 1, $testUser);

report($updateRes['success'], "Successfully updated disclosure #{$disc1Id}");

$row1Updated = $db->query("SELECT * FROM disclosures WHERE id = {$disc1Id}")->fetch(PDO::FETCH_ASSOC);
report($row1Updated['recipient'] === 'County Superior Court (Criminal Division)', "Updated recipient successfully persisted");

$updateAudit = $db->query("SELECT * FROM hipaa_audit_logs WHERE action = 'UPDATE_DISCLOSURE' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
report(!empty($updateAudit) && (int) $updateAudit['patient_id'] === $testPatientId, "AuditLogger recorded UPDATE_DISCLOSURE in audit log");

// Soft delete disc1
$deleteRes = $disclosureService->remove($disc1Id, 1, $testUser);
report($deleteRes['success'], "Successfully soft-deleted disclosure #{$disc1Id}");

$row1Deleted = $db->query("SELECT * FROM disclosures WHERE id = {$disc1Id}")->fetch(PDO::FETCH_ASSOC);
report(!empty($row1Deleted['deleted_at']) && (int) $row1Deleted['deleted_by'] === 1, "deleted_at and deleted_by set on soft deletion");

$deleteAudit = $db->query("SELECT * FROM hipaa_audit_logs WHERE action = 'DELETE_DISCLOSURE' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
report(!empty($deleteAudit) && (int) $deleteAudit['patient_id'] === $testPatientId, "AuditLogger recorded DELETE_DISCLOSURE in audit log");

// Active list excludes deleted
$activeList = $disclosureService->list($testPatientId);
$activeIds = array_column($activeList, 'id');
report(!in_array($disc1Id, $activeIds, true) && in_array($disc2Id, $activeIds, true), "Active disclosures list excludes soft-deleted records");

// -----------------------------------------------------------------------------
// 6. Statistics & Aggregation
// -----------------------------------------------------------------------------
echo "\n6. Testing Disclosure Statistics & Aggregation...\n";

$stats = $disclosureService->stats();
report(is_array($stats), "DisclosureService::stats() returns metrics array");
report(isset($stats['total_disclosures']), "Stats contain 'total_disclosures' (Count: " . ($stats['total_disclosures'] ?? 0) . ")");
report(isset($stats['subpoenas_court_orders']), "Stats contain 'subpoenas_court_orders' (Count: " . ($stats['subpoenas_court_orders'] ?? 0) . ")");
report(isset($stats['public_health']), "Stats contain 'public_health' (Count: " . ($stats['public_health'] ?? 0) . ")");
report(isset($stats['six_year_window_count']), "Stats contain 'six_year_window_count' (Count: " . ($stats['six_year_window_count'] ?? 0) . ")");

// -----------------------------------------------------------------------------
// 7. Formal Patient Accounting Statement Generation (§ 164.528(c)(1))
// -----------------------------------------------------------------------------
echo "\n7. Testing Formal Patient Accounting Statement Generation (§ 164.528)...\n";

$reportRes = $disclosureService->getReportData($testPatientId, null, null, $testUser);
report($reportRes['success'], "getReportData returned success for patient #{$testPatientId}");

$report = $reportRes['data'];
report($report['statutory_basis'] === '45 CFR § 164.528 (HIPAA Privacy Rule)', "Report includes statutory authority citation");
report($report['patient']['id'] == $testPatientId, "Report patient metadata matches requested patient");
report(!empty($report['facility']['name']), "Report includes facility letterhead name: {$report['facility']['name']}");
report(count($report['disclosures']) === 1, "Report contains 1 active non-TPO disclosure");
report(!empty($report['statutory_notice']), "Report contains statutory TPO exemption notice");

$reportAudit = $db->query("SELECT * FROM hipaa_audit_logs WHERE action = 'EXPORT_DISCLOSURE_REPORT' ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);
report(!empty($reportAudit) && (int) $reportAudit['patient_id'] === $testPatientId, "AuditLogger logged EXPORT_DISCLOSURE_REPORT for patient statement generation");

// -----------------------------------------------------------------------------
// 8. Regulatory RFC 4180 CSV Export
// -----------------------------------------------------------------------------
echo "\n8. Testing Regulatory CSV Export for Compliance Audits...\n";

ob_start();
$disclosureService->exportCsv($testPatientId, [], $testUser);
$csvOutput = ob_get_clean();

report(strpos($csvOutput, 'HIPAA § 164.528 Accounting of Disclosures Export') !== false, "CSV contains compliance metadata header");
report(strpos($csvOutput, 'Disclosure Date') !== false && strpos($csvOutput, 'Recipient Entity') !== false, "CSV contains standard column headers");
report(strpos($csvOutput, 'State Department of Public Health') !== false, "CSV contains disclosure recipient data row");

// -----------------------------------------------------------------------------
// 9. Tamper-Evident SHA-256 HMAC Chain Verification
// -----------------------------------------------------------------------------
echo "\n9. Testing Cryptographic Audit Trail Hash Chain Integrity...\n";

$integrityCheck = AuditLogger::verifyIntegrity(500);
report($integrityCheck['valid'] === true, "Cryptographic hash chain is intact and untampered: {$integrityCheck['message']}");

// -----------------------------------------------------------------------------
// 10. Clean Up Test Records
// -----------------------------------------------------------------------------
echo "\n10. Cleaning Up Test Artifacts...\n";
$db->exec("DELETE FROM disclosures WHERE patient_id = {$testPatientId}");
$db->exec("DELETE FROM patients WHERE id = {$testPatientId}");
$db->exec("DELETE FROM users WHERE id = {$testUserId}");
report(true, "Cleaned up test disclosures, patient #{$testPatientId}, and user #{$testUserId}");

echo "\n======================================================================\n";
echo "  TEST RESULTS: {$passed} PASSED, {$failed} FAILED\n";
echo "======================================================================\n";

exit($failed > 0 ? 1 : 0);
