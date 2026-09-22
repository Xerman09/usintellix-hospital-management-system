<?php

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Env;
use App\Core\Database;
use App\Core\Session;
use App\Core\AuditLogger;
use App\Core\AuditRetentionGuard;
use App\Modules\Audit\Controllers\AuditController;

Env::load();

$db = Database::connection();

echo "\n======================================================================\n";
echo "  HIPAA § 164.316(b)(2)(i) 6-YEAR RETENTION & COMPLIANCE EXPORT TEST  \n";
echo "======================================================================\n\n";

$passCount = 0;
$failCount = 0;

function reportTest(string $title, bool $condition, string $detail = ''): void {
    global $passCount, $failCount;
    if ($condition) {
        $passCount++;
        echo "  [PASS] {$title}\n";
        if ($detail) echo "         -> {$detail}\n";
    } else {
        $failCount++;
        echo "  [FAIL] {$title}\n";
        if ($detail) echo "         -> {$detail}\n";
    }
}

// -----------------------------------------------------------------------------
// 1. Test Retention Guard Policy Calculation & Status
// -----------------------------------------------------------------------------
echo "1. Testing AuditRetentionGuard Status Engine...\n";

$status = AuditRetentionGuard::getRetentionStatus();

reportTest(
    'Retention policy status returns successfully',
    $status['success'] === true && $status['policy_status'] === 'COMPLIANT_ACTIVE',
    "Status: {$status['policy_status']}"
);

reportTest(
    'Retention threshold is exactly 6 years (2,191 days)',
    $status['retention_threshold_years'] === 6 && $status['mandatory_retention_days'] === 2191,
    "Threshold: {$status['retention_threshold_years']} Years / {$status['mandatory_retention_days']} Days"
);

reportTest(
    'Statutory regulation correctly cites 45 CFR § 164.316(b)(2)(i)',
    str_contains($status['regulation'], '164.316(b)(2)(i)'),
    "Regulation: {$status['regulation']}"
);

reportTest(
    'Purge-eligible records are 0 (all system logs are within 6 years)',
    $status['purge_eligible_records'] === 0,
    "Purge-eligible: {$status['purge_eligible_records']} of {$status['total_records']} total"
);

reportTest(
    'Database retention trigger is ACTIVE on hipaa_audit_logs',
    $status['database_triggers']['retention_guard_active'] === true,
    "trg_hipaa_audit_logs_retention_guard is registered in engine"
);

reportTest(
    'Database immutability trigger is ACTIVE on hipaa_audit_logs',
    $status['database_triggers']['immutability_guard_active'] === true,
    "trg_hipaa_audit_logs_immutability_guard is registered in engine"
);

// -----------------------------------------------------------------------------
// 2. Test Database Trigger: Deletion Blocked Under 6-Year Policy
// -----------------------------------------------------------------------------
echo "\n2. Testing Database Trigger: trg_hipaa_audit_logs_retention_guard...\n";

// Insert a temporary test audit log using AuditLogger
$testLogId = AuditLogger::log(
    AuditLogger::CATEGORY_SECURITY,
    'TEST_RETENTION_TRIGGER',
    'Automated test record for 6-year retention trigger verification.',
    null,
    1,
    'admin'
);

reportTest('Created test audit record for trigger validation', $testLogId > 0, "Log ID: #{$testLogId}");

// Attempt to delete this newly created record (must be rejected by MariaDB trigger)
$deletionBlocked = false;
$triggerMessage = '';

try {
    $db->exec("DELETE FROM hipaa_audit_logs WHERE id = {$testLogId}");
} catch (PDOException $e) {
    $deletionBlocked = true;
    $triggerMessage = $e->getMessage();
}

reportTest(
    'Database trigger strictly blocks deletion of audit log within 6 years (SQLSTATE 45000)',
    $deletionBlocked && str_contains($triggerMessage, '164.316(b)(2)(i)'),
    "Trigger exception: " . substr($triggerMessage, 0, 95) . "..."
);

// -----------------------------------------------------------------------------
// 3. Test Database Trigger: Immutability Update Blocked
// -----------------------------------------------------------------------------
echo "\n3. Testing Database Trigger: trg_hipaa_audit_logs_immutability_guard...\n";

$updateBlocked = false;
$updateMessage = '';

try {
    $db->exec("UPDATE hipaa_audit_logs SET description = 'TAMPERED TEXT' WHERE id = {$testLogId}");
} catch (PDOException $e) {
    $updateBlocked = true;
    $updateMessage = $e->getMessage();
}

reportTest(
    'Database trigger strictly blocks update/modification of audit log (SQLSTATE 45000)',
    $updateBlocked && str_contains($updateMessage, '164.312(b)'),
    "Trigger exception: " . substr($updateMessage, 0, 95) . "..."
);

// -----------------------------------------------------------------------------
// 4. Test Application-Level Retention Purge Guard
// -----------------------------------------------------------------------------
echo "\n4. Testing AuditRetentionGuard::assertPurgeEligibility()...\n";

$todayEligible = AuditRetentionGuard::assertPurgeEligibility(date('Y-m-d'));
reportTest('assertPurgeEligibility correctly rejects current date purge', $todayEligible === false, 'Current date cannot be purged');

$sevenYearsAgo = date('Y-m-d', strtotime('-7 years'));
$oldEligible = AuditRetentionGuard::assertPurgeEligibility($sevenYearsAgo);
reportTest('assertPurgeEligibility accepts date older than 6 years', $oldEligible === true, "Date: {$sevenYearsAgo}");

