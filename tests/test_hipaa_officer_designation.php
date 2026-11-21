<?php
/**
 * Automated Verification: Official HIPAA Privacy & Security Officer Designation
 * Statutory Citations: 45 CFR § 164.308(a)(2) and 45 CFR § 164.530(a)
 */

declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

// Point this process at the disposable database BEFORE anything connects.
//
// Until 21 November this suite ran against whatever backend/.env names, which
// is the live database -- see docs/TODO.md 3.4. TestDatabase::use() refuses any
// target that is not clearly a test database, and because it writes
// $_ENV['DB_DATABASE'] before Env::load() runs (and Env::load() never
// overwrites a key that is already set), the override survives this suite's own
// Env::load() call further down.
require_once __DIR__ . '/lib/test_database.php';

try {
    TestDatabase::use();
} catch (Throwable $e) {
    echo 'REFUSED: ' . $e->getMessage() . "\n";
    exit(1);
}

use App\Core\Database;
use App\Core\Env;
use App\Core\AuditLogger;
use App\Modules\HipaaOfficers\Services\HipaaOfficerService;
use App\Modules\HipaaOfficers\Models\HipaaOfficerDesignation;
use App\Modules\SecurityIncidents\Services\SecurityIncidentService;
use App\Modules\Disclosures\Services\DisclosureService;
use App\Modules\DrsRequests\Services\DrsRequestService;
use App\Modules\Amendments\Services\AmendmentService;
use App\Modules\Deidentification\Services\DeidentificationService;

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
echo "  HIPAA PRIVACY & SECURITY OFFICER DESIGNATION TEST SUITE             \n";
echo "  Statutory Authority: 45 CFR § 164.308(a)(2) & 45 CFR § 164.530(a)  \n";
echo "======================================================================\n\n";

$pdo = Database::getInstance()->getConnection();
$service = new HipaaOfficerService();
$adminUserId = 1;
$adminUserRole = 'admin';
$adminUser = ['id' => 1, 'email' => 'admin@uhms.org', 'role' => 'admin'];

