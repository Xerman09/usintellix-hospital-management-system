<?php
/**
 * Automated Verification: Patient Right of Access 30-Day Designated Record Set Management
 * Statutory Citations: 45 CFR § 164.524, 45 CFR § 164.501, 21st Century Cures Act § 4004
 */

declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Core\AuditLogger;
use App\Modules\DrsRequests\Services\DrsRequestService;
use App\Modules\Patients\Services\PatientService;

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
echo "  PATIENT RIGHT OF ACCESS 30-DAY DRS (§ 164.524) TEST SUITE\n";
echo "======================================================================\n\n";

$pdo = Database::connection();
$drsService = new DrsRequestService();
$patientService = new PatientService();
$adminUserId = 1;

// Fixture Patient for tests
$uniqueSuffix = time() . '_' . rand(100, 999);
$fixturePatient = [
    'username' => 'drs_test_user_' . $uniqueSuffix,
    'password' => 'Pass12345!@#',
    'first_name' => 'Miriam',
    'middle_name' => 'K',
    'last_name' => 'Rightaccess',
    'sex' => 'female',
    'birthdate' => '1988-04-12',
    'civil_status' => 'Single',
    'blood_type' => 'A+',
    'height' => '165',
    'weight' => '58',
    'allow_sms' => 'yes',
    'allow_voice_calls' => 'yes',
    'allow_voicemail' => 'yes',
    'allow_email' => 'yes',
    'allow_postcard' => 'yes'
];
$createdPatient = $patientService->register($fixturePatient, $adminUserId);
$patientId = (int) ($createdPatient['data']['patient_id'] ?? $createdPatient['data']['id'] ?? 0);

$createdRequestIds = [];

