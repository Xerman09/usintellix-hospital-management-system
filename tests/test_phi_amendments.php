<?php
/**
 * Automated Verification: Formal Statutory PHI Amendment Workflow
 * Statutory Citations: 45 CFR § 164.526, 45 CFR § 164.501, 45 CFR § 164.524
 */

declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Core\AuditLogger;
use App\Modules\Amendments\Services\AmendmentService;
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
echo "  STATUTORY PHI AMENDMENT WORKFLOW (§ 164.526) TEST SUITE\n";
echo "======================================================================\n\n";

$pdo = Database::connection();
$amendmentService = new AmendmentService();
$drsService = new DrsRequestService();
$patientService = new PatientService();
$adminUserId = 1;

// Fixture Patient for tests
$uniqueSuffix = time() . '_' . rand(100, 999);
$fixturePatient = [
    'username' => 'amend_test_user_' . $uniqueSuffix,
    'password' => 'Pass12345!@#',
    'first_name' => 'Eleanor',
    'middle_name' => 'M',
    'last_name' => 'Amendment',
    'sex' => 'female',
    'birthdate' => '1992-06-15',
    'civil_status' => 'Married',
    'blood_type' => 'O+',
    'height' => '170',
    'weight' => '62',
    'allow_sms' => 'yes',
    'allow_voice_calls' => 'yes',
    'allow_voicemail' => 'yes',
    'allow_email' => 'yes',
    'allow_postcard' => 'yes'
];
$createdPatient = $patientService->register($fixturePatient, $adminUserId);
$patientId = (int) ($createdPatient['data']['patient_id'] ?? $createdPatient['data']['id'] ?? 0);

$createdAmendmentIds = [];

