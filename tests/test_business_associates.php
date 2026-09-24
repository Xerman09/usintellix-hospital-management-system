<?php
/**
 * Automated Verification: HIPAA Business Associate Agreement (BAA) & Vendor Governance
 * Statutory Citations: 45 CFR § 164.502(e), § 164.504(e), and 45 CFR § 164.308(b)(1)
 */

declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Core\AuditLogger;
use App\Modules\BusinessAssociates\Services\BusinessAssociateService;

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
echo "  HIPAA BUSINESS ASSOCIATE AGREEMENT (BAA) REGISTRY TEST SUITE        \n";
echo "======================================================================\n\n";

$pdo = Database::getInstance()->getConnection();
$service = new BusinessAssociateService();
$adminUser = ['id' => 1, 'email' => 'admin@uhms.org', 'role' => 'admin'];

// 1. Schema & Column Verification
echo "1. Testing Database Schema & Columns (Migration 203)...\n";
$stmt = $pdo->query("SHOW TABLES LIKE 'hipaa_business_associates'");
report($stmt->rowCount() > 0, "Table 'hipaa_business_associates' exists in database");

$colsStmt = $pdo->query("SHOW COLUMNS FROM hipaa_business_associates");
$cols = $colsStmt->fetchAll(PDO::FETCH_COLUMN);

$expectedCols = [
    'vendor_name',
    'vendor_category',
    'service_description',
    'phi_data_types_handled',
    'primary_contact_name',
    'primary_contact_email',
    'primary_contact_phone',
    'vendor_address',
    'has_signed_baa',
    'baa_execution_date',
    'baa_expiration_date',
    'last_compliance_audit_date',
    'next_review_deadline',
    'baa_document_filename',
    'baa_status',
    'subcontractor_handling_phi',
    'soc2_or_hitrust_certified',
    'breach_notification_sla_hours',
    'notes',
    'is_active',
    'deleted_at'
];

foreach ($expectedCols as $col) {
    report(in_array($col, $cols, true), "Column '{$col}' exists on hipaa_business_associates table");
}

// 2. Testing Seeded Baseline Vendors
echo "\n2. Verifying Baseline Seeded Healthcare Business Associates...\n";
$vendors = $service->list();
report(count($vendors) >= 5, "Baseline vendors seeded", "Total found: " . count($vendors));

$names = array_column($vendors, 'vendor_name');
report(in_array('Amazon Web Services (AWS)', $names, true), "AWS Cloud Infrastructure seeded");
report(in_array('Twilio Inc.', $names, true), "Twilio Communications Gateway seeded");
report(in_array('Quest Diagnostics Inc.', $names, true), "Quest Diagnostics Lab Interface seeded");
report(in_array('Change Healthcare / Optum', $names, true), "Change Healthcare Clearinghouse seeded");
report(in_array('Local Medical Transcription Services LLC', $names, true), "Local Transcription missing-BAA test vendor seeded");

// 3. Testing Dynamic Compliance Status Calculator
echo "\n3. Testing BAA Status Calculation Engine (§ 164.502(e))...\n";

$statusMissing = $service->computeStatus(['has_signed_baa' => 0, 'baa_expiration_date' => '2028-01-01']);
report($statusMissing === 'missing_baa', "Correctly flags missing BAA when has_signed_baa = 0", "Result: {$statusMissing}");

$statusExpired = $service->computeStatus(['has_signed_baa' => 1, 'baa_expiration_date' => '2023-01-01']);
report($statusExpired === 'expired', "Correctly flags expired BAA when expiration date is in the past", "Result: {$statusExpired}");

$todayPlus20 = (new DateTime('+20 days'))->format('Y-m-d');
$statusExpiring = $service->computeStatus(['has_signed_baa' => 1, 'baa_expiration_date' => $todayPlus20]);
report($statusExpiring === 'expiring_soon', "Correctly flags BAA expiring within 60 days", "Result: {$statusExpiring}");

$todayPlus500 = (new DateTime('+500 days'))->format('Y-m-d');
$statusActive = $service->computeStatus(['has_signed_baa' => 1, 'baa_expiration_date' => $todayPlus500]);
report($statusActive === 'active', "Correctly flags active compliant BAA", "Result: {$statusActive}");

