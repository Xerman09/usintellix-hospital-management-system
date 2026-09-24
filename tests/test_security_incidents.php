<?php
/**
 * Automated Verification: HIPAA Security Incidents & 4-Factor Breach Risk Assessment
 * Statutory Framework: 45 CFR §§ 164.400 - 164.414 & 45 CFR § 164.308(a)(6)
 */

declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Core\AuditLogger;
use App\Modules\SecurityIncidents\Services\SecurityIncidentService;
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
        echo "  [FAIL] {$title}" . ($detail ? " - {$detail}" : '') . "\n";
    }
}

echo "======================================================================\n";
echo "  HIPAA BREACH NOTIFICATION & 4-FACTOR RISK ASSESSMENT TEST SUITE     \n";
echo "======================================================================\n\n";

$db = Database::connection();
$service = new SecurityIncidentService();
$adminUser = ['id' => 1, 'email' => 'compliance-officer@uhms.org', 'name' => 'Dr. Compliance Officer'];

// ---------------------------------------------------------------------
// 1. Schema Verification (Migration 202)
// ---------------------------------------------------------------------
echo "1. Testing Database Schema & Statutory Columns (Migration 202)...\n";

$incidentCols = [
    'incident_number', 'incident_title', 'incident_date', 'discovery_date',
    'incident_type', 'affected_individuals_count', 'phi_types_involved',
    'factor1_phi_nature_score', 'factor2_recipient_score', 'factor3_viewed_acquired_score',
    'factor4_mitigation_score', 'composite_risk_score', 'breach_determination',
    'individual_notification_deadline', 'individual_notification_status',
    'ocr_notification_deadline', 'ocr_notification_status', 'media_notification_required'
];

foreach ($incidentCols as $col) {
    $stmt = $db->query("SHOW COLUMNS FROM `hipaa_security_incidents` LIKE '{$col}'");
    report($stmt->rowCount() > 0, "Column '{$col}' exists on hipaa_security_incidents table");
}

$patientLinkCols = ['incident_id', 'patient_id', 'notification_status', 'notification_method'];
foreach ($patientLinkCols as $col) {
    $stmt = $db->query("SHOW COLUMNS FROM `hipaa_incident_patients` LIKE '{$col}'");
    report($stmt->rowCount() > 0, "Column '{$col}' exists on hipaa_incident_patients table");
}

// ---------------------------------------------------------------------
// 2. Setup Test Patient
// ---------------------------------------------------------------------
echo "\n2. Setting Up Test Patient for Breach Notification...\n";
$patientModel = new Patient();
$testPatNo = 'TEST-BRCH-' . bin2hex(random_bytes(3));
$patientId = (int) $patientModel->create([
    'patient_no'  => $testPatNo,
    'user_id'     => 1,
    'first_name'  => 'Arthur',
    'last_name'   => 'Pendelton',
    'sex'         => 'male',
    'birthdate'   => '1982-05-14',
    'civil_status'=> 'Married',
    'blood_type'  => 'O+',
    'height'      => 178.00,
    'weight'      => 75.00,
    'created_at'  => date('Y-m-d H:i:s')
]);
report($patientId > 0, "Test patient Arthur Pendelton created with ID #{$patientId}");

// ---------------------------------------------------------------------
// 3. Input Validation
// ---------------------------------------------------------------------
echo "\n3. Testing Input Validation & Statutory Constraints...\n";
$res1 = $service->create(['incident_title' => ''], $adminUser);
report(!$res1['success'], "Rejects incident creation with empty title");

$res2 = $service->create(['incident_title' => 'Test', 'discovery_date' => ''], $adminUser);
report(!$res2['success'], "Rejects incident creation with empty discovery date (§ 164.404 clock requirement)");

$res3 = $service->create(['incident_title' => 'Test', 'discovery_date' => '2026-09-01', 'incident_description' => ''], $adminUser);
report(!$res3['success'], "Rejects incident creation with empty description narrative");

// ---------------------------------------------------------------------
// 4. Incident Intake & Automatic Deadline Computation
// ---------------------------------------------------------------------
echo "\n4. Testing Incident Recording & Statutory Deadline Calculation...\n";
$discoveryDate = '2026-09-10';
$expectedIndividualDeadline = date('Y-m-d', strtotime('2026-09-10 +60 days')); // 2026-11-09

$createRes = $service->create([
    'incident_title'             => 'Misdirected Lab Results Email Transmission',
    'incident_date'              => '2026-09-08 14:30:00',
    'discovery_date'             => $discoveryDate,
    'incident_type'              => 'misdirected_communication_fax_email',
    'location_of_breach'         => 'Email',
    'affected_individuals_count' => 1,
    'phi_types_involved'         => 'Demographics, Lab Results, Diagnoses',
    'incident_description'       => 'Laboratory report PDF sent to incorrect external email recipient due to clerical entry typo.',
    'patient_ids'                => [$patientId]
], $adminUser);

