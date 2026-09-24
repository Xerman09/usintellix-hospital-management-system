<?php
/**
 * Automated Verification: HITECH Mandatory Out-of-Pocket Insurance Restriction
 * Statutory Citations: 45 CFR § 164.522(a)(1)(vi) (HITECH Act § 13405(a))
 */

declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Core\AuditLogger;
use App\Modules\Encounters\Services\EncounterService;

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
echo "  HITECH OUT-OF-POCKET INSURANCE RESTRICTION (§ 164.522(a)) TEST SUITE\n";
echo "======================================================================\n\n";

$pdo = Database::connection();
$service = new EncounterService();
$adminUserId = 1;

// 1. Schema & Migration 204 Verification
echo "1. Testing Database Schema & Columns (Migration 204)...\n";
$stmt = $pdo->query("SHOW COLUMNS FROM encounters");
$encounterCols = $stmt->fetchAll(PDO::FETCH_COLUMN);

$expectedEncounterCols = [
    'hitech_restriction_requested',
    'hitech_restriction_date',
    'hitech_restriction_operator_id',
    'hitech_paid_in_full',
    'hitech_payment_reference',
    'hitech_restriction_notes',
    'claim_suppressed'
];

foreach ($expectedEncounterCols as $col) {
    report(in_array($col, $encounterCols, true), "encounters column '{$col}' exists");
}

$stmt = $pdo->query("SHOW TABLES LIKE 'hipaa_hitech_restrictions'");
report($stmt->rowCount() > 0, "Table 'hipaa_hitech_restrictions' exists in database");

$registryCols = $pdo->query("SHOW COLUMNS FROM hipaa_hitech_restrictions")->fetchAll(PDO::FETCH_COLUMN);
$expectedRegistryCols = [
    'id', 'encounter_id', 'patient_id', 'restriction_requested',
    'paid_in_full', 'payment_reference', 'restricted_health_plan',
    'restriction_notes', 'claim_suppressed', 'requested_at', 'operator_id',
    'created_at', 'updated_at'
];

foreach ($expectedRegistryCols as $col) {
    report(in_array($col, $registryCols, true), "hipaa_hitech_restrictions column '{$col}' exists");
}

// 2. Setup Test Patient & Visit Category
echo "\n2. Resolving Test Patient & Category Fixtures...\n";
$patientStmt = $pdo->query("SELECT id FROM patients WHERE deleted_at IS NULL LIMIT 1");
$patientId = (int) $patientStmt->fetchColumn();
report($patientId > 0, "Resolved test patient ID: {$patientId}");

$categoryStmt = $pdo->query("SELECT id FROM visit_categories LIMIT 1");
$visitCatId = (int) $categoryStmt->fetchColumn();
report($visitCatId > 0, "Resolved test visit category ID: {$visitCatId}");

// 3. Creating Unrestricted Encounter
echo "\n3. Testing Creation of Standard (Unrestricted) Encounter...\n";
$standardResult = $service->store($patientId, $adminUserId, [
    'visit_category_id' => $visitCatId,
    'date_of_service' => date('Y-m-d H:i:s'),
    'reason_for_visit' => 'Standard checkup with insurance billing intended'
]);

report($standardResult['success'], "Standard encounter created successfully", $standardResult['message']);
$stdEncounterId = (int) ($standardResult['data']['id'] ?? 0);
report($stdEncounterId > 0, "Standard encounter ID assigned: {$stdEncounterId}");

$stdRecord = $service->find($stdEncounterId);
report((int)$stdRecord['hitech_restriction_requested'] === 0, "Standard encounter hitech_restriction_requested is 0");
report((int)$stdRecord['claim_suppressed'] === 0, "Standard encounter claim_suppressed is 0");

// Verify X12 transition to 'sent' is permitted on unrestricted encounter
$stdX12Result = $service->setX12Status($stdEncounterId, 'sent', $adminUserId);
report($stdX12Result['success'], "Unrestricted encounter allows setting X12 status to 'sent'");

// 4. Creating Restricted Encounter (Mandatory HITECH § 164.522(a)(1)(vi))
echo "\n4. Testing Creation of HITECH-Restricted Encounter...\n";
$hitechResult = $service->store($patientId, $adminUserId, [
    'visit_category_id' => $visitCatId,
    'date_of_service' => date('Y-m-d H:i:s'),
    'reason_for_visit' => 'Sensitive consultation - self paid in full',
    'hitech_restriction_requested' => 1,
    'hitech_paid_in_full' => 1,
    'hitech_payment_reference' => 'CASH-TEST-9941',
    'hitech_restriction_notes' => 'Patient paid full out-of-pocket; mandatory insurance disclosure restriction requested'
]);

report($hitechResult['success'], "HITECH-restricted encounter created successfully", $hitechResult['message']);
$hitechEncounterId = (int) ($hitechResult['data']['id'] ?? 0);
report($hitechEncounterId > 0, "HITECH encounter ID assigned: {$hitechEncounterId}");