// 4. Testing Input Validation Constraints
echo "\n4. Testing Input Validation & Statutory Constraints...\n";

$resEmptyName = $service->create(['vendor_name' => '', 'service_description' => 'Hosting', 'phi_data_types_handled' => 'All'], $adminUser);
report(!$resEmptyName['success'], "Rejects vendor registration with empty vendor name");

$resEmptyDesc = $service->create(['vendor_name' => 'Test Vendor', 'service_description' => '', 'phi_data_types_handled' => 'All'], $adminUser);
report(!$resEmptyDesc['success'], "Rejects vendor registration with empty service description");

$resEmptyPhi = $service->create(['vendor_name' => 'Test Vendor', 'service_description' => 'Cloud backup', 'phi_data_types_handled' => ''], $adminUser);
report(!$resEmptyPhi['success'], "Rejects vendor registration with empty PHI data types");

// 5. Testing Vendor Registration & Audit Logging
echo "\n5. Testing Vendor Registration & Audit Trail (§ 164.504(e))...\n";

$testVendorData = [
    'vendor_name'                   => 'Veritas Cloud Archival Systems LLC',
    'vendor_category'               => 'cloud_hosting',
    'service_description'           => 'Encrypted offsite immutable backup archival for disaster recovery compliance.',
    'phi_data_types_handled'        => 'Encrypted Database Backups, Demographic Indexes, Audit Logs',
    'primary_contact_name'          => 'Mark Henderson',
    'primary_contact_email'         => 'compliance@veritas-cloud.test',
    'primary_contact_phone'         => '1-800-555-9080',
    'vendor_address'                => '500 Tech Parkway, Austin, TX 78701',
    'has_signed_baa'                => 1,
    'baa_execution_date'            => '2025-05-01',
    'baa_expiration_date'           => (new DateTime('+2 years'))->format('Y-m-d'),
    'last_compliance_audit_date'    => '2026-01-15',
    'next_review_deadline'          => '2027-01-15',
    'baa_document_filename'         => 'Veritas_Executed_BAA_2025.pdf',
    'subcontractor_handling_phi'    => 1,
    'soc2_or_hitrust_certified'     => 1,
    'breach_notification_sla_hours' => 24,
    'notes'                         => 'Disaster recovery partner with signed enterprise BAA.'
];

$resCreate = $service->create($testVendorData, $adminUser);
report($resCreate['success'], "Successfully registered new Business Associate vendor");
$createdId = (int) ($resCreate['data']['id'] ?? 0);
report($createdId > 0, "Generated valid Vendor ID #{$createdId}");
report($resCreate['data']['baa_status'] === 'active', "BAA status initialized to 'active'");
report($resCreate['data']['subcontractor_handling_phi'] == 1, "Subcontractor warranty flag persisted");
report($resCreate['data']['breach_notification_sla_hours'] == 24, "Breach notification SLA hours (24h) persisted");

// 6. Testing Vendor Profile Update & Dynamic Recalculation
echo "\n6. Testing Vendor Profile Update & Status Synchronization...\n";

$updateData = [
    'baa_expiration_date' => (new DateTime('-10 days'))->format('Y-m-d'),
    'notes'               => 'Agreement expired without renewal.'
];

$resUpdate = $service->update($createdId, $updateData, $adminUser);
report($resUpdate['success'], "Successfully updated Business Associate vendor");
report($resUpdate['data']['baa_status'] === 'expired', "BAA status dynamically updated to 'expired' based on expiration date");

// 7. Testing Aggregation & Critical Dashboard Alerts
echo "\n7. Testing Aggregation Metrics & Critical Dashboard Warnings...\n";

$stats = $service->stats();
report($stats['total_vendors'] >= 6, "Total vendors count calculated", "Count: " . $stats['total_vendors']);
report($stats['missing_baas'] >= 1, "Missing BAA count tracks unexecuted vendors", "Count: " . $stats['missing_baas']);
report($stats['expired_baas'] >= 1, "Expired BAA count tracks overdue agreements", "Count: " . $stats['expired_baas']);
report($stats['critical_alert'] === true, "Critical dashboard alert triggered due to missing/expired BAAs");
report($stats['subcontractors_count'] >= 1, "Subcontractor count tracked (§ 164.504(e)(2)(ii)(D))");
report($stats['soc2_certified_count'] >= 1, "SOC2/HITRUST certified vendor count tracked");