// Check that the blocked attempt was logged to hipaa_audit_logs
$blockedLog = $db->query("
    SELECT * FROM hipaa_audit_logs 
    WHERE action = 'RETENTION_PURGE_BLOCKED' 
    ORDER BY id DESC LIMIT 1
")->fetch(PDO::FETCH_ASSOC);

reportTest(
    'Unauthorized purge attempt recorded as immutable audit event',
    !empty($blockedLog),
    "Action: " . ($blockedLog['action'] ?? 'none') . " - ID: #" . ($blockedLog['id'] ?? 0)
);

// Helper for running controller endpoints that call exit;
function runSubprocess(string $code): string {
    $script = "require_once 'backend/app/Core/Autoload.php'; App\Core\Env::load(); " . $code;
    $tempFile = sys_get_temp_dir() . '/test_sub_' . uniqid() . '.php';
    file_put_contents($tempFile, "<?php " . $script);
    $output = shell_exec("php " . escapeshellarg($tempFile) . " 2>&1");
    @unlink($tempFile);
    return (string) $output;
}

// -----------------------------------------------------------------------------
// 5. Test Compliance CSV Export Generation
// -----------------------------------------------------------------------------
echo "\n5. Testing HIPAA Compliance CSV Export...\n";

$csvSubCode = '
App\Core\Session::set("user", ["id" => 1, "username" => "compliance_admin", "role" => "admin"]);
$controller = new App\Modules\Audit\Controllers\AuditController();
$controller->exportCsv();
';

$csvResponseRaw = runSubprocess($csvSubCode);
$csvData = json_decode($csvResponseRaw, true);
$csvContent = $csvData['data']['csv'] ?? '';

reportTest(
    'CSV export endpoint executes successfully',
    !empty($csvData['success']) && !empty($csvContent),
    "Filename: {$csvData['data']['filename']}, Records: {$csvData['data']['total_records']}"
);

reportTest(
    'CSV export contains statutory citations (§ 164.312(b) & § 164.316(b)(2)(i))',
    str_contains($csvContent, '45 CFR § 164.316(b)(2)(i)') && str_contains($csvContent, '164.312(b)'),
    'Federal compliance header present'
);

reportTest(
    'CSV export contains cryptographic verification and HMAC hash columns',
    str_contains($csvContent, 'SHA-256 HMAC') && (str_contains($csvContent, 'tamper_hash') || str_contains($csvContent, 'SHA-256 HMAC Tamper Hash')),
    'Cryptographic integrity columns present'
);

// Verify that the export event was logged to hipaa_audit_logs
$csvAuditRecord = $db->query("
    SELECT * FROM hipaa_audit_logs 
    WHERE action = 'AUDIT_EXPORT_CSV' 
    ORDER BY id DESC LIMIT 1
")->fetch(PDO::FETCH_ASSOC);

reportTest(
    'CSV Export logged to hipaa_audit_logs with AUDIT_EXPORT_CSV',
    !empty($csvAuditRecord),
    "Logged ID #{$csvAuditRecord['id']}: {$csvAuditRecord['description']}"
);

// -----------------------------------------------------------------------------
// 6. Test Compliance PDF Report Data Payload
// -----------------------------------------------------------------------------
echo "\n6. Testing HIPAA Compliance PDF Report Data Payload...\n";

$pdfSubCode = '
App\Core\Session::set("user", ["id" => 1, "username" => "compliance_admin", "role" => "admin"]);
$controller = new App\Modules\Audit\Controllers\AuditController();
$controller->exportReportData();
';

$pdfResponseRaw = runSubprocess($pdfSubCode);
$pdfData = json_decode($pdfResponseRaw, true);
$pdfPayload = $pdfData['data'] ?? [];

reportTest(
    'PDF report endpoint returns comprehensive compliance data',
    !empty($pdfData['success']) && isset($pdfPayload['logs']) && isset($pdfPayload['retention']),
    "Records: {$pdfPayload['total']}, Facility: " . ($pdfPayload['hospital']['name'] ?? 'None')
);

reportTest(
    'PDF payload includes cryptographic chain verification',
    isset($pdfPayload['verification']['valid']),
    "Chain valid: " . (($pdfPayload['verification']['valid'] ?? false) ? 'YES' : 'NO')
);

// Verify that the PDF export event was logged
$pdfAuditRecord = $db->query("
    SELECT * FROM hipaa_audit_logs 
    WHERE action = 'AUDIT_EXPORT_PDF' 
    ORDER BY id DESC LIMIT 1
")->fetch(PDO::FETCH_ASSOC);

reportTest(
    'PDF Export logged to hipaa_audit_logs with AUDIT_EXPORT_PDF',
    !empty($pdfAuditRecord),
    "Logged ID #{$pdfAuditRecord['id']}: {$pdfAuditRecord['description']}"
);

// -----------------------------------------------------------------------------
// 7. Verify Entire Cryptographic Chain Remains Valid
// -----------------------------------------------------------------------------
echo "\n7. Testing Overall Cryptographic HMAC SHA-256 Chain...\n";

$chainVerification = AuditLogger::verifyIntegrity();

reportTest(
    'Cryptographic HMAC SHA-256 chain is 100% valid and unbroken across all records',
    $chainVerification['valid'] === true,
    "Verified records: {$chainVerification['total_verified']}"
);

echo "\n======================================================================\n";
echo "  SUMMARY: {$passCount} PASSED, {$failCount} FAILED\n";
echo "======================================================================\n\n";

if ($failCount > 0) {
    exit(1);
}
exit(0);