try {
    // -------------------------------------------------------------
    // 1. Schema & Migration 207 Verification
    // -------------------------------------------------------------
    echo "1. Testing Database Schema & Columns (Migration 207)...\n";
    $stmt = $pdo->query("SHOW TABLES LIKE 'amendments'");
    report($stmt->rowCount() > 0, "Table 'amendments' exists in database");

    $cols = $pdo->query("SHOW COLUMNS FROM amendments")->fetchAll(PDO::FETCH_COLUMN);
    $expectedCols = [
        'id', 'amendment_number', 'patient_id', 'request_date', 'requester_type',
        'requester_contact', 'target_record_type', 'target_record_id', 'target_record_label',
        'disputed_text', 'requested_amendment', 'initial_deadline', 'is_extended',
        'extended_deadline', 'extension_reason', 'extension_rationale', 'extension_notice_date',
        'review_decision_date', 'reviewed_by', 'denial_statutory_ground', 'denial_rationale',
        'denial_notice_date', 'acceptance_notes', 'accepted_linked_at',
        'statement_of_disagreement', 'disagreement_received_at', 'statement_of_rebuttal',
        'rebuttal_provided_at', 'future_disclosure_dissemination_requested', 'status'
    ];
    foreach ($expectedCols as $col) {
        report(in_array($col, $cols, true), "Column '{$col}' exists in amendments table");
    }

    // -------------------------------------------------------------
    // 2. 60-Calendar-Day Statutory Action Timeline (§ 164.526(b)(2))
    // -------------------------------------------------------------
    echo "\n2. Testing 60-Day Statutory Countdown & Intake (§ 164.526(b)(2))...\n";
    $intakeData = [
        'patient_id' => $patientId,
        'request_date' => '2026-09-01',
        'requester_type' => 'patient',
        'requester_contact' => '555-0199',
        'target_record_type' => 'encounter_soap_note',
        'target_record_label' => 'Progress Note on 2026-08-15',
        'disputed_text' => 'Patient has historical diagnosis of severe asthma.',
        'requested_amendment' => 'Clarify diagnosis was mild episodic bronchitis, not chronic asthma.'
    ];
    $amendment1Result = $amendmentService->storeStatutory($intakeData, $adminUserId);
    report($amendment1Result['success'] === true, "Recorded first statutory amendment request successfully");
    $amendment1 = $amendment1Result['data'];
    $amendId1 = (int) $amendment1['id'];
    $createdAmendmentIds[] = $amendId1;

    report(!empty($amendment1['amendment_number']), "Auto-generated amendment number: {$amendment1['amendment_number']}");
    report($amendment1['initial_deadline'] === '2026-10-31', "Initial deadline exactly +60 calendar days (2026-10-31)");
    report($amendment1['status'] === 'pending_review', "Initial status is 'pending_review'");

    // Check pipeline calculation
    $pipeline = $amendmentService->pipelineList(['search' => $amendment1['amendment_number']]);
    report(count($pipeline) === 1, "Pipeline finds amendment by amendment number");
    $item = $pipeline[0];
    report(isset($item['days_remaining']), "Calculated days_remaining attribute exists");
    report(isset($item['is_impending']), "Impending flag computed");
    report(isset($item['is_overdue']), "Overdue flag computed");

    // -------------------------------------------------------------
    // 3. Single 30-Day Extension Enforcement (§ 164.526(b)(2)(ii))
    // -------------------------------------------------------------
    echo "\n3. Testing Single 30-Day Extension Enforcement (§ 164.526(b)(2)(ii))...\n";

    // Grant first extension
    $extResult = $amendmentService->grantExtension($amendId1, [
        'extension_reason' => 'provider_consultation_required',
        'extension_rationale' => 'Treating pulmonologist is currently on medical leave until next week.'
    ], $adminUserId);
    report($extResult['success'] === true, "First 30-day extension granted successfully");

    $refreshed1 = $amendmentService->get($amendId1);
    report((int)$refreshed1['is_extended'] === 1, "is_extended asserted to 1");
    report($refreshed1['extended_deadline'] === '2026-11-30', "Extended deadline exactly +30 days (2026-11-30)");
    report($refreshed1['status'] === 'extension_granted', "Status transitioned to 'extension_granted'");
    report(!empty($refreshed1['extension_notice_date']), "Recorded extension notice date");

    // Attempt second extension (MUST FAIL)
    $secondExtFailed = false;
    try {
        $amendmentService->grantExtension($amendId1, [
            'extension_reason' => 'historical_archive_retrieval',
            'extension_rationale' => 'Attempting a prohibited second extension.'
        ], $adminUserId);
    } catch (\Exception $e) {
        $secondExtFailed = true;
        report(strpos($e->getMessage(), 'only ONE 30-day extension') !== false, "Second extension rejected with statutory message: " . $e->getMessage());
    }
    report($secondExtFailed, "Programmatic block of second extension enforced");

    // -------------------------------------------------------------
    // 4. Formal Written Extension Notice Letter (§ 164.526(b)(2)(ii))
    // -------------------------------------------------------------
    echo "\n4. Testing Statutory Written Extension Notice Generator (§ 164.526(b)(2)(ii))...\n";
    $extNoticeRes = $amendmentService->getExtensionNoticeData($amendId1);
    report($extNoticeRes['success'] === true, "Generated extension notice data successfully");
    $extNotice = $extNoticeRes['data'];
    report(!empty($extNotice['facility_name']), "Letter includes facility name: {$extNotice['facility_name']}");
    report($extNotice['amendment_number'] === $amendment1['amendment_number'], "Notice cites correct amendment number");
    report($extNotice['patient_name'] === 'Eleanor M Amendment', "Notice includes full patient legal name");
    report($extNotice['extended_deadline'] === '2026-11-30', "Notice specifies definitive extended deadline");
    report(!empty($extNotice['privacy_officer_contact']), "Notice includes Privacy Officer contact");

    // -------------------------------------------------------------
    // 5. Mandatory 4 Statutory Denial Grounds Validation (§ 164.526(a)(2))
    // -------------------------------------------------------------
    echo "\n5. Testing 4 Statutory Denial Grounds Validation (§ 164.526(a)(2))...\n";

    // Attempt invalid denial ground (MUST FAIL)
    $invalidGroundFailed = false;
    try {
        $amendmentService->denyAmendment($amendId1, [
            'denial_statutory_ground' => 'arbitrary_clinical_discretion',
            'denial_rationale' => 'Denial under unauthorized ground.'
        ], $adminUserId);
    } catch (\Exception $e) {
        $invalidGroundFailed = true;
        report(strpos($e->getMessage(), 'Invalid statutory ground') !== false, "Invalid denial ground rejected: " . $e->getMessage());
    }
    report($invalidGroundFailed, "Programmatic block of non-statutory denial ground enforced");

    // Deny under valid ground: accurate_and_complete
    $denyResult = $amendmentService->denyAmendment($amendId1, [
        'denial_statutory_ground' => 'accurate_and_complete',
        'denial_rationale' => 'Original progress note accurately documented peak flow spirometry reading consistent with moderate persistent asthma.'
    ], $adminUserId);
    report($denyResult['success'] === true, "Statutory denial successfully recorded");

    $deniedRecord = $amendmentService->get($amendId1);
    report($deniedRecord['status'] === 'denied', "Status transitioned to 'denied'");
    report($deniedRecord['denial_statutory_ground'] === 'accurate_and_complete', "Statutory ground recorded as 'accurate_and_complete'");
    report(!empty($deniedRecord['denial_notice_date']), "Recorded denial notice timestamp");

    // -------------------------------------------------------------
    // 6. Statutory Written Denial Notice Letter (§ 164.526(d)(1))
    // -------------------------------------------------------------
    echo "\n6. Testing Formal Written Denial Notice Letter (§ 164.526(d)(1))...\n";
    $denialNoticeRes = $amendmentService->getDenialNoticeData($amendId1);
    report($denialNoticeRes['success'] === true, "Generated denial notice data successfully");
    $denialNotice = $denialNoticeRes['data'];
    report($denialNotice['statutory_ground_citation'] === '45 CFR § 164.526(a)(2)(iv)', "Cites correct federal regulation (§ 164.526(a)(2)(iv))");
    report(!empty($denialNotice['denial_rationale']), "Contains plain-language denial rationale narrative");
    report(!empty($denialNotice['facility_name']), "Contains hospital header");

    // -------------------------------------------------------------
    // 7. Statement of Disagreement Intake & Permanent EHR Linkage (§ 164.526(d)(2))
    // -------------------------------------------------------------
    echo "\n7. Testing Statement of Disagreement Intake & Linking (§ 164.526(d)(2))...\n";
    $disagreeResult = $amendmentService->fileStatementOfDisagreement($amendId1, [
        'statement_of_disagreement' => 'I disagree with Dr. Smith\'s assessment because my primary pulmonologist Dr. Lee diagnosed acute bronchitis following wildfire smoke exposure, not asthma.',
        'future_disclosure_dissemination_requested' => 1
    ], $adminUserId);
    report($disagreeResult['success'] === true, "Statement of Disagreement successfully filed and permanently linked");

    $disagreeRecord = $amendmentService->get($amendId1);
    report(!empty($disagreeRecord['statement_of_disagreement']), "Statement of disagreement stored on record");
    report((int)$disagreeRecord['future_disclosure_dissemination_requested'] === 1, "Future disclosure dissemination flag asserted to 1");

    // -------------------------------------------------------------
    // 8. Covered Entity Statement of Rebuttal (§ 164.526(d)(3))
    // -------------------------------------------------------------
    echo "\n8. Testing Statement of Rebuttal Intake (§ 164.526(d)(3))...\n";
    $rebuttalResult = $amendmentService->fileStatementOfRebuttal($amendId1, [
        'statement_of_rebuttal' => 'The clinical team has reviewed the external records from Dr. Lee. While acute smoke inhalation was a contributing factor, reversible airway obstruction was confirmed on spirometry.'
    ], $adminUserId);
    report($rebuttalResult['success'] === true, "Statement of Rebuttal successfully filed and linked");

    $rebuttalRecord = $amendmentService->get($amendId1);
    report(!empty($rebuttalRecord['statement_of_rebuttal']), "Statement of rebuttal stored on record");

    // -------------------------------------------------------------
    // 9. DRS Bundling Engine Integration (§ 164.526(d)(4))
    // -------------------------------------------------------------
    echo "\n9. Testing DRS Bundling Engine Integration (§ 164.526(d)(4))...\n";
    $drsRes = $drsService->compileDrsBundle($patientId);
    report($drsRes['success'] === true, "DRS bundle compilation succeeded");
    $drsBundle = $drsRes['data'] ?? [];
    $clinicalRecords = $drsBundle['clinical_records'] ?? [];
    report(isset($clinicalRecords['amendments_and_disagreements']), "DRS bundle contains 'amendments_and_disagreements' section");

    $linkedAmendments = $clinicalRecords['amendments_and_disagreements'] ?? [];
    report(count($linkedAmendments) > 0, "Disputed amendment found in DRS export bundle");
    $bundleItem = $linkedAmendments[0] ?? [];
    report(!empty($bundleItem['statement_of_disagreement']), "DRS bundle automatically includes Statement of Disagreement");
    report(!empty($bundleItem['statement_of_rebuttal']), "DRS bundle automatically includes Statement of Rebuttal");

    // -------------------------------------------------------------
    // 10. Statutory Amendment Acceptance (§ 164.526(c))
    // -------------------------------------------------------------
    echo "\n10. Testing Statutory Amendment Acceptance (§ 164.526(c))...\n";
    $intakeData2 = [
        'patient_id' => $patientId,
        'request_date' => date('Y-m-d'),
        'requester_type' => 'patient',
        'target_record_type' => 'allergy',
        'target_record_label' => 'Penicillin Allergy',
        'disputed_text' => 'Severe anaphylaxis to penicillin.',
        'requested_amendment' => 'Correct to mild skin rash / hives experienced in childhood (1998).'
    ];
    $amendment2Result = $amendmentService->storeStatutory($intakeData2, $adminUserId);
    report($amendment2Result['success'] === true, "Recorded second statutory amendment request successfully");
    $amendment2 = $amendment2Result['data'];
    $amendId2 = (int) $amendment2['id'];
    $createdAmendmentIds[] = $amendId2;

    $acceptResult = $amendmentService->acceptAmendment($amendId2, [
        'acceptance_notes' => 'Verified with patient skin prick test completed on 2026-09-10. Record amended.'
    ], $adminUserId);
    report($acceptResult['success'] === true, "Amendment accepted successfully");

    $acceptedRecord = $amendmentService->get($amendId2);
    report($acceptedRecord['status'] === 'accepted', "Status transitioned to 'accepted'");
    report(!empty($acceptedRecord['accepted_linked_at']), "Recorded accepted_linked_at timestamp");
    report(!empty($acceptedRecord['acceptance_notes']), "Stored acceptance notes");

    // -------------------------------------------------------------
    // 11. Regulatory RFC 4180 CSV Export
    // -------------------------------------------------------------
    echo "\n11. Testing Regulatory RFC 4180 CSV Registry Export...\n";
    $csv = $amendmentService->exportRegistryCsv();
    report(strpos($csv, 'HIPAA 45 CFR § 164.526') !== false, "CSV contains statutory compliance header citing § 164.526");
    report(strpos($csv, 'Amendment Number') !== false, "CSV contains standard column headers");
    report(strpos($csv, $amendment1['amendment_number']) !== false, "CSV contains amendment 1 record");
    report(strpos($csv, 'accurate_and_complete') !== false, "CSV contains denial statutory ground");
    report(strpos($csv, 'YES') !== false, "CSV reflects disagreement dissemination requested");

    // -------------------------------------------------------------
    // 12. Tamper-Evident HMAC-SHA-256 Audit Trail & Hash Integrity
    // -------------------------------------------------------------
    echo "\n12. Testing HMAC-SHA-256 Chained Audit Trail & Cryptographic Chain...\n";
    $stmtAudit = $pdo->prepare("SELECT * FROM hipaa_audit_logs WHERE event_category = :cat ORDER BY id DESC LIMIT 25");
    $stmtAudit->execute(['cat' => 'PHI_AMENDMENT']);
    $auditEntries = $stmtAudit->fetchAll(PDO::FETCH_ASSOC);
    report(count($auditEntries) > 0, "Audit logs found under event_category 'PHI_AMENDMENT'");

    $auditActions = array_column($auditEntries, 'action');
    report(in_array(AuditLogger::ACTION_AMENDMENT_REQUESTED, $auditActions, true), "Logged action " . AuditLogger::ACTION_AMENDMENT_REQUESTED);
    report(in_array(AuditLogger::ACTION_AMENDMENT_EXTENSION_GRANTED, $auditActions, true), "Logged action " . AuditLogger::ACTION_AMENDMENT_EXTENSION_GRANTED);
    report(in_array(AuditLogger::ACTION_AMENDMENT_DENIED, $auditActions, true), "Logged action " . AuditLogger::ACTION_AMENDMENT_DENIED);
    report(in_array(AuditLogger::ACTION_AMENDMENT_DISAGREEMENT_FILED, $auditActions, true), "Logged action " . AuditLogger::ACTION_AMENDMENT_DISAGREEMENT_FILED);
    report(in_array(AuditLogger::ACTION_AMENDMENT_REBUTTAL_FILED, $auditActions, true), "Logged action " . AuditLogger::ACTION_AMENDMENT_REBUTTAL_FILED);
    report(in_array(AuditLogger::ACTION_AMENDMENT_ACCEPTED, $auditActions, true), "Logged action " . AuditLogger::ACTION_AMENDMENT_ACCEPTED);

    // Verify entire HMAC-SHA-256 hash chain
    $integrity = AuditLogger::verifyIntegrity();
    report($integrity['valid'] === true, "Complete HIPAA audit sequential HMAC-SHA-256 hash chain is VALID (0 tampering detected)");

} catch (\Throwable $e) {
    $failed++;
    echo "\n[EXCEPTION] Fatal error during test execution:\n";
    echo $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
} finally {
    // Cleanup fixture amendments first (to avoid foreign key constraint on patient delete)
    if (!empty($createdAmendmentIds)) {
        $inClause = implode(',', array_map('intval', $createdAmendmentIds));
        $pdo->exec("DELETE FROM amendments WHERE id IN ({$inClause})");
    }
    // Cleanup fixture patient and related records
    if ($patientId > 0) {
        $pdo->exec("DELETE FROM amendments WHERE patient_id = {$patientId}");
        $pdo->exec("DELETE FROM npp_consent_log WHERE patient_id = {$patientId}");
        $pdo->exec("DELETE FROM hipaa_confidential_communications_log WHERE patient_id = {$patientId}");
        $pdo->exec("DELETE FROM hipaa_drs_access_requests WHERE patient_id = {$patientId}");
        $pdo->exec("DELETE FROM patient_contacts WHERE patient_id = {$patientId}");
        $pdo->exec("DELETE FROM patient_employers WHERE patient_id = {$patientId}");
        $pdo->exec("DELETE FROM patient_guardians WHERE patient_id = {$patientId}");
        $pdo->exec("DELETE FROM patient_emergency_contacts WHERE patient_id = {$patientId}");
        $pdo->exec("DELETE FROM patient_insurances WHERE patient_id = {$patientId}");
        $pdo->exec("DELETE FROM patients WHERE id = {$patientId}");
        if (!empty($fixturePatient['username'])) {
            $pdo->exec("DELETE FROM users WHERE username = '{$fixturePatient['username']}'");
        }
    }
}

echo "\n======================================================================\n";
echo "  TEST SUMMARY: {$passed} Passed, {$failed} Failed\n";
echo "======================================================================\n";

exit($failed > 0 ? 1 : 0);
