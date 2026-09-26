<?php
/**
 * Automated Verification: Safe Harbor 18-Identifier PHI De-Identification Tool
 * Statutory Citations: 45 CFR § 164.514(a)–(c)
 */

declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Core\AuditLogger;
use App\Modules\Deidentification\Services\DeidentificationService;
use App\Modules\Deidentification\Models\DeidentifiedExport;
use App\Modules\Deidentification\Models\ReidentificationVault;
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
        if ($detail) {
            echo "         Detail: {$detail}\n";
        }
    }
}

echo "======================================================================\n";
echo "  HIPAA SAFE HARBOR 18-IDENTIFIER DE-IDENTIFICATION (§ 164.514) TEST SUITE\n";
echo "======================================================================\n\n";

$pdo = Database::getInstance()->getConnection();
$service = new DeidentificationService($pdo);
$patientService = new PatientService();

$createdUserIds = [];
$createdPatientIds = [];
$createdExportIds = [];

try {
    // ------------------------------------------------------------------
    // 1. Database Schema & Migration 210 Verification
    // ------------------------------------------------------------------
    echo "1. Testing Database Schema & Columns (Migration 210)...\n";

    // 1a. hipaa_deidentified_exports table
    $stmtTables1 = $pdo->query("SHOW TABLES LIKE 'hipaa_deidentified_exports'");
    report($stmtTables1->rowCount() > 0, "Table 'hipaa_deidentified_exports' exists in database");

    $stmtCols1 = $pdo->query("SHOW COLUMNS FROM `hipaa_deidentified_exports`");
    $exportCols = $stmtCols1->fetchAll(PDO::FETCH_COLUMN);

    $expectedExportCols = [
        'id', 'export_code', 'dataset_type', 'purpose_of_use', 'purpose_description',
        'recipient_institution', 'recipient_investigator', 'data_format', 'records_count',
        'identifiers_removed_count', 'sha256_dataset_checksum', 'is_safe_harbor_certified',
        'attestation_officer_id', 'attestation_officer_name', 'attestation_officer_role',
        'attested_at', 'reidentification_enabled', 'created_by', 'created_at', 'updated_at'
    ];
    foreach ($expectedExportCols as $col) {
        report(in_array($col, $exportCols, true), "Column '{$col}' exists in hipaa_deidentified_exports");
    }

    // 1b. hipaa_reidentification_vault table
    $stmtTables2 = $pdo->query("SHOW TABLES LIKE 'hipaa_reidentification_vault'");
    report($stmtTables2->rowCount() > 0, "Table 'hipaa_reidentification_vault' exists in database");

    $stmtCols2 = $pdo->query("SHOW COLUMNS FROM `hipaa_reidentification_vault`");
    $vaultCols = $stmtCols2->fetchAll(PDO::FETCH_COLUMN);

    $expectedVaultCols = [
        'id', 'export_id', 'patient_id', 'subject_pseudonym', 'key_hash', 'created_at'
    ];
    foreach ($expectedVaultCols as $col) {
        report(in_array($col, $vaultCols, true), "Column '{$col}' exists in hipaa_reidentification_vault");
    }

    // ------------------------------------------------------------------
    // 2. Testing 18-Identifier Sanitizer Rules (§ 164.514(b)(2))
    // ------------------------------------------------------------------
    echo "\n2. Testing 18-Identifier Sanitizer Rules Engine...\n";

    // 2a. Pseudonym Generation Rule (A & R)
    $pseudonym1 = $service->generatePseudonym();
    $pseudonym2 = $service->generatePseudonym();
    report(str_starts_with($pseudonym1, 'SUBJ-'), "Pseudonym starts with prefix 'SUBJ-' ({$pseudonym1})");
    report(strlen($pseudonym1) === 13, "Pseudonym has correct length (13 chars)");
    report($pseudonym1 !== $pseudonym2, "Pseudonyms are uniquely generated and non-derivable");

    // 2b. Census Safe 3-Digit ZIP Rule (B)
    // Normal population > 20,000 ZIP:
    $normalZip = $service->sanitizeZip('90210');
    report($normalZip === '902XX', "Normal 5-digit ZIP '90210' retains 3 digits ('902XX')");

    $formattedZip = $service->sanitizeZip('10001-1234');
    report($formattedZip === '100XX', "9-digit ZIP '10001-1234' strips extension and retains 3 digits ('100XX')");

    // All 17 restricted Census prefixes <= 20,000 must become '000XX':
    $all17RestrictedPass = true;
    foreach (DeidentificationService::RESTRICTED_ZIP3 as $restrictedPrefix) {
        $res = $service->sanitizeZip($restrictedPrefix . '45');
        if ($res !== '000XX') {
            $all17RestrictedPass = false;
            echo "         Failed prefix: {$restrictedPrefix} returned {$res}\n";
            break;
        }
    }
    report($all17RestrictedPass, "All 17 US Census restricted 3-digit ZIP prefixes are converted to '000XX'");

    // Empty/short ZIP
    $emptyZip = $service->sanitizeZip(null);
    report($emptyZip === '000XX', "Empty/null ZIP sanitized to '000XX'");

    $shortZip = $service->sanitizeZip('12');
    report($shortZip === '000XX', "Short/invalid ZIP sanitized to '000XX'");

    // 2c. Dates and Age Aggregation Rule (C)
    // Non-elderly DOB:
    $ageDemog = $service->sanitizeAgeAndDob('1990-06-15');
    report($ageDemog['birth_year'] === '1990', "Patient born 1990 has birth_year '1990'");
    report($ageDemog['is_over_89'] === false, "Patient born 1990 is not over 89");
    $expectedAge = (int)date('Y') - 1990;
    report((int)$ageDemog['age_category'] === $expectedAge, "Patient born 1990 has expected numerical age ({$expectedAge})");

    // Elderly DOB (>89 years old):
    $elderlyDob = '1920-03-10';
    $elderlyDemog = $service->sanitizeAgeAndDob($elderlyDob);
    report($elderlyDemog['age_category'] === '90 or older', "Patient over 89 has age aggregated to '90 or older'");
    $cutoff = (int)date('Y') - 90;
    report($elderlyDemog['birth_year'] === "{$cutoff} or earlier", "Patient over 89 has birth_year set to '{$cutoff} or earlier'");
    report($elderlyDemog['is_over_89'] === true, "is_over_89 flag is correctly set to true");

    // Null/invalid DOB
    $nullDob = $service->sanitizeAgeAndDob(null);
    report($nullDob['birth_year'] === 'UNKNOWN' && $nullDob['age_category'] === 'UNKNOWN', "Null DOB yields 'UNKNOWN'");

    // Date to Year Only
    $encounterYear = $service->sanitizeDateToYear('2026-09-26 14:30:00');
    report($encounterYear === '2026', "Full datetime '2026-09-26 14:30:00' truncated strictly to year '2026'");
    report($service->sanitizeDateToYear(null) === null, "Null date returns null");

    // 2d. Clinical SOAP Free-Text Regex Scrubber
    $rawNarrative = "Patient Johnathan Doe (MRN: 987654) presented on 2026-04-12. Contact phone is 555-123-4567, email john.doe@hospital.test, SSN 123-45-6789. Resident in Beverly Hills 90210. Discharged with prescription on May 15, 2026.";
    $scrubbedNarrative = $service->scrubFreeText($rawNarrative, 'Johnathan', 'Doe');

    report(!str_contains($scrubbedNarrative, 'Johnathan') && !str_contains($scrubbedNarrative, 'Doe'), "Free-text scrubber stripped patient first and last names");
    report(!str_contains($scrubbedNarrative, '555-123-4567'), "Free-text scrubber stripped phone number");
    report(!str_contains($scrubbedNarrative, 'john.doe@hospital.test'), "Free-text scrubber stripped email address");
    report(!str_contains($scrubbedNarrative, '123-45-6789'), "Free-text scrubber stripped SSN");
    report(!str_contains($scrubbedNarrative, '2026-04-12') && !str_contains($scrubbedNarrative, 'May 15, 2026'), "Free-text scrubber stripped calendar dates");
    report(!str_contains($scrubbedNarrative, '90210'), "Free-text scrubber stripped 5-digit ZIP code");
    report(!str_contains($scrubbedNarrative, '987654'), "Free-text scrubber stripped MRN identifier");
    report(str_contains($scrubbedNarrative, '[REDACTED_NAME]') && str_contains($scrubbedNarrative, '[REDACTED_PHONE]'), "Scrubber injected standardized redaction tokens");

    // ------------------------------------------------------------------
    // 3. Testing Dataset Generation & Isolated Re-Identification Vault
    // ------------------------------------------------------------------
    echo "\n3. Testing Dataset Generation & Vault Decoupling...\n";

    // Create 2 test patients (one normal, one with restricted census ZIP and age > 89)
    $unique1 = time() . '_' . rand(100, 999);
    $res1 = $patientService->register([
        'username' => 'test_deid_p1_' . $unique1,
        'password' => 'SecurePass123!#',
        'first_name' => 'Alice',
        'last_name' => 'Researcher',
        'sex' => 'female',
        'birthdate' => '1988-11-20',
        'civil_status' => 'Single',
        'blood_type' => 'O+',
        'height' => '168',
        'weight' => '62',
        'address_line' => '123 Test St',
        'city' => 'San Francisco',
        'province' => 'CA',
        'zip_code' => '94107',
        'mobile_phone' => '415-555-0199',
        'contact_email' => 'alice.test@example.com',
        'ssn' => '999-11-2222'
    ], 1);

    if (!$res1['success']) {
        throw new \RuntimeException('Failed to register test patient 1: ' . json_encode($res1));
    }
    $pId1 = (int) $res1['data']['patient_id'];
    $mrn1 = $res1['data']['patient_no'];
    $createdPatientIds[] = $pId1;
    $createdUserIds[] = (int) $res1['data']['user_id'];

    $unique2 = (time() + 1) . '_' . rand(100, 999);
    $res2 = $patientService->register([
        'username' => 'test_deid_p2_' . $unique2,
        'password' => 'SecurePass123!#',
        'first_name' => 'Benjamin',
        'last_name' => 'Centenarian',
        'sex' => 'male',
        'birthdate' => '1922-05-14',
        'civil_status' => 'Single',
        'blood_type' => 'O+',
        'height' => '175',
        'weight' => '72',
        'address_line' => '456 Rural Rd',
        'city' => 'Westminster',
        'province' => 'VT',
        'zip_code' => '03601',
        'mobile_phone' => '802-555-0144',
        'contact_email' => 'benjamin.test@example.com',
        'ssn' => '999-33-4444'
    ], 1);

    if (!$res2['success']) {
        throw new \RuntimeException('Failed to register test patient 2: ' . json_encode($res2));
    }
    $pId2 = (int) $res2['data']['patient_id'];
    $mrn2 = $res2['data']['patient_no'];
    $createdPatientIds[] = $pId2;
    $createdUserIds[] = (int) $res2['data']['user_id'];

    // Generate Safe Harbor Dataset
    $datasetParams = [
        'dataset_type' => 'patient_demographics',
        'purpose_of_use' => 'clinical_research',
        'purpose_description' => 'Automated test trial for Safe Harbor de-identification engine',
        'recipient_institution' => 'National Institute of Health Informatics',
        'recipient_investigator' => 'Dr. Eleanor Vance, PhD',
        'data_format' => 'rfc4180_csv',
        'attestation_officer_name' => 'Chief Compliance Officer',
        'attestation_officer_role' => 'HIPAA Security & Privacy Officer',
        'limit' => 200
    ];

    $exportResult = $service->generateDataset($datasetParams, 1);
    $exportId = $exportResult['export_id'];
    $createdExportIds[] = $exportId;

    report($exportId > 0, "De-identified export successfully generated with ID {$exportId}");
    report(str_starts_with($exportResult['export_code'], 'DEID-'), "Export code formatted correctly ({$exportResult['export_code']})");
    report($exportResult['records_count'] >= 2, "Export contains at least 2 processed records ({$exportResult['records_count']})");
    report(strlen($exportResult['sha256_dataset_checksum']) === 64, "Generated valid 64-char SHA-256 dataset checksum");
    report($exportResult['is_safe_harbor_certified'] === true, "Dataset marked as Safe Harbor certified");

    // Verify sanitized payload does NOT contain direct identifiers
    $serializedPayload = json_encode($exportResult['total_records']);
    report(!str_contains($serializedPayload, 'Alice') && !str_contains($serializedPayload, 'Benjamin'), "Sanitized payload does NOT contain patient names");
    report(!str_contains($serializedPayload, 'alice.test@example.com'), "Sanitized payload does NOT contain email addresses");
    report(!str_contains($serializedPayload, '999-11-2222') && !str_contains($serializedPayload, '999-33-4444'), "Sanitized payload does NOT contain SSNs");
    report(!str_contains($serializedPayload, '415-555-0199'), "Sanitized payload does NOT contain phone numbers");
    report(!str_contains($serializedPayload, $mrn1) && !str_contains($serializedPayload, $mrn2), "Sanitized payload does NOT contain MRNs");

    // Verify Census Restricted ZIP conversion to 000XX and Age > 89 aggregation in output records
    $foundBenjaminRecord = false;
    $foundAliceRecord = false;

    // Check in vault for Benjamin's pseudonym
    $stmtVaultCheck = $pdo->prepare("SELECT subject_pseudonym FROM hipaa_reidentification_vault WHERE export_id = ? AND patient_id = ?");
    $stmtVaultCheck->execute([$exportId, $pId2]);
    $benjaminPseudonym = $stmtVaultCheck->fetchColumn();

    $stmtVaultCheck->execute([$exportId, $pId1]);
    $alicePseudonym = $stmtVaultCheck->fetchColumn();

    foreach ($exportResult['total_records'] as $rec) {
        if ($rec['subject_code'] === $benjaminPseudonym) {
            $foundBenjaminRecord = true;
            report($rec['zip3'] === '000XX', "Patient Benjamin with restricted Census ZIP '03601' is converted to '000XX'");
            report($rec['age'] === '90 or older', "Patient Benjamin (born 1922) is aggregated to age '90 or older'");
            report(str_contains($rec['birth_year'], 'or earlier'), "Patient Benjamin birth_year is formatted with 'or earlier'");
        }
        if ($rec['subject_code'] === $alicePseudonym) {
            $foundAliceRecord = true;
            report($rec['zip3'] === '941XX', "Patient Alice with normal ZIP '94107' retains first 3 digits '941XX'");
            report($rec['age'] !== '90 or older', "Patient Alice is not aggregated to '90 or older'");
            report($rec['birth_year'] === '1988', "Patient Alice birth year is '1988'");
        }
    }
    report($foundBenjaminRecord, "Found sanitized record for test subject Benjamin");
    report($foundAliceRecord, "Found sanitized record for test subject Alice");

    // Verify vault decoupling in hipaa_reidentification_vault
    $stmtVaultTotal = $pdo->prepare("SELECT COUNT(*) FROM hipaa_reidentification_vault WHERE export_id = ?");
    $stmtVaultTotal->execute([$exportId]);
    $vaultCount = (int) $stmtVaultTotal->fetchColumn();
    report($vaultCount === $exportResult['records_count'], "Re-identification vault entries match exported record count ({$vaultCount})");

    // ------------------------------------------------------------------
    // 4. Testing Re-Identification Vault Gating & Role Authorization (§ 164.514(c))
    // ------------------------------------------------------------------
    echo "\n4. Testing Vault Access Control & Authorization (§ 164.514(c))...\n";

    // 4a. Unauthorized access attempt (e.g. receptionist or doctor without compliance role)
    $unauthBlocked = false;
    try {
        $service->lookupSubject($exportId, $benjaminPseudonym, 999, 'receptionist');
    } catch (\RuntimeException $e) {
        $unauthBlocked = true;
        report(str_contains($e->getMessage(), 'Access Denied'), "Unauthorized role ('receptionist') blocked from re-identification vault");
    }
    report($unauthBlocked, "Re-identification vault lookup strictly rejects unauthorized roles");

    // 4b. Authorized compliance officer lookup
    $authRecord = $service->lookupSubject($exportId, $benjaminPseudonym, 1, 'compliance_officer');
    report($authRecord !== null, "Authorized Compliance Officer successfully retrieved vault mapping");
    report((int)$authRecord['patient_id'] === $pId2, "Vault mapped pseudonym back to correct patient_id");
    report($authRecord['first_name'] === 'Benjamin' && $authRecord['last_name'] === 'Centenarian', "Vault accurately revealed underlying patient identity to Compliance Officer");

    // ------------------------------------------------------------------
    // 5. Testing Multi-Format Exports & Attestation Certificate
    // ------------------------------------------------------------------
    echo "\n5. Testing Multi-Format Exports & Compliance Attestations...\n";

    // 5a. RFC 4180 CSV Export
    $csvExport = $service->exportDatasetCsv($exportId, 1);
    report(str_starts_with($csvExport['filename'], 'SafeHarbor_DEID-'), "CSV export filename formatted with 'SafeHarbor_DEID-'");
    report(str_contains($csvExport['content'], 'STATUTORY AUTHORITY: 45 CFR § 164.514(b)(2)'), "CSV includes statutory compliance header citing 45 CFR § 164.514(b)(2)");
    report(str_contains($csvExport['content'], 'WARNING: Re-identification of individuals'), "CSV includes statutory warning against unauthorized re-identification");
    report(str_contains($csvExport['content'], 'Subject_Code,Birth_Year,Age_Category,Sex,State,Safe_3Digit_ZIP'), "CSV contains standardized column structure");
    report(str_contains($csvExport['content'], $benjaminPseudonym), "CSV contains pseudonym '{$benjaminPseudonym}'");
    report(!str_contains($csvExport['content'], 'Benjamin Centenarian'), "CSV does NOT leak actual patient name");

    // 5b. FHIR ResearchStudy JSON Export
    $jsonExport = $service->exportDatasetJson($exportId, 1);
    report(str_starts_with($jsonExport['filename'], 'SafeHarbor_DEID-'), "JSON export filename formatted correctly");
    $payload = $jsonExport['payload'];
    report($payload['resourceType'] === 'Bundle' && $payload['type'] === 'collection', "JSON adheres to FHIR Bundle collection structure");
    report(isset($payload['meta']['statutoryAuthority']), "JSON meta includes statutory authority");
    report(isset($payload['meta']['sha256Checksum']), "JSON meta includes SHA-256 checksum");
    report(!empty($payload['entry']), "JSON payload contains array of research subject entries");
    report($payload['entry'][0]['resourceType'] === 'ResearchSubject', "JSON entry resourceType is 'ResearchSubject'");

    // 5c. Safe Harbor Compliance Attestation Certificate
    $attestation = $service->getAttestation($exportId, 1);
    report(isset($attestation['export']), "Attestation includes export metadata");
    report(str_contains($attestation['statutory_citation'], '45 CFR § 164.514(b)(2)'), "Attestation cites 45 CFR § 164.514(b)(2)");
    report(count($attestation['identifiers_checklist']) === 18, "Attestation contains complete 18-identifier statutory checklist");
    report(str_contains($attestation['compliance_statement'], '18 statutory Safe Harbor identifiers'), "Attestation includes official compliance officer statement");

    // 5d. Master Registry CSV Export
    $registryCsv = $service->exportRegistryCsv(1);
    report(str_starts_with($registryCsv['filename'], 'Safe_Harbor_Registry_'), "Registry CSV filename formatted correctly");
    report(str_contains($registryCsv['content'], 'Export_Code,Dataset_Type,Purpose,Recipient_Institution'), "Registry CSV contains expected column headers");
    report(str_contains($registryCsv['content'], $exportResult['export_code']), "Registry CSV contains generated export code");

    // ------------------------------------------------------------------
    // 6. Testing Telemetry & Summary Statistics
    // ------------------------------------------------------------------
    echo "\n6. Testing Telemetry & Summary Statistics...\n";

    $stats = $service->getStats();
    report($stats['total_exports'] >= 1, "Stats reflect total exports >= 1 ({$stats['total_exports']})");
    report($stats['total_records_deidentified'] >= 2, "Stats reflect de-identified records >= 2 ({$stats['total_records_deidentified']})");
    report($stats['total_vault_keys'] >= 2, "Stats reflect vault keys >= 2 ({$stats['total_vault_keys']})");
    report($stats['identifiers_verified'] === 18, "Stats verify all 18 Safe Harbor identifiers");
    report($stats['compliance_rate_percent'] === 100.0, "Compliance rate is 100.0%");

    // ------------------------------------------------------------------
    // 7. Testing Audit Logging & HMAC-SHA-256 Chained Audit Trail
    // ------------------------------------------------------------------
    echo "\n7. Testing Audit Logging & Cryptographic Hash Chain...\n";

    $stmtAudit = $pdo->prepare("SELECT * FROM `hipaa_audit_logs` WHERE `event_category` = :cat ORDER BY `id` ASC");
    $stmtAudit->execute(['cat' => AuditLogger::CATEGORY_DEIDENTIFICATION]);
    $auditEntries = $stmtAudit->fetchAll(PDO::FETCH_ASSOC);

    report(count($auditEntries) > 0, "Audit logs recorded under category 'SAFE_HARBOR_DEIDENTIFICATION'");

    $auditActions = array_column($auditEntries, 'action');
    report(in_array(AuditLogger::ACTION_DEID_DATASET_EXPORTED, $auditActions, true), "Logged action " . AuditLogger::ACTION_DEID_DATASET_EXPORTED);
    report(in_array(AuditLogger::ACTION_DEID_REID_KEY_ACCESSED, $auditActions, true), "Logged action " . AuditLogger::ACTION_DEID_REID_KEY_ACCESSED);
    report(in_array(AuditLogger::ACTION_DEID_REGISTRY_EXPORT, $auditActions, true), "Logged action " . AuditLogger::ACTION_DEID_REGISTRY_EXPORT);
    report(in_array(AuditLogger::ACTION_DEID_ATTESTATION_PRINT, $auditActions, true), "Logged action " . AuditLogger::ACTION_DEID_ATTESTATION_PRINT);

    // Verify entire HMAC-SHA-256 hash chain across all hipaa_audit_logs
    $integrity = AuditLogger::verifyIntegrity();
    report($integrity['valid'] === true, "Complete HIPAA audit sequential HMAC-SHA-256 hash chain is VALID (0 tampering detected)");

} catch (\Throwable $e) {
    $failed++;
    echo "\n[EXCEPTION] Fatal error during test execution:\n";
    echo $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
} finally {
    // Cleanup test fixtures
    echo "\nCleaning up test fixtures...\n";
    if (!empty($createdExportIds)) {
        $inExports = implode(',', array_map('intval', $createdExportIds));
        $pdo->exec("DELETE FROM `hipaa_reidentification_vault` WHERE `export_id` IN ({$inExports})");
        $pdo->exec("DELETE FROM `hipaa_deidentified_exports` WHERE `id` IN ({$inExports})");
    }
    if (!empty($createdPatientIds)) {
        $inPatients = implode(',', array_map('intval', $createdPatientIds));
        $pdo->exec("DELETE FROM `hipaa_confidential_communications_log` WHERE `patient_id` IN ({$inPatients})");
        $pdo->exec("DELETE FROM `patient_contacts` WHERE `patient_id` IN ({$inPatients})");
        $pdo->exec("DELETE FROM `patient_employers` WHERE `patient_id` IN ({$inPatients})");
        $pdo->exec("DELETE FROM `patient_guardians` WHERE `patient_id` IN ({$inPatients})");
        $pdo->exec("DELETE FROM `patients` WHERE `id` IN ({$inPatients})");
    }
    if (!empty($createdUserIds)) {
        $inUsers = implode(',', array_map('intval', $createdUserIds));
        $pdo->exec("DELETE FROM `users` WHERE `id` IN ({$inUsers})");
    }
}

echo "\n======================================================================\n";
echo "  TEST SUMMARY: {$passed} Passed, {$failed} Failed\n";
echo "======================================================================\n";

exit($failed > 0 ? 1 : 0);