report($createRes['success'], "Successfully recorded security incident: " . ($createRes['data']['incident_number'] ?? ''));
$incidentId = (int) ($createRes['data']['id'] ?? 0);
$incidentNum = $createRes['data']['incident_number'] ?? '';

$savedIncident = $service->find($incidentId);
report($savedIncident !== null, "Successfully fetched saved incident #{$incidentNum}");
report(
    $savedIncident['individual_notification_deadline'] === $expectedIndividualDeadline,
    "Calculated 60-day individual notification deadline (§ 164.404)",
    "Expected {$expectedIndividualDeadline}, got {$savedIncident['individual_notification_deadline']}"
);
report($savedIncident['individual_notification_status'] === 'pending', "Individual notification status initialized to 'pending'");
report(count($savedIncident['linked_patients']) === 1, "Patient #{$patientId} automatically linked to incident");

// ---------------------------------------------------------------------
// 5. Statutory 4-Factor Risk Assessment (§ 164.402)
// ---------------------------------------------------------------------
echo "\n5. Testing Statutory 4-Factor Risk Assessment (§ 164.402)...\n";
// Case A: Low risk demonstration (Recipient confirmed immediate deletion)
$assessRes = $service->submitRiskAssessment($incidentId, [
    'factor1_phi_nature_score'      => 2, // Basic routine lab, low re-id risk
    'factor1_rationale'             => 'Standard lipid panel with no SSN or HIV/psychiatric markers.',
    'factor2_recipient_score'       => 1, // Sent to affiliated clinic staff
    'factor2_rationale'             => 'Recipient was nurse at partner clinic bound by confidentiality.',
    'factor3_viewed_acquired_score' => 2, // Opened but immediately recognized error
    'factor3_rationale'             => 'Email opened and immediately recognized as addressed to wrong clinic.',
    'factor4_mitigation_score'      => 1, // Immediate verified deletion
    'factor4_rationale'             => 'Recipient provided signed written certification of immediate permanent deletion.',
    'breach_determination'          => 'not_a_breach_low_risk',
    'determination_rationale'       => 'Low probability of compromise established under 45 CFR § 164.402 based on 4-factor risk assessment and verified immediate deletion.',
    'investigating_officer_name'    => 'Dr. Compliance Officer'
], $adminUser);

report($assessRes['success'], "Successfully recorded 4-Factor Risk Assessment");
report(
    (float) $assessRes['data']['composite_risk_score'] === 1.5,
    "Calculated composite risk score: 1.5/5.0",
    "Score: " . $assessRes['data']['composite_risk_score']
);
report(
    $assessRes['data']['breach_determination'] === 'not_a_breach_low_risk',
    "Determination recorded as 'not_a_breach_low_risk'"
);

$updatedInc = $service->find($incidentId);
report($updatedInc['assessment_conducted'] == 1, "assessment_conducted flag set to 1 in database");
report($updatedInc['individual_notification_status'] === 'not_required', "Individual notification set to 'not_required' on low risk determination");

// ---------------------------------------------------------------------
// 6. Reportable Breach Assessment Scenario (High Risk)
// ---------------------------------------------------------------------
echo "\n6. Testing High-Risk Reportable Breach & Major Incident (>500 individuals)...\n";
$majorCreate = $service->create([
    'incident_title'             => 'Unencrypted Stolen Backup Drive Incident',
    'incident_date'              => '2026-09-15 22:00:00',
    'discovery_date'             => '2026-09-16',
    'incident_type'              => 'lost_stolen_device_media',
    'location_of_breach'         => 'Laptop/Device',
    'affected_individuals_count' => 850,
    'phi_types_involved'         => 'Demographics, SSN, Financial Accounts, Clinical Diagnoses',
    'incident_description'       => 'Vehicle break-in resulted in theft of external USB drive containing unencrypted database export.',
], $adminUser);

$majorId = (int) $majorCreate['data']['id'];
$majorInc = $service->find($majorId);
report($majorInc['media_notification_required'] == 1, "Mandatory media notification flag set (§ 164.406: >=500 individuals)");
report(
    $majorInc['ocr_notification_deadline'] === $majorInc['individual_notification_deadline'],
    "Immediate OCR reporting deadline set (§ 164.408: <=60 days for >=500 individuals)"
);

$majorAssess = $service->submitRiskAssessment($majorId, [
    'factor1_phi_nature_score'      => 5,
    'factor2_recipient_score'       => 5,
    'factor3_viewed_acquired_score' => 4,
    'factor4_mitigation_score'      => 5,
    'breach_determination'          => 'reportable_breach_ocr_immediate',
    'determination_rationale'       => 'Unencrypted SSN and clinical data stolen by unknown criminals. High probability of compromise.',
    'investigating_officer_name'    => 'Chief Information Security Officer'
], $adminUser);