$hitechRecord = $service->find($hitechEncounterId);
report((int)$hitechRecord['hitech_restriction_requested'] === 1, "HITECH encounter hitech_restriction_requested is 1");
report((int)$hitechRecord['claim_suppressed'] === 1, "HITECH encounter claim_suppressed is automatically 1 (Mandatory Claim Suppression)");
report(!empty($hitechRecord['hitech_restriction_date']), "HITECH encounter hitech_restriction_date is set");
report((int)$hitechRecord['hitech_paid_in_full'] === 1, "HITECH encounter hitech_paid_in_full is 1");
report($hitechRecord['hitech_payment_reference'] === 'CASH-TEST-9941', "Payment reference correctly saved");

// Verify sync into hipaa_hitech_restrictions registry
$regStmt = $pdo->prepare("SELECT * FROM hipaa_hitech_restrictions WHERE encounter_id = ?");
$regStmt->execute([$hitechEncounterId]);
$regRow = $regStmt->fetch(PDO::FETCH_ASSOC);

report(!empty($regRow), "Encounter automatically synchronized into hipaa_hitech_restrictions registry");
report((int)$regRow['restriction_requested'] === 1, "Registry restriction_requested is 1");
report((int)$regRow['claim_suppressed'] === 1, "Registry claim_suppressed is 1");
report($regRow['payment_reference'] === 'CASH-TEST-9941', "Registry payment reference matches");

// 5. Strict Server-Side EDI Dispatch Block Verification
echo "\n5. Testing Strict EDI X12 Transmission Block on Restricted Encounter...\n";
$blockSent = $service->setX12Status($hitechEncounterId, 'sent', $adminUserId);
report(!$blockSent['success'], "Setting X12 status to 'sent' is STRICTLY BLOCKED for restricted encounter");
report(strpos($blockSent['message'], '164.522') !== false, "Block message explicitly cites HITECH § 164.522(a)(1)(vi)");

$blockAccepted = $service->setX12Status($hitechEncounterId, 'accepted', $adminUserId);
report(!$blockAccepted['success'], "Setting X12 status to 'accepted' is STRICTLY BLOCKED for restricted encounter");

// Verify Audit Log records the blocked transmission attempt
$auditBlockedStmt = $pdo->prepare(
    "SELECT * FROM hipaa_audit_logs 
     WHERE event_category = ? AND action = ? 
     ORDER BY id DESC LIMIT 1"
);
$auditBlockedStmt->execute([AuditLogger::CATEGORY_HITECH, AuditLogger::ACTION_HITECH_CLAIM_BLOCKED]);
$auditBlocked = $auditBlockedStmt->fetch(PDO::FETCH_ASSOC);

report(!empty($auditBlocked), "Tamper-evident audit log created for blocked EDI dispatch (ACTION_HITECH_CLAIM_BLOCKED)");
report((int)$auditBlocked['patient_id'] === $patientId, "Audit log correctly references patient ID {$patientId}");

// 6. Direct Endpoint Testing (getHitechRestriction & setHitechRestriction)
echo "\n6. Testing Direct HITECH Endpoint Methods...\n";
$details = $service->getHitechRestriction($hitechEncounterId);
report(!empty($details), "getHitechRestriction() returned valid record");
report($details['restriction_requested'] === true, "getHitechRestriction() returns restriction_requested as true");
report($details['claim_suppressed'] === true, "getHitechRestriction() returns claim_suppressed as true");

// Toggle off restriction
$toggleOff = $service->setHitechRestriction($hitechEncounterId, [
    'hitech_restriction_requested' => 0
], $adminUserId);

report($toggleOff['success'], "setHitechRestriction() toggled off restriction successfully");
$updatedRec = $service->find($hitechEncounterId);
report((int)$updatedRec['hitech_restriction_requested'] === 0, "Encounter hitech_restriction_requested updated to 0");
report((int)$updatedRec['claim_suppressed'] === 0, "Encounter claim_suppressed updated to 0");

// Verify audit log for restriction removal
$auditRemovedStmt = $pdo->prepare(
    "SELECT * FROM hipaa_audit_logs 
     WHERE event_category = ? AND action = ? 
     ORDER BY id DESC LIMIT 1"
);
$auditRemovedStmt->execute([AuditLogger::CATEGORY_HITECH, AuditLogger::ACTION_HITECH_RESTRICTION_REMOVED]);
$auditRemoved = $auditRemovedStmt->fetch(PDO::FETCH_ASSOC);
report(!empty($auditRemoved), "Audit log recorded ACTION_HITECH_RESTRICTION_REMOVED");

// Toggle restriction back ON
$toggleOn = $service->setHitechRestriction($hitechEncounterId, [
    'hitech_restriction_requested' => 1,
    'hitech_paid_in_full' => 1,
    'hitech_payment_reference' => 'CARD-VISA-8812',
    'hitech_restriction_notes' => 'Patient re-requested out-of-pocket health plan restriction'
], $adminUserId);