try {
    // ------------------------------------------------------------------
    // 1. Database Schema & Migration 211 Verification
    // ------------------------------------------------------------------
    echo "1. Testing Database Schema & Columns (Migration 211)...\n";

    $stmtTables = $pdo->query("SHOW TABLES LIKE 'hipaa_officer_designations'");
    report($stmtTables->rowCount() > 0, "Table 'hipaa_officer_designations' exists in database");

    $stmtCols = $pdo->query("SHOW COLUMNS FROM `hipaa_officer_designations`");
    $cols = $stmtCols->fetchAll(PDO::FETCH_ASSOC);
    $colNames = array_column($cols, 'Field');

    $expectedCols = [
        'id', 'officer_type', 'employee_id', 'user_id', 'full_name', 'title',
        'email', 'phone', 'extension', 'physical_office_address', 'appointment_date',
        'responsibilities_scope', 'is_active', 'appointed_by_name', 'notes',
        'created_at', 'created_by', 'updated_at', 'updated_by'
    ];
    foreach ($expectedCols as $col) {
        report(in_array($col, $colNames, true), "Column '{$col}' exists in hipaa_officer_designations");
    }

    // Verify officer_type ENUM values
    $typeColInfo = null;
    foreach ($cols as $c) {
        if ($c['Field'] === 'officer_type') {
            $typeColInfo = $c;
            break;
        }
    }
    report(
        $typeColInfo !== null && str_contains($typeColInfo['Type'], "'privacy_officer'") && str_contains($typeColInfo['Type'], "'security_officer'"),
        "Column 'officer_type' contains ENUM('privacy_officer', 'security_officer')"
    );

    // Verify seeded appointments exist
    $baselineOfficers = $pdo->query("SELECT * FROM hipaa_officer_designations ORDER BY id ASC")->fetchAll(PDO::FETCH_ASSOC);
    report(count($baselineOfficers) >= 2, "Baseline seeded appointments exist (Found " . count($baselineOfficers) . " officers)");

    $officerTypes = array_column($baselineOfficers, 'officer_type');
    report(in_array('privacy_officer', $officerTypes, true), "Baseline Privacy Officer row seeded");
    report(in_array('security_officer', $officerTypes, true), "Baseline Security Officer row seeded");

    // ------------------------------------------------------------------
    // 2. HipaaOfficerService Core Operations
    // ------------------------------------------------------------------
    echo "\n2. Testing HipaaOfficerService Core Operations...\n";

    $allOfficers = $service->getAll();
    report(isset($allOfficers['privacy_officer']) && isset($allOfficers['security_officer']), "getAll() returns both statutory officers");

    $privacyOfficer = $service->getByType('privacy_officer');
    report($privacyOfficer !== null, "getByType('privacy_officer') retrieves Privacy Officer record");
    report(!empty($privacyOfficer['full_name']), "Privacy Officer has full_name: " . ($privacyOfficer['full_name'] ?? ''));
    report(!empty($privacyOfficer['email']), "Privacy Officer has email: " . ($privacyOfficer['email'] ?? ''));
    report(!empty($privacyOfficer['phone']), "Privacy Officer has phone: " . ($privacyOfficer['phone'] ?? ''));

    $securityOfficer = $service->getByType('security_officer');
    report($securityOfficer !== null, "getByType('security_officer') retrieves Security Officer record");
    report(!empty($securityOfficer['full_name']), "Security Officer has full_name: " . ($securityOfficer['full_name'] ?? ''));
    report(!empty($securityOfficer['email']), "Security Officer has email: " . ($securityOfficer['email'] ?? ''));
    report(!empty($securityOfficer['phone']), "Security Officer has phone: " . ($securityOfficer['phone'] ?? ''));

    // Test invalid type handling
    $caughtInvalidTypeQuery = false;
    try {
        $service->getByType('non_existent_type');
    } catch (\InvalidArgumentException $e) {
        $caughtInvalidTypeQuery = true;
    }
    report($caughtInvalidTypeQuery, "getByType('non_existent_type') strictly throws InvalidArgumentException");

    // Public contact details
    $publicContacts = $service->getPublicDesignations();
    report(isset($publicContacts['privacy_officer']) && isset($publicContacts['security_officer']), "getPublicDesignations() returns both officer contacts");
    report(!isset($publicContacts['privacy_officer']['id']), "Public contact endpoint excludes internal database ID");
    report(!empty($publicContacts['privacy_officer']['email']), "Public contact endpoint includes privacy email");
    report(!empty($publicContacts['security_officer']['phone']), "Public contact endpoint includes security phone");
    report(str_contains($publicContacts['privacy_officer']['statutory_citation'] ?? '', '164.530(a)'), "Public privacy officer includes 45 CFR § 164.530(a) citation");
    report(str_contains($publicContacts['security_officer']['statutory_citation'] ?? '', '164.308(a)(2)'), "Public security officer includes 45 CFR § 164.308(a)(2) citation");

    // Stats
    $stats = $service->getStats();
    report($stats['privacy_officer_active'] === true, "Stats report privacy_officer_active = true");
    report($stats['security_officer_active'] === true, "Stats report security_officer_active = true");
    report($stats['both_officers_active'] === true, "Stats report both_officers_active = true");
    report($stats['overall_status'] === 'COMPLIANT', "Stats report overall_status = 'COMPLIANT'");
    report($stats['retention_mandate_years'] === 6, "Stats report retention_mandate_years = 6");

    // ------------------------------------------------------------------
    // 3. Designation Updates & Validation Rules
    // ------------------------------------------------------------------
    echo "\n3. Testing Designation Updates & Statutory Validation Rules...\n";

    // 3a. Validation: empty name
    $caughtEmptyName = false;
    try {
        $service->updateDesignation('privacy_officer', ['full_name' => ''], $adminUserId, $adminUserRole);
    } catch (\InvalidArgumentException $e) {
        $caughtEmptyName = true;
    }
    report($caughtEmptyName, "updateDesignation rejects empty full_name with InvalidArgumentException");

    // 3b. Validation: invalid email
    $caughtInvalidEmail = false;
    try {
        $service->updateDesignation('privacy_officer', ['full_name' => 'Valid Name', 'title' => 'Title', 'email' => 'not-an-email'], $adminUserId, $adminUserRole);
    } catch (\InvalidArgumentException $e) {
        $caughtInvalidEmail = true;
    }
    report($caughtInvalidEmail, "updateDesignation rejects invalid email format with InvalidArgumentException");

    // 3c. Validation: empty phone
    $caughtEmptyPhone = false;
    try {
        $service->updateDesignation('privacy_officer', ['full_name' => 'Valid Name', 'title' => 'Title', 'email' => 'valid@test.org', 'phone' => ''], $adminUserId, $adminUserRole);
    } catch (\InvalidArgumentException $e) {
        $caughtEmptyPhone = true;
    }
    report($caughtEmptyPhone, "updateDesignation rejects empty phone with InvalidArgumentException");

    // 3d. Validation: invalid appointment date
    $caughtInvalidDate = false;
    try {
        $service->updateDesignation('privacy_officer', [
            'full_name' => 'Valid Name',
            'title' => 'Title',
            'email' => 'valid@test.org',
            'phone' => '1-555-0199',
            'appointment_date' => 'invalid-date'
        ], $adminUserId, $adminUserRole);
    } catch (\InvalidArgumentException $e) {
        $caughtInvalidDate = true;
    }
    report($caughtInvalidDate, "updateDesignation rejects invalid appointment_date with InvalidArgumentException");

    // 3e. Validation: invalid officer type
    $caughtInvalidType = false;
    try {
        $service->updateDesignation('chief_medical_officer', [
            'full_name' => 'Valid Name',
            'title' => 'Title',
            'email' => 'valid@test.org',
            'phone' => '1-555-0199'
        ], $adminUserId, $adminUserRole);
    } catch (\InvalidArgumentException $e) {
        $caughtInvalidType = true;
    }
    report($caughtInvalidType, "updateDesignation rejects non-statutory officer_type with InvalidArgumentException");

    // 3f. Successful update test
    $origName = $privacyOfficer['full_name'];
    $origTitle = $privacyOfficer['title'];
    $origEmail = $privacyOfficer['email'];
    $origPhone = $privacyOfficer['phone'];
    $origExt = $privacyOfficer['extension'];
    $origScope = $privacyOfficer['responsibilities_scope'];

    $updateData = [
        'full_name'               => 'Sarah Jenkins-Updated, JD, CHPC',
        'title'                   => 'Senior HIPAA Privacy Official',
        'email'                   => 'sjenkins-test@usintellix-health.org',
        'phone'                   => '1-800-555-4321',
        'extension'               => '4499',
        'physical_office_address' => '100 Medical Center Parkway, Suite 500, Healthcare City, NY 10001',
        'appointment_date'        => '2024-02-01',
        'appointed_by_name'       => 'Board of Directors & Governance Committee',
        'responsibilities_scope'  => 'Comprehensive oversight of HIPAA Privacy Rule compliance pursuant to 45 CFR § 164.530(a).'
    ];

    $updateRes = $service->updateDesignation('privacy_officer', $updateData, $adminUserId, $adminUserRole);
    report($updateRes['success'] === true, "updateDesignation returns success = true");
    report($updateRes['data']['full_name'] === 'Sarah Jenkins-Updated, JD, CHPC', "updateDesignation updated full_name in return payload");
    report($updateRes['data']['email'] === 'sjenkins-test@usintellix-health.org', "updateDesignation updated email in return payload");
    report($updateRes['data']['phone'] === '1-800-555-4321', "updateDesignation updated phone in return payload");

    // Verify DB reflects updated state
    $dbOfficer = $service->getByType('privacy_officer');
    report($dbOfficer['full_name'] === 'Sarah Jenkins-Updated, JD, CHPC', "Database reflects updated full_name");
    report($dbOfficer['email'] === 'sjenkins-test@usintellix-health.org', "Database reflects updated email");

    // Revert back to original baseline
    $revertData = [
        'full_name'               => $origName,
        'title'                   => $origTitle,
        'email'                   => $origEmail,
        'phone'                   => $origPhone,
        'extension'               => $origExt,
        'physical_office_address' => $privacyOfficer['physical_office_address'],
        'appointment_date'        => $privacyOfficer['appointment_date'],
        'appointed_by_name'       => $privacyOfficer['appointed_by_name'],
        'responsibilities_scope'  => $origScope
    ];
    $service->updateDesignation('privacy_officer', $revertData, $adminUserId, $adminUserRole);
    $reverted = $service->getByType('privacy_officer');
    report($reverted['full_name'] === $origName, "Successfully restored baseline Privacy Officer record");

    // ------------------------------------------------------------------
    // 4. Appointment Attestation Certificate Generation
    // ------------------------------------------------------------------
    echo "\n4. Testing Formal Appointment Attestation Certificate Generation...\n";

    $poAttestation = $service->generateAttestationLetter('privacy_officer', $adminUserId, $adminUserRole);
    report(!empty($poAttestation['full_name']), "generateAttestationLetter('privacy_officer') returns full_name: " . ($poAttestation['full_name'] ?? ''));
    report(str_contains($poAttestation['statutory_citation'] ?? '', '45 CFR § 164.530(a)'), "Attestation data cites 45 CFR § 164.530(a)");
    report(str_contains($poAttestation['retention_mandate'] ?? '', '6-Year'), "Attestation data cites 6-Year retention mandate");
    report(!empty($poAttestation['certification_statement']), "Attestation data includes formal certification_statement");

    $soAttestation = $service->generateAttestationLetter('security_officer', $adminUserId, $adminUserRole);
    report(!empty($soAttestation['full_name']), "generateAttestationLetter('security_officer') returns full_name: " . ($soAttestation['full_name'] ?? ''));
    report(str_contains($soAttestation['statutory_citation'] ?? '', '45 CFR § 164.308(a)(2)'), "Security attestation data cites 45 CFR § 164.308(a)(2)");

    $caughtInvalidAttestation = false;
    try {
        $service->generateAttestationLetter('invalid_officer', $adminUserId, $adminUserRole);
    } catch (\InvalidArgumentException $e) {
        $caughtInvalidAttestation = true;
    }
    report($caughtInvalidAttestation, "generateAttestationLetter rejects invalid officer type");

    // ------------------------------------------------------------------
    // 5. Regulatory RFC 4180 CSV Export
    // ------------------------------------------------------------------
    echo "\n5. Testing Regulatory RFC 4180 CSV Export...\n";

    $csv = $service->exportRegistryCsv($adminUserId, $adminUserRole);
    report(!empty($csv), "exportRegistryCsv() returns non-empty CSV string");
    report(str_contains($csv, 'USINTELLIX HEALTHCARE SYSTEM - OFFICIAL HIPAA PRIVACY & SECURITY OFFICER REGISTRY'), "CSV contains official facility header");
    report(str_contains($csv, '45 CFR § 164.530(a)') && str_contains($csv, '45 CFR § 164.308(a)(2)'), "CSV header cites federal statutory authorities");
    report(str_contains($csv, 'Designation Role') && str_contains($csv, 'Statutory Authority') && str_contains($csv, 'Official Name'), "CSV contains standard column headers");
    report(str_contains($csv, 'HIPAA Privacy Official') && str_contains($csv, 'HIPAA Security Official'), "CSV contains rows for both privacy and security officers");
    report(str_contains($csv, 'Marcus Vance'), "CSV contains Marcus Vance Security Officer entry");
    report(str_contains($csv, 'Sarah Jenkins'), "CSV contains Sarah Jenkins Privacy Officer entry");

    // ------------------------------------------------------------------
    // 6. Dynamic Multi-Subsystem Auto-Population Integration
    // ------------------------------------------------------------------
    echo "\n6. Testing Dynamic Subsystem Auto-Population Integration...\n";

    // THE ROWS SECTION 6 NEEDS, CREATED RATHER THAN HOPED FOR.
    //
    // Every branch below used to be guarded by "if there is a row" and, when
    // there was not, called report(true, "... skipped ...") -- a PASS printed
    // for an assertion that never ran. On the live database those rows happened
    // to exist, so the real paths ran and nobody noticed. Pointed at a fresh
    // test database on 21 November, hipaa_security_incidents,
    // hipaa_drs_access_requests and amendments are all empty, and five of this
    // suite's green lines were being fabricated.
    //
    // A skipped test reporting a pass is the worst thing a suite can do: it is
    // indistinguishable from coverage. So the rows are created here, the
    // branches are unconditional below, and anything created is removed in the
    // teardown at the end of this block.
    $createdFixtures = ['incident' => null, 'drs' => null, 'amendment' => null, 'patient' => null];

    $patientRow = $pdo->query("SELECT id FROM patients WHERE deleted_at IS NULL ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);

    if (!$patientRow) {
        $pdo->exec("INSERT INTO patients (patient_no, first_name, last_name, birthdate, sex, created_at)
                    VALUES ('ZZTEST-OFFICER', 'Zz', 'Officerfixture', '1990-01-01', 'female', NOW())");
        $createdFixtures['patient'] = (int) $pdo->lastInsertId();
        $patientRow = ['id' => $createdFixtures['patient']];
    }

    $officerPatientId = (int) $patientRow['id'];

    $incidentRow = $pdo->query("SELECT id FROM hipaa_security_incidents ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);

    if (!$incidentRow) {
        $stmt = $pdo->prepare("INSERT INTO hipaa_security_incidents
            (incident_number, incident_title, incident_date, discovery_date, incident_description)
            VALUES (:n, :t, NOW(), NOW(), :d)");
        $stmt->execute([
            'n' => 'ZZTEST-INC-OFFICER',
            't' => 'Fixture incident for the officer-designation suite',
            'd' => 'Created by tests/test_hipaa_officer_designation.php so the breach-letter and '
                . 'OCR-export assertions run instead of reporting a pass for a skipped test.',
        ]);
        $createdFixtures['incident'] = (int) $pdo->lastInsertId();
        $incidentRow = ['id' => $createdFixtures['incident']];
    }

    report(!empty($incidentRow['id']), "A security incident exists for section 6a to read");
    report($officerPatientId > 0, "A patient exists for section 6a to read");

    // 6a. SecurityIncidentService integration
    $incidentService = new SecurityIncidentService($pdo);

    $letterRes = $incidentService->getBreachLetterData((int)$incidentRow['id'], $officerPatientId, $adminUser);
    report(!empty($letterRes['success']), "SecurityIncidentService getBreachLetterData succeeded", $letterRes['message'] ?? '');

    $letterData = $letterRes['data'] ?? [];
    report(!empty($letterData['contact_phone']), "SecurityIncidentService breach letter populated contact_phone: " . ($letterData['contact_phone'] ?? ''));
    report(!empty($letterData['contact_email']), "SecurityIncidentService breach letter populated contact_email: " . ($letterData['contact_email'] ?? ''));
    report(!empty($letterData['facility_address']), "SecurityIncidentService breach letter populated facility_address");

    $ocrRes = $incidentService->getOcrExportData((int)$incidentRow['id'], $adminUser);
    report(!empty($ocrRes['success']), "SecurityIncidentService getOcrExportData succeeded", $ocrRes['message'] ?? '');

    $ocrData = $ocrRes['data'] ?? [];
    report(!empty($ocrData['investigating_officer']), "SecurityIncidentService OCR export populated investigating_officer: " . ($ocrData['investigating_officer'] ?? ''));
    report(str_contains($ocrData['investigating_officer'] ?? '', 'Marcus Vance') || str_contains($ocrData['investigating_officer'] ?? '', 'Security'), "OCR export investigating_officer references designated Security Officer");

    // 6b. DisclosureService integration
    //
    // The patient this uses is the one the fixture block above guaranteed, so
    // this no longer creates and deletes its own.
    $testPatientId = $officerPatientId;

    $disclosureService = new DisclosureService($pdo);
    $reportRes = $disclosureService->getReportData($testPatientId, '2020-01-01', '2026-12-31', $adminUser);
    report($reportRes['success'] === true, "DisclosureService getReportData succeeds");
    report(isset($reportRes['data']['privacy_officer']), "DisclosureService report data contains 'privacy_officer' block");
    report(!empty($reportRes['data']['privacy_officer']['email']), "DisclosureService report includes Privacy Officer email: " . ($reportRes['data']['privacy_officer']['email'] ?? ''));

    // 6c. DrsRequestService integration
    $drsService = new DrsRequestService($pdo);
    $drsRow = $pdo->query("SELECT id FROM hipaa_drs_access_requests ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);

    if (!$drsRow) {
        $stmt = $pdo->prepare("INSERT INTO hipaa_drs_access_requests
            (request_number, patient_id, request_date, requestor_name, initial_deadline,
             created_at, updated_at, created_by)
            VALUES (:n, :p, CURDATE(), :r, DATE_ADD(CURDATE(), INTERVAL 30 DAY), NOW(), NOW(), :by)");
        $stmt->execute([
            'n' => 'ZZTEST-DRS-OFFICER',
            'p' => $officerPatientId,
            'r' => 'Zz Officerfixture',
            'by' => (int) ($adminUser['id'] ?? 1),
        ]);
        $createdFixtures['drs'] = (int) $pdo->lastInsertId();
        $drsRow = ['id' => $createdFixtures['drs']];
    }

    $drsNoticeRes = $drsService->getExtensionNoticeData((int)$drsRow['id']);
    report(!empty($drsNoticeRes['success']), "DrsRequestService getExtensionNoticeData succeeded", $drsNoticeRes['message'] ?? '');

    $drsNotice = $drsNoticeRes['data'] ?? [];
    report(!empty($drsNotice['privacy_office_phone']), "DrsRequestService extension notice populated privacy_office_phone: " . ($drsNotice['privacy_office_phone'] ?? ''));
    report(!empty($drsNotice['privacy_office_email']), "DrsRequestService extension notice populated privacy_office_email: " . ($drsNotice['privacy_office_email'] ?? ''));
    report(!empty($drsNotice['privacy_officer_name']), "DrsRequestService extension notice populated privacy_officer_name: " . ($drsNotice['privacy_officer_name'] ?? ''));

    // 6d. AmendmentService integration
    $amendmentService = new AmendmentService($pdo);
    $amdRow = $pdo->query("SELECT id FROM amendments ORDER BY id DESC LIMIT 1")->fetch(PDO::FETCH_ASSOC);

    if (!$amdRow) {
        // Denied, with a statutory ground, deliberately: getDenialNoticeData()
        // refuses an amendment that has not been denied -- "Amendment has not
        // been denied with a statutory ground" -- which is the service being
        // right, not a missing feature. A bare row would make the denial-notice
        // assertions fail for a reason that has nothing to do with the officer
        // designation this suite is about.
        $stmt = $pdo->prepare("INSERT INTO amendments
            (patient_id, status, denial_statutory_ground, denial_rationale, denial_notice_date)
            VALUES (:p, 'denied', 'accurate_and_complete', :r, CURDATE())");
        $stmt->execute([
            'p' => $officerPatientId,
            'r' => 'Fixture for tests/test_hipaa_officer_designation.php section 6d.',
        ]);
        $createdFixtures['amendment'] = (int) $pdo->lastInsertId();
        $amdRow = ['id' => $createdFixtures['amendment']];
    }

    $amdNoticeRes = $amendmentService->getExtensionNoticeData((int)$amdRow['id']);
    report(!empty($amdNoticeRes['success']), "AmendmentService getExtensionNoticeData succeeded", $amdNoticeRes['message'] ?? '');

    $amdNotice = $amdNoticeRes['data'] ?? [];
    report(!empty($amdNotice['privacy_office_phone']), "AmendmentService extension notice populated privacy_office_phone: " . ($amdNotice['privacy_office_phone'] ?? ''));
    report(!empty($amdNotice['privacy_officer_name']), "AmendmentService extension notice populated privacy_officer_name: " . ($amdNotice['privacy_officer_name'] ?? ''));

    $denialNoticeRes = $amendmentService->getDenialNoticeData((int)$amdRow['id']);
    report(!empty($denialNoticeRes['success']), "AmendmentService getDenialNoticeData succeeded", $denialNoticeRes['message'] ?? '');

    $denialNotice = $denialNoticeRes['data'] ?? [];
    report(!empty($denialNotice['privacy_office_phone']), "AmendmentService denial notice populated privacy_office_phone: " . ($denialNotice['privacy_office_phone'] ?? ''));
    report(!empty($denialNotice['privacy_office_email']), "AmendmentService denial notice populated privacy_office_email: " . ($denialNotice['privacy_office_email'] ?? ''));

    // Teardown for section 6's fixtures. Only what this run created, by id, so
    // a database that already had rows is left exactly as it was.
    foreach ([
        'amendment' => 'amendments',
        'drs' => 'hipaa_drs_access_requests',
        'incident' => 'hipaa_security_incidents',
        'patient' => 'patients',
    ] as $key => $table) {
        if (!empty($createdFixtures[$key])) {
            $pdo->prepare("DELETE FROM `{$table}` WHERE id = :id")
                ->execute(['id' => $createdFixtures[$key]]);
        }
    }

    // 6e. DeidentificationService default attestation officer
    $deidService = new DeidentificationService($pdo);
    $deidExport = $deidService->generateDataset([
        'dataset_type' => 'demographics',
        'purpose_of_use' => 'quality_improvement',
        'limit' => 5
    ], $adminUserId);
    report(!empty($deidExport['export_code']), "DeidentificationService generateDataset succeeds");
    report(!empty($deidExport['attestation_officer_name']), "DeidentificationService dataset defaults to Privacy Officer: " . ($deidExport['attestation_officer_name'] ?? ''));
    report(str_contains($deidExport['attestation_officer_name'] ?? '', 'Sarah Jenkins'), "Attestation officer matches designated Privacy Officer Sarah Jenkins");

    // ------------------------------------------------------------------
    // 7. Cryptographic HMAC-SHA-256 Audit Trail & Chain Verification
    // ------------------------------------------------------------------
    echo "\n7. Testing Cryptographic HMAC-SHA-256 Audit Trail & Hash Chain Integrity...\n";

    $auditStmt = $pdo->query("SELECT * FROM hipaa_audit_logs WHERE event_category = 'HIPAA_GOVERNANCE' ORDER BY id DESC LIMIT 10");
    $auditLogs = $auditStmt->fetchAll(PDO::FETCH_ASSOC);
    report(count($auditLogs) >= 3, "Audit logs committed under event_category = 'HIPAA_GOVERNANCE' (Found " . count($auditLogs) . ")");

    $auditActions = array_column($auditLogs, 'action');
    report(in_array(AuditLogger::ACTION_HIPAA_OFFICER_UPDATED, $auditActions, true), "Audit trail recorded ACTION_HIPAA_OFFICER_UPDATED (" . AuditLogger::ACTION_HIPAA_OFFICER_UPDATED . ")");
    report(in_array(AuditLogger::ACTION_HIPAA_OFFICERS_EXPORT_CSV, $auditActions, true), "Audit trail recorded ACTION_HIPAA_OFFICERS_EXPORT_CSV (" . AuditLogger::ACTION_HIPAA_OFFICERS_EXPORT_CSV . ")");
    report(in_array(AuditLogger::ACTION_HIPAA_OFFICER_ATTESTATION, $auditActions, true), "Audit trail recorded ACTION_HIPAA_OFFICER_ATTESTATION (" . AuditLogger::ACTION_HIPAA_OFFICER_ATTESTATION . ")");

    foreach ($auditLogs as $log) {
        report(!empty($log['tamper_hash']) && strlen($log['tamper_hash']) === 64, "Audit log #{$log['id']} contains valid 64-char SHA-256 tamper_hash: " . substr($log['tamper_hash'], 0, 16) . '...');
        break;
    }

    $chainVerification = AuditLogger::verifyIntegrity(1000);
    report($chainVerification['valid'] === true, "Audit trail cryptographic sequential hash chain is 100% unbroken: " . ($chainVerification['message'] ?? ''));

} catch (\Throwable $e) {
    report(false, "Uncaught Exception during test execution: " . $e->getMessage(), $e->getTraceAsString());
}

echo "\n======================================================================\n";
echo "  TEST SUMMARY: {$passed} Passed, {$failed} Failed\n";
echo "======================================================================\n";

if ($failed > 0) {
    exit(1);
}
exit(0);