report($majorAssess['success'], "High-risk 4-factor evaluation submitted");
report(
    (float) $majorAssess['data']['composite_risk_score'] === 4.8,
    "Computed composite risk score: 4.8/5.0"
);
report(
    $majorAssess['data']['breach_determination'] === 'reportable_breach_ocr_immediate',
    "Determination flagged as 'reportable_breach_ocr_immediate'"
);

// ---------------------------------------------------------------------
// 7. Patient Breach Notification Letter Generator (§ 164.404(c))
// ---------------------------------------------------------------------
echo "\n7. Testing Patient Breach Notification Letter Generator (§ 164.404(c))...\n";
$service->linkPatient($majorId, $patientId);

$letterRes = $service->getBreachLetterData($majorId, $patientId, $adminUser);
report($letterRes['success'], "Successfully generated formal breach notification letter data");
$letter = $letterRes['data'];

report(strpos($letter['patient_name'], 'Arthur Pendelton') !== false, "Letter addressed to patient Arthur Pendelton");
report(!empty($letter['what_happened']), "Letter contains statutory description of what happened (§ 164.404(c)(1)(A))");
report(!empty($letter['phi_types_involved']), "Letter contains statutory types of PHI involved (§ 164.404(c)(1)(B))");
report(!empty($letter['what_you_can_do']), "Letter contains steps patient should take to protect themselves (§ 164.404(c)(1)(C))");
report(!empty($letter['what_we_are_doing']), "Letter contains covered entity investigation and mitigation (§ 164.404(c)(1)(D))");
report(!empty($letter['contact_phone']), "Letter contains statutory toll-free contact procedure (§ 164.404(c)(1)(E))");

// ---------------------------------------------------------------------
// 8. HHS OCR Breach Portal Export Package (§ 164.408)
// ---------------------------------------------------------------------
echo "\n8. Testing HHS OCR Breach Portal Export Package (§ 164.408)...\n";
$ocrRes = $service->getOcrExportData($majorId, $adminUser);
report($ocrRes['success'], "Successfully generated HHS OCR Breach Portal package");
$ocr = $ocrRes['data'];

report($ocr['approximate_individuals'] === 850, "OCR package includes accurate affected individuals count: 850");
report($ocr['type_of_breach'] === 'Theft / Loss of Device or Media', "OCR package categorizes breach type correctly");
report($ocr['statutory_4_factor_eval']['composite_risk_score'] == 4.8, "OCR package contains 4-factor risk assessment scores");
report($ocr['media_notice_required'] === true, "OCR package flags media notice requirement");

// ---------------------------------------------------------------------
// 9. Statistics & Countdown Aggregation
// ---------------------------------------------------------------------
echo "\n9. Testing Incident Statistics & Metric Aggregation...\n";
$stats = $service->stats();
report(isset($stats['total_incidents']) && $stats['total_incidents'] >= 2, "Stats include 'total_incidents' (Count: {$stats['total_incidents']})");
report(isset($stats['reportable_breaches']) && $stats['reportable_breaches'] >= 1, "Stats include 'reportable_breaches' (Count: {$stats['reportable_breaches']})");
report(isset($stats['major_breaches_500_plus']) && $stats['major_breaches_500_plus'] >= 1, "Stats include 'major_breaches_500_plus' (Count: {$stats['major_breaches_500_plus']})");
report(isset($stats['total_affected_individuals']) && $stats['total_affected_individuals'] >= 851, "Stats include 'total_affected_individuals' (Count: {$stats['total_affected_individuals']})");

// ---------------------------------------------------------------------
// 10. Cryptographic Audit Trail Hash Chain Integrity
// ---------------------------------------------------------------------
echo "\n10. Testing Cryptographic Audit Trail Hash Chain Integrity...\n";
$auditVerify = AuditLogger::verifyIntegrity(500);
report($auditVerify['valid'], "Cryptographic hash chain is intact and untampered: " . $auditVerify['message']);

// ---------------------------------------------------------------------
// 11. Cleanup Test Artifacts
// ---------------------------------------------------------------------
echo "\n11. Cleaning Up Test Artifacts...\n";
$db->prepare("DELETE FROM hipaa_incident_patients WHERE incident_id IN (:id1, :id2)")->execute(['id1' => $incidentId, 'id2' => $majorId]);
$db->prepare("DELETE FROM hipaa_security_incidents WHERE id IN (:id1, :id2)")->execute(['id1' => $incidentId, 'id2' => $majorId]);
$db->prepare("DELETE FROM patients WHERE id = :id")->execute(['id' => $patientId]);
report(true, "Cleaned up test incidents #{$incidentId}, #{$majorId}, and test patient #{$patientId}");

echo "\n======================================================================\n";
echo "  TEST RESULTS: {$passed} PASSED, {$failed} FAILED\n";
echo "======================================================================\n";

exit($failed > 0 ? 1 : 0);