report($toggleOn['success'], "setHitechRestriction() toggled restriction back ON");
$reRestricted = $service->find($hitechEncounterId);
report((int)$reRestricted['hitech_restriction_requested'] === 1, "Encounter hitech_restriction_requested is 1 again");
report((int)$reRestricted['claim_suppressed'] === 1, "Encounter claim_suppressed is 1 again");

// 7. Billing Manager Worklist Filtering & Payload Verification
echo "\n7. Testing Billing Manager Criteria Filtering (hitech_restriction)...\n";
$worklistRestricted = $service->listBillableGrouped([
    ['type' => 'hitech_restriction', 'value' => 'restricted']
], null);

$allEncountersRestricted = [];
foreach ($worklistRestricted['patients'] as $pat) {
    foreach ($pat['encounters'] as $enc) {
        $allEncountersRestricted[] = $enc;
    }
}

$foundOurEncounter = false;
$allHaveFlag = true;
foreach ($allEncountersRestricted as $enc) {
    if ($enc['encounter_id'] === $hitechEncounterId) {
        $foundOurEncounter = true;
    }
    if (!$enc['hitech_restriction_requested'] || !$enc['claim_suppressed']) {
        $allHaveFlag = false;
    }
}

report($foundOurEncounter, "listBillableGrouped('restricted') found our HITECH encounter");
report($allHaveFlag, "All encounters in 'restricted' filter have hitech_restriction_requested=true and claim_suppressed=true");

$worklistUnrestricted = $service->listBillableGrouped([
    ['type' => 'hitech_restriction', 'value' => 'unrestricted']
], null);

$foundInUnrestricted = false;
foreach ($worklistUnrestricted['patients'] as $pat) {
    foreach ($pat['encounters'] as $enc) {
        if ($enc['encounter_id'] === $hitechEncounterId) {
            $foundInUnrestricted = true;
        }
    }
}
report(!$foundInUnrestricted, "Restricted encounter correctly excluded from listBillableGrouped('unrestricted')");

// 8. Registry Listing & CSV Export
echo "\n8. Testing Registry Listing & Regulatory CSV Export...\n";
$regList = $service->listHitechRestrictions();
report(!empty($regList['restrictions']), "listHitechRestrictions() returned registry items");
report(isset($regList['stats']['total_restrictions']), "listHitechRestrictions() returned total_restrictions metric");
report(isset($regList['stats']['suppressed_claims_count']), "listHitechRestrictions() returned suppressed_claims_count metric");

$csv = $service->exportHitechRestrictionsCsv();
report(!empty($csv), "exportHitechRestrictionsCsv() produced CSV output");
report(strpos($csv, '164.522(a)(1)(vi)') !== false, "CSV contains statutory header citing 45 CFR § 164.522(a)(1)(vi)");
report(strpos($csv, 'Mandatory Out-of-Pocket Insurance Disclosure Restriction Registry') !== false, "CSV contains registry title");
report(strpos($csv, 'Claim Suppressed') !== false, "CSV contains Claim Suppressed column header");
report(strpos($csv, 'CASH-TEST-9941') !== false || strpos($csv, 'CARD-VISA-8812') !== false, "CSV contains test payment reference");

// 9. Tamper-Evident HMAC-SHA-256 Audit Chain Verification
echo "\n9. Verifying Sequential Cryptographic Audit Hash Chain Integrity...\n";
$auditStmt = $pdo->query("SELECT * FROM hipaa_audit_logs WHERE event_category = 'HITECH_RESTRICTION' ORDER BY id DESC LIMIT 10");
$auditRows = $auditStmt->fetchAll(PDO::FETCH_ASSOC);
report(count($auditRows) >= 4, "AuditLogger committed HITECH events to hipaa_audit_logs", "Found " . count($auditRows) . " HITECH events");

$actionsFound = array_column($auditRows, 'action');
report(in_array('HITECH_RESTRICTION_APPLIED', $actionsFound, true), "Audit log recorded HITECH_RESTRICTION_APPLIED");
report(in_array('HITECH_RESTRICTION_REMOVED', $actionsFound, true), "Audit log recorded HITECH_RESTRICTION_REMOVED");
report(in_array('HITECH_CLAIM_DISPATCH_BLOCKED', $actionsFound, true), "Audit log recorded HITECH_CLAIM_DISPATCH_BLOCKED");
report(in_array('EXPORT_HITECH_REGISTRY_CSV', $actionsFound, true), "Audit log recorded EXPORT_HITECH_REGISTRY_CSV");

$chainRes = AuditLogger::verifyIntegrity();
report($chainRes['valid'], "Cryptographic hash chain is intact and untampered: " . $chainRes['message']);

// Cleanup test encounters
$service->remove($stdEncounterId, $adminUserId);
$service->remove($hitechEncounterId, $adminUserId);

echo "\n======================================================================\n";
echo "  TEST SUMMARY: {$passed} PASSED, {$failed} FAILED\n";
echo "======================================================================\n";

if ($failed > 0) {
    exit(1);
}