// 8. Testing Vendor Compliance Audit Dossier Generator
echo "\n8. Testing Vendor BAA Compliance Dossier Generator (OCR Question #1)...\n";

$resDossier = $service->generateVendorInventoryReport($createdId, $adminUser);
report($resDossier['success'], "Successfully compiled Vendor BAA Compliance Dossier");
$dossier = $resDossier['data'];
report(!empty($dossier['facility_name']), "Dossier includes facility letterhead name");
report(!empty($dossier['statutory_authority']), "Dossier includes statutory citation");
report(!empty($dossier['compliance_certification']['contractual_safeguards']), "Dossier contains § 164.504(e)(2) safeguard certification");
report(!empty($dossier['compliance_certification']['breach_reporting_mandate']), "Dossier certifies contractual breach SLA notification mandate");
report(!empty($dossier['compliance_certification']['termination_upon_breach']), "Dossier certifies unilateral termination rights upon HIPAA breach");

// 9. Testing Regulatory CSV Export for Compliance Audits
echo "\n9. Testing Regulatory RFC 4180 CSV Export for OCR Audits...\n";

$csvContent = $service->exportCsv([], $adminUser);
report(str_contains($csvContent, '# USINTELLIX HOSPITAL MANAGEMENT SYSTEM - HIPAA BUSINESS ASSOCIATE AGREEMENT (BAA) INVENTORY'), "CSV contains statutory compliance header");
report(str_contains($csvContent, 'Vendor Legal Name'), "CSV contains standard column headers");
report(str_contains($csvContent, 'Veritas Cloud Archival Systems LLC'), "CSV contains registered test vendor row");
report(str_contains($csvContent, 'Amazon Web Services (AWS)'), "CSV contains baseline cloud vendor row");

// 10. Testing Soft-Delete
echo "\n10. Testing Soft-Delete & Exclusion...\n";

$resDelete = $service->delete($createdId, $adminUser);
report($resDelete['success'], "Successfully soft-deleted test vendor");
$findDeleted = $service->find($createdId);
report($findDeleted === null, "Soft-deleted vendor excluded from active queries");

// 11. Testing Cryptographic HMAC-SHA-256 Audit Trail
echo "\n11. Testing Tamper-Evident SHA-256 HMAC Audit Trail Integrity...\n";

$auditStmt = $pdo->query("SELECT * FROM hipaa_audit_logs WHERE event_category = 'BAA_VENDOR_GOVERNANCE' ORDER BY id DESC LIMIT 5");
$auditRows = $auditStmt->fetchAll(PDO::FETCH_ASSOC);
report(count($auditRows) >= 4, "AuditLogger committed BAA events to hipaa_audit_logs", "Found " . count($auditRows) . " BAA events");

$actionsFound = array_column($auditRows, 'action');
report(in_array('RECORD_BUSINESS_ASSOCIATE', $actionsFound, true), "Audit log recorded RECORD_BUSINESS_ASSOCIATE");
report(in_array('UPDATE_BUSINESS_ASSOCIATE', $actionsFound, true), "Audit log recorded UPDATE_BUSINESS_ASSOCIATE");
report(in_array('DELETE_BUSINESS_ASSOCIATE', $actionsFound, true), "Audit log recorded DELETE_BUSINESS_ASSOCIATE");
report(in_array('EXPORT_BAA_REGISTRY_CSV', $actionsFound, true), "Audit log recorded EXPORT_BAA_REGISTRY_CSV");

$chainRes = AuditLogger::verifyIntegrity();
report($chainRes['valid'], "Cryptographic hash chain is intact and untampered: " . $chainRes['message']);

echo "\n======================================================================\n";
echo "  TEST RESULTS: {$passed} PASSED, {$failed} FAILED\n";
echo "======================================================================\n";

if ($failed > 0) {
    exit(1);
}