try {
    // -------------------------------------------------------------
    // 1. Schema & Migration 206 Verification
    // -------------------------------------------------------------
    echo "1. Testing Database Schema & Columns (Migration 206)...\n";
    $stmt = $pdo->query("SHOW TABLES LIKE 'hipaa_drs_access_requests'");
    report($stmt->rowCount() > 0, "Table 'hipaa_drs_access_requests' exists in database");

    $cols = $pdo->query("SHOW COLUMNS FROM hipaa_drs_access_requests")->fetchAll(PDO::FETCH_COLUMN);
    $expectedCols = [
        'id', 'request_number', 'patient_id', 'request_date', 'requestor_type',
        'requestor_name', 'requestor_contact', 'request_channel', 'format_requested',
        'delivery_method', 'records_scope', 'scope_start_date', 'scope_end_date',
        'custom_scope_notes', 'initial_deadline', 'is_extended', 'extended_deadline',
        'extension_reason', 'extension_rationale', 'extension_notice_date', 'status',
        'fee_assessed', 'fee_category', 'fee_breakdown', 'fulfillment_date',
        'fulfilled_by', 'denial_reason', 'denial_rationale', 'denial_notice_date',
        'notes', 'created_at', 'updated_at', 'created_by', 'deleted_at'
    ];
    foreach ($expectedCols as $col) {
        report(in_array($col, $cols, true), "Column '{$col}' exists in hipaa_drs_access_requests");
    }

    // -------------------------------------------------------------
    // 2. Statutory Fee Rules Engine (§ 164.524(c)(4))
    // -------------------------------------------------------------
    echo "\n2. Testing Statutory Fee Rules Engine (§ 164.524(c)(4))...\n";

    // A. Search & Retrieval Fee Violation (Categorically Prohibited)
    $illegalSearchData = [
        'patient_id' => $patientId,
        'requestor_name' => 'Miriam Rightaccess',
        'request_date' => date('Y-m-d'),
        'format_requested' => 'electronic_pdf',
        'delivery_method' => 'secure_portal',
        'records_scope' => 'complete_designated_record_set',
        'fee_assessed' => 25.00,
        'fee_category' => 'paper_copying_supplies',
        'fee_breakdown' => 'Archival record search and retrieval fee'
    ];
    $searchRes = $drsService->create($illegalSearchData, $adminUserId);
    report(!$searchRes['success'], "Search/retrieval fee is strictly rejected with error", $searchRes['message'] ?? '');

    // B. Electronic Portal Delivery Fee Violation (Must be $0.00)
    $illegalPortalData = [
        'patient_id' => $patientId,
        'requestor_name' => 'Miriam Rightaccess',
        'request_date' => date('Y-m-d'),
        'format_requested' => 'portal_download',
        'delivery_method' => 'secure_portal',
        'records_scope' => 'complete_designated_record_set',
        'fee_assessed' => 5.00,
        'fee_category' => 'electronic_media_safe_harbor',
        'fee_breakdown' => 'Download fee'
    ];
    $portalRes = $drsService->create($illegalPortalData, $adminUserId);
    report(!$portalRes['success'], "Physical media fee for portal download is strictly rejected", $portalRes['message'] ?? '');

    // C. Electronic Media Safe Harbor Cap ($6.50)
    $excessMediaData = [
        'patient_id' => $patientId,
        'requestor_name' => 'Miriam Rightaccess',
        'request_date' => date('Y-m-d'),
        'format_requested' => 'electronic_pdf',
        'delivery_method' => 'first_class_mail',
        'records_scope' => 'complete_designated_record_set',
        'fee_assessed' => 15.00,
        'fee_category' => 'electronic_media_safe_harbor',
        'fee_breakdown' => 'USB drive'
    ];
    $excessRes = $drsService->create($excessMediaData, $adminUserId);
    report(!$excessRes['success'], "Electronic media fee > $6.50 without cost certification is rejected", $excessRes['message'] ?? '');

    // D. Permissible Safe Harbor Fee ($6.50)
    $validSafeHarborData = [
        'patient_id' => $patientId,
        'requestor_type' => 'patient',
        'requestor_name' => 'Miriam Rightaccess',
        'requestor_contact' => 'miriam@example.com',
        'request_date' => date('Y-m-d'),
        'format_requested' => 'electronic_pdf',
        'delivery_method' => 'first_class_mail',
        'records_scope' => 'complete_designated_record_set',
        'fee_assessed' => 6.50,
        'fee_category' => 'electronic_media_safe_harbor',
        'fee_breakdown' => 'USB flash drive media supplies'
    ];
    $safeRes = $drsService->create($validSafeHarborData, $adminUserId);
    report($safeRes['success'], "Electronic media fee at $6.50 safe harbor is accepted");
    if (!empty($safeRes['data']['id'])) {
        $createdRequestIds[] = (int) $safeRes['data']['id'];
    }

    // -------------------------------------------------------------
    // 3. Request Intake & 30-Day Statutory Countdown
    // -------------------------------------------------------------
    echo "\n3. Testing DRS Request Intake & 30-Day Countdown Clock...\n";
    $today = date('Y-m-d');
    $expectedDeadline = date('Y-m-d', strtotime('+30 days'));

    $intakeData = [
        'patient_id' => $patientId,
        'requestor_type' => 'patient',
        'requestor_name' => 'Miriam Rightaccess',
        'requestor_contact' => 'miriam@example.com',
        'request_channel' => 'patient_portal',
        'format_requested' => 'electronic_pdf',
        'delivery_method' => 'secure_portal',
        'records_scope' => 'complete_designated_record_set',
        'fee_assessed' => 0.00,
        'fee_category' => 'none_zero_fee',
        'fee_breakdown' => 'Electronic portal download at $0.00'
    ];

    $intakeRes = $drsService->create($intakeData, $adminUserId);
    report($intakeRes['success'], "DRS Request created successfully");
    $mainReqId = (int) $intakeRes['data']['id'];
    $createdRequestIds[] = $mainReqId;

    $reqNumber = $intakeRes['data']['request_number'];
    report(strpos($reqNumber, 'DRS-' . date('Y')) === 0, "Sequential request number generated correctly: {$reqNumber}");
    report($intakeRes['data']['initial_deadline'] === $expectedDeadline, "Initial statutory deadline computed as request_date + 30 days: {$expectedDeadline}");
    report($intakeRes['data']['days_remaining'] >= 29 && $intakeRes['data']['days_remaining'] <= 31, "Countdown days remaining computed: {$intakeRes['data']['days_remaining']} days");
    report($intakeRes['data']['is_impending'] === false && $intakeRes['data']['is_overdue'] === false, "Urgency level evaluated to normal (>7 days remaining)");

    // -------------------------------------------------------------
    // 4. Single 30-Day Extension (§ 164.524(b)(2)(ii))
    // -------------------------------------------------------------
    echo "\n4. Testing Statutory Single 30-Day Extension & Limit Enforcement...\n";
    $extData = [
        'extension_reason' => 'offsite_archive_retrieval',
        'extension_rationale' => 'Archived off-site microfiche medical records require off-site retrieval and consolidation.'
    ];
    $extRes = $drsService->grantExtension($mainReqId, $extData, $adminUserId);
    report($extRes['success'], "First 30-day statutory extension granted successfully");

    $updatedReq = $drsService->get($mainReqId);
    $expectedExtDeadline = date('Y-m-d', strtotime('+60 days'));
    report((int) $updatedReq['is_extended'] === 1, "is_extended flag is set to 1");
    report($updatedReq['extended_deadline'] === $expectedExtDeadline, "extended_deadline computed as initial_deadline + 30 days: {$expectedExtDeadline}");
    report($updatedReq['effective_deadline'] === $expectedExtDeadline, "effective_deadline updated to extended deadline");
    report($updatedReq['days_remaining'] >= 59 && $updatedReq['days_remaining'] <= 61, "Extended countdown days remaining: {$updatedReq['days_remaining']} days");

    // Second Extension Attempt - MUST FAIL under § 164.524(b)(2)(ii)
    $secondExtRes = $drsService->grantExtension($mainReqId, [
        'extension_reason' => 'extensive_record_compilation',
        'extension_rationale' => 'Need additional extension beyond the initial 30 days.'
    ], $adminUserId);
    report(!$secondExtRes['success'], "Second extension strictly prohibited by § 164.524(b)(2)(ii)", $secondExtRes['message'] ?? '');

    // -------------------------------------------------------------
    // 5. Formal Extension Notice Letter Data Generation
    // -------------------------------------------------------------
    echo "\n5. Testing Formal Extension Notice Data Generation...\n";
    $noticeRes = $drsService->getExtensionNoticeData($mainReqId);
    report($noticeRes['success'], "getExtensionNoticeData() retrieved notice payload");
    $noticeData = $noticeRes['data'];
    report($noticeData['request_number'] === $reqNumber, "Notice includes correct request number: {$noticeData['request_number']}");
    report(strpos($noticeData['statutory_citation'], '164.524(b)(2)(ii)') !== false, "Notice cites 45 CFR § 164.524(b)(2)(ii)");
    report(!empty($noticeData['extension_reason']), "Notice includes statutory delay reason: {$noticeData['extension_reason']}");
    report(!empty($noticeData['extended_deadline']), "Notice includes new extended deadline: {$noticeData['extended_deadline']}");
    report(!empty($noticeData['facility_name']), "Notice includes facility name: {$noticeData['facility_name']}");

    // -------------------------------------------------------------
    // 6. Complete DRS Bundle Compilation (§ 164.501)
    // -------------------------------------------------------------
    echo "\n6. Testing Complete DRS Bundle Collation (Clinical + Financial)...\n";
    $bundleRes = $drsService->compileDrsBundle($patientId, ['records_scope' => 'complete_designated_record_set']);
    report($bundleRes['success'], "compileDrsBundle() executed successfully");
    $bundle = $bundleRes['data'];

    report(!empty($bundle['metadata']['statutory_authority']), "Bundle contains statutory authority citation: {$bundle['metadata']['statutory_authority']}");
    report(isset($bundle['patient']), "Bundle contains patient demographics domain");
    report($bundle['patient']['first_name'] === 'Miriam', "Demographics contains first name 'Miriam'");
    report(isset($bundle['clinical_records']['encounters_and_visits']), "Bundle contains encounters domain");
    report(isset($bundle['clinical_records']['clinical_soap_notes']), "Bundle contains SOAP clinical notes domain");
    report(isset($bundle['clinical_records']['vital_signs_history']), "Bundle contains vitals domain");
    report(isset($bundle['clinical_records']['problem_list']), "Bundle contains problem list domain");
    report(isset($bundle['clinical_records']['allergies_and_intolerances']), "Bundle contains allergies domain");
    report(isset($bundle['clinical_records']['medications_active']), "Bundle contains medications domain");
    report(isset($bundle['clinical_records']['diagnostic_procedure_results']), "Bundle contains lab results domain");
    report(isset($bundle['billing_records']['financial_ledger']), "Bundle contains billing ledger domain (45 CFR § 164.501)");

    // -------------------------------------------------------------
    // 7. Request Fulfillment & Denial Workflows
    // -------------------------------------------------------------
    echo "\n7. Testing Request Fulfillment & Denial Workflows...\n";
    $fulfillRes = $drsService->fulfillRequest($mainReqId, [
        'fulfillment_date' => date('Y-m-d'),
        'notes' => 'Electronic PDF delivered via secure portal'
    ], $adminUserId);
    report($fulfillRes['success'], "fulfillRequest() completed successfully");
    $fulfilledReq = $drsService->get($mainReqId);
    report($fulfilledReq['status'] === 'fulfilled', "Request status changed to 'fulfilled'");
    report(!empty($fulfilledReq['fulfillment_date']), "fulfillment_date timestamp saved");

    // Test Denial on separate request
    $denyReqData = [
        'patient_id' => $patientId,
        'requestor_name' => 'Miriam Rightaccess',
        'request_date' => $today,
        'format_requested' => 'electronic_pdf',
        'delivery_method' => 'secure_portal',
        'records_scope' => 'complete_designated_record_set',
        'fee_assessed' => 0.00,
        'fee_category' => 'none_zero_fee',
        'fee_breakdown' => 'Free'
    ];
    $denyReqRes = $drsService->create($denyReqData, $adminUserId);
    $denyReqId = (int) $denyReqRes['data']['id'];
    $createdRequestIds[] = $denyReqId;

    $denialData = [
        'denial_reason' => 'exempt_psychotherapy_notes',
        'denial_rationale' => 'Psychotherapy notes exempt from right of access under 45 CFR § 164.524(a)(1)(i).'
    ];
    $denyRes = $drsService->denyRequest($denyReqId, $denialData, $adminUserId);
    report($denyRes['success'], "denyRequest() completed successfully");
    $deniedReq = $drsService->get($denyReqId);
    report($deniedReq['status'] === 'denied', "Request status transitioned to 'denied'");
    report(strpos($deniedReq['denial_rationale'], 'Psychotherapy notes exempt') !== false, "Denial rationale preserved");
    report(!empty($deniedReq['denial_notice_date']), "denial_notice_date timestamp set");

    // -------------------------------------------------------------
    // 8. Regulatory RFC 4180 CSV Registry Export
    // -------------------------------------------------------------
    echo "\n8. Testing Regulatory RFC 4180 CSV Registry Export...\n";
    $csv = $drsService->exportRegistryCsv();
    report(!empty($csv), "exportRegistryCsv() returned non-empty CSV stream");
    report(strpos($csv, '45 CFR § 164.524') !== false, "CSV contains statutory citation header '45 CFR § 164.524'");
    report(strpos($csv, 'Right of Access Request Pipeline') !== false, "CSV contains pipeline title");
    report(strpos($csv, 'Request Number') !== false && strpos($csv, 'Patient Name') !== false, "CSV contains standard column headers");
    report(strpos($csv, $reqNumber) !== false, "CSV contains fixture request number '{$reqNumber}'");
    report(strpos($csv, 'Miriam') !== false, "CSV contains fixture patient name 'Miriam'");

    // -------------------------------------------------------------
    // 9. Tamper-Evident Chained Audit Trail Verification
    // -------------------------------------------------------------
    echo "\n9. Verifying HMAC-SHA-256 Sequential Cryptographic Integrity...\n";
    $auditStmt = $pdo->prepare("SELECT * FROM hipaa_audit_logs WHERE event_category = ? ORDER BY id DESC LIMIT 20");
    $auditStmt->execute([AuditLogger::CATEGORY_RIGHT_OF_ACCESS]);
    $auditRows = $auditStmt->fetchAll(PDO::FETCH_ASSOC);

    report(count($auditRows) >= 5, "AuditLogger recorded RIGHT_OF_ACCESS events in hipaa_audit_logs", "Found " . count($auditRows) . " events");

    $actionsFound = array_column($auditRows, 'action');
    report(in_array(AuditLogger::ACTION_DRS_REQUEST_CREATED, $actionsFound, true), "Audit log recorded ACTION_DRS_REQUEST_CREATED");
    report(in_array(AuditLogger::ACTION_DRS_EXTENSION_GRANTED, $actionsFound, true), "Audit log recorded ACTION_DRS_EXTENSION_GRANTED");
    report(in_array(AuditLogger::ACTION_DRS_BUNDLE_EXPORTED, $actionsFound, true), "Audit log recorded ACTION_DRS_BUNDLE_EXPORTED");
    report(in_array(AuditLogger::ACTION_DRS_FULFILLED, $actionsFound, true), "Audit log recorded ACTION_DRS_FULFILLED");
    report(in_array(AuditLogger::ACTION_DRS_DENIED, $actionsFound, true), "Audit log recorded ACTION_DRS_DENIED");
    report(in_array(AuditLogger::ACTION_DRS_REGISTRY_EXPORT, $actionsFound, true), "Audit log recorded ACTION_DRS_REGISTRY_EXPORT");

    $chainRes = AuditLogger::verifyIntegrity();
    report($chainRes['valid'], "Cryptographic hash chain is intact and untampered: " . $chainRes['message']);

} finally {
    // -------------------------------------------------------------
    // 10. Cleanup Fixtures
    // -------------------------------------------------------------
    echo "\n10. Cleaning Up Test Fixtures...\n";
    foreach ($createdRequestIds as $rid) {
        $pdo->prepare("DELETE FROM hipaa_drs_access_requests WHERE id = ?")->execute([$rid]);
    }
    if ($patientId > 0) {
        $patientService->remove($patientId, $adminUserId);
    }
    echo "  Cleaned up " . count($createdRequestIds) . " test DRS request(s) and test patient.\n";
}

echo "\n======================================================================\n";
echo "  TEST SUMMARY: {$passed} PASSED, {$failed} FAILED\n";
echo "======================================================================\n";

if ($failed > 0) {
    exit(1);
}
