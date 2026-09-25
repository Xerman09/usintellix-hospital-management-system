<?php
/**
 * Automated Verification: Workforce HIPAA Training Tracking & Disciplinary Sanctions Log
 * Statutory Citations: 45 CFR § 164.308(a)(1)(ii)(C) & 45 CFR § 164.308(a)(5)
 */

declare(strict_types=1);

require_once __DIR__ . '/../backend/app/Core/Autoload.php';

use App\Core\Database;
use App\Core\Env;
use App\Core\AuditLogger;
use App\Modules\Workforce\Services\WorkforceService;
use App\Modules\Workforce\Models\WorkforceTraining;
use App\Modules\Workforce\Models\WorkforceSanction;

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
echo "  HIPAA WORKFORCE TRAINING & DISCIPLINARY SANCTIONS (§ 164.308) TEST SUITE\n";
echo "======================================================================\n\n";

$pdo = Database::getInstance()->getConnection();
$service = new WorkforceService();

$createdUserIds = [];
$createdEmployeeIds = [];
$createdTrainingIds = [];
$createdSanctionIds = [];

try {
    // ------------------------------------------------------------------
    // 1. Database Schema & Migration 209 Verification
    // ------------------------------------------------------------------
    echo "1. Testing Database Schema & Columns (Migration 209)...\n";

    // 1a. employees columns
    $stmtCols = $pdo->query("SHOW COLUMNS FROM `employees`");
    $empCols = $stmtCols->fetchAll(PDO::FETCH_COLUMN);

    $expectedEmpCols = [
        'hipaa_initial_training_date',
        'hipaa_last_refresher_date',
        'hipaa_next_refresher_due',
        'hipaa_training_status',
        'hipaa_training_score',
        'hipaa_cert_ref',
        'hipaa_curriculum_name'
    ];
    foreach ($expectedEmpCols as $col) {
        report(in_array($col, $empCols, true), "Column '{$col}' exists in employees table");
    }

    // 1b. hipaa_workforce_trainings
    $stmtTables = $pdo->query("SHOW TABLES LIKE 'hipaa_workforce_trainings'");
    report($stmtTables->rowCount() > 0, "Table 'hipaa_workforce_trainings' exists in database");

    $stmtColsTraining = $pdo->query("SHOW COLUMNS FROM `hipaa_workforce_trainings`");
    $trainingCols = $stmtColsTraining->fetchAll(PDO::FETCH_COLUMN);

    $expectedTrainingCols = [
        'id', 'employee_id', 'user_id', 'training_type', 'curriculum_title',
        'completion_date', 'expiration_date', 'score_percent', 'passing_threshold',
        'status', 'certificate_code', 'delivery_method', 'trainer_or_proctor',
        'verification_officer_id', 'verification_notes', 'created_at', 'created_by'
    ];
    foreach ($expectedTrainingCols as $col) {
        report(in_array($col, $trainingCols, true), "Column '{$col}' exists in hipaa_workforce_trainings");
    }

    // 1c. hipaa_workforce_sanctions
    $stmtTablesSanction = $pdo->query("SHOW TABLES LIKE 'hipaa_workforce_sanctions'");
    report($stmtTablesSanction->rowCount() > 0, "Table 'hipaa_workforce_sanctions' exists in database");

    $stmtColsSanction = $pdo->query("SHOW COLUMNS FROM `hipaa_workforce_sanctions`");
    $sanctionCols = $stmtColsSanction->fetchAll(PDO::FETCH_COLUMN);

    $expectedSanctionCols = [
        'id', 'sanction_code', 'employee_id', 'user_id', 'incident_id',
        'violation_date', 'reported_date', 'violation_category', 'severity_level',
        'disciplinary_action', 'investigation_findings', 'disciplinary_rationale',
        'sanction_effective_date', 'sanction_end_date', 'suspension_days',
        'remediation_required', 'remediation_deadline', 'remediation_completed_date',
        'sanctioning_officer_name', 'sanctioning_officer_role', 'signoff_date',
        'appeal_status', 'status', 'notes', 'created_at', 'created_by'
    ];
    foreach ($expectedSanctionCols as $col) {
        report(in_array($col, $sanctionCols, true), "Column '{$col}' exists in hipaa_workforce_sanctions");
    }

    // ------------------------------------------------------------------
    // 2. Testing Dynamic Compliance Status & 30-Day Onboarding / 365-Day Refresher Logic
    // ------------------------------------------------------------------
    echo "\n2. Testing Dynamic Compliance Status & Timeline Evaluation (§ 164.308(a)(5))...\n";

    // Setup helper to create fixture employees
    $createFixtureEmployee = function(string $fname, string $lname, ?string $hireDate, ?string $initialDate, ?string $dueDate, string $status = 'pending') use ($pdo, &$createdEmployeeIds) {
        $randHex = bin2hex(random_bytes(3));
        $empNo = 'TEST-' . strtoupper($randHex);
        $email = "test.{$randHex}@example.com";
        $phone = '555-' . rand(100, 999) . '-' . rand(1000, 9999);
        $createdAt = $hireDate ? "{$hireDate} 09:00:00" : date('Y-m-d H:i:s');
        $stmt = $pdo->prepare("
            INSERT INTO `employees` (user_id, employee_no, first_name, last_name, sex, birthdate, email, phone, department_id, hipaa_initial_training_date, hipaa_next_refresher_due, hipaa_training_status, created_at)
            VALUES (1, :empno, :fname, :lname, 'female', '1990-01-01', :email, :phone, 1, :init, :due, :status, :created_at)
        ");
        $stmt->execute([
            'empno' => $empNo,
            'fname' => $fname,
            'lname' => $lname,
            'email' => $email,
            'phone' => $phone,
            'init' => $initialDate,
            'due' => $dueDate,
            'status' => $status,
            'created_at' => $createdAt
        ]);
        $id = (int)$pdo->lastInsertId();
        $createdEmployeeIds[] = $id;
        return $id;
    };

    // Employee 1: New hire (10 days ago), no training -> approaching_due (<30 days grace period)
    $empNewGraceId = $createFixtureEmployee(
        'Grace', 'Onboarding',
        date('Y-m-d', strtotime('-10 days')),
        null, null, 'pending'
    );

    // Employee 2: New hire (45 days ago), no training -> overdue (>30 days violated)
    $empNewOverdueId = $createFixtureEmployee(
        'Overdue', 'Newbie',
        date('Y-m-d', strtotime('-45 days')),
        null, null, 'pending'
    );

    // Employee 3: Active trained, refresher due in 15 days -> approaching_due
    $empDueSoonId = $createFixtureEmployee(
        'Alice', 'Approaching',
        date('Y-m-d', strtotime('-350 days')),
        date('Y-m-d', strtotime('-350 days')),
        date('Y-m-d', strtotime('+15 days')),
        'compliant'
    );

    // Employee 4: Active trained, refresher due 10 days ago -> overdue
    $empRefresherOverdueId = $createFixtureEmployee(
        'Bob', 'Expired',
        date('Y-m-d', strtotime('-400 days')),
        date('Y-m-d', strtotime('-400 days')),
        date('Y-m-d', strtotime('-10 days')),
        'compliant'
    );

    // Employee 5: Active trained, refresher due in 200 days -> compliant
    $empCompliantId = $createFixtureEmployee(
        'Charlie', 'Compliant',
        date('Y-m-d', strtotime('-165 days')),
        date('Y-m-d', strtotime('-165 days')),
        date('Y-m-d', strtotime('+200 days')),
        'compliant'
    );

    // Fetch and test evaluation
    $staffList = $service->listStaff();
    $staffMap = [];
    foreach ($staffList as $s) {
        $staffMap[$s['id']] = $s;
    }

    report(isset($staffMap[$empNewGraceId]), "Fixture new-hire employee retrieved in listStaff()");
    report($staffMap[$empNewGraceId]['evaluated_status'] === 'approaching_due', "New hire within 30-day onboarding evaluated as 'approaching_due' (Grace: {$staffMap[$empNewGraceId]['days_remaining']} days left)");

    report(isset($staffMap[$empNewOverdueId]), "Fixture overdue new-hire retrieved in listStaff()");
    report($staffMap[$empNewOverdueId]['evaluated_status'] === 'overdue', "New hire past 30 days without training evaluated as 'overdue'");

    report(isset($staffMap[$empDueSoonId]), "Fixture approaching refresher employee retrieved in listStaff()");
    report($staffMap[$empDueSoonId]['evaluated_status'] === 'approaching_due', "Annual refresher due within 30 days evaluated as 'approaching_due' ({$staffMap[$empDueSoonId]['days_remaining']} days remaining)");

    report(isset($staffMap[$empRefresherOverdueId]), "Fixture expired refresher employee retrieved in listStaff()");
    report($staffMap[$empRefresherOverdueId]['evaluated_status'] === 'overdue', "Annual refresher past due date evaluated as 'overdue'");

    report(isset($staffMap[$empCompliantId]), "Fixture compliant employee retrieved in listStaff()");
    report($staffMap[$empCompliantId]['evaluated_status'] === 'compliant', "Current certification with >30 days remaining evaluated as 'compliant'");

    // Test filter by status
    $filteredCompliant = $service->listStaff(['status' => 'compliant']);
    $filteredCompliantIds = array_column($filteredCompliant, 'id');
    report(in_array($empCompliantId, $filteredCompliantIds, true), "Filtered list with status='compliant' contains compliant employee");
    report(!in_array($empRefresherOverdueId, $filteredCompliantIds, true), "Filtered list with status='compliant' excludes overdue employee");

    // ------------------------------------------------------------------
    // 3. Testing Training Event Recording & Pass Threshold (§ 164.308(a)(5))
    // ------------------------------------------------------------------
    echo "\n3. Testing Training Event Recording & Pass Threshold (&ge;80%)...\n";

    // 3a. Validation error checks
    $invalidTrainingCaught = false;
    try {
        $service->recordTraining(['employee_id' => 0], 1);
    } catch (\InvalidArgumentException $e) {
        $invalidTrainingCaught = true;
        report(true, "Missing employee_id correctly rejected: " . $e->getMessage());
    }
    if (!$invalidTrainingCaught) {
        report(false, "Invalid training with missing employee_id was NOT rejected!");
    }

    $invalidTypeCaught = false;
    try {
        $service->recordTraining(['employee_id' => $empNewGraceId, 'training_type' => 'unsupported_type'], 1);
    } catch (\InvalidArgumentException $e) {
        $invalidTypeCaught = true;
        report(true, "Invalid training_type correctly rejected: " . $e->getMessage());
    }
    if (!$invalidTypeCaught) {
        report(false, "Invalid training_type was NOT rejected!");
    }

    // 3b. Failing score test (<80%)
    $failingRecord = $service->recordTraining([
        'employee_id' => $empNewGraceId,
        'training_type' => 'initial_orientation',
        'curriculum_title' => 'HIPAA Security & Privacy Initial Orientation 2026',
        'completion_date' => date('Y-m-d'),
        'score_percent' => 65.0,
        'passing_threshold' => 80.0,
        'delivery_method' => 'lms_elearning',
        'verification_notes' => 'Attempt 1 failed.'
    ], 1);
    $createdTrainingIds[] = $failingRecord['id'];

    report($failingRecord['status'] === 'failed', "Score of 65% marked training status as 'failed'");

    // Verify employee record was NOT marked compliant
    $stmtCheckEmp = $pdo->prepare("SELECT hipaa_training_status FROM `employees` WHERE id = :id");
    $stmtCheckEmp->execute(['id' => $empNewGraceId]);
    $empStatusAfterFail = $stmtCheckEmp->fetchColumn();
    report($empStatusAfterFail !== 'compliant', "Failed training attempt did NOT update employee status to 'compliant'");

    // 3c. Passing score test (>=80%)
    $passingRecord = $service->recordTraining([
        'employee_id' => $empNewGraceId,
        'training_type' => 'initial_orientation',
        'curriculum_title' => 'HIPAA Security & Privacy Initial Orientation 2026 (Retake)',
        'completion_date' => date('Y-m-d'),
        'score_percent' => 96.5,
        'passing_threshold' => 80.0,
        'delivery_method' => 'lms_elearning',
        'trainer_or_proctor' => 'Dr. Robert Compliance, CISA',
        'verification_notes' => 'Passed retake examination with distinction.'
    ], 1);
    $createdTrainingIds[] = $passingRecord['id'];

    report($passingRecord['status'] === 'passed', "Score of 96.5% marked training status as 'passed'");
    report((bool)preg_match('/^CERT-\d{4}-\d{4}$/', $passingRecord['certificate_code']), "Certificate code sequentially generated: " . $passingRecord['certificate_code']);
    
    $expectedExpiration = date('Y-m-d', strtotime('+1 year', strtotime(date('Y-m-d'))));
    report($passingRecord['expiration_date'] === $expectedExpiration, "Certification expiration automatically set to +365 days: " . $passingRecord['expiration_date']);

    // Verify employee profile was synchronized
    $stmtCheckEmp->execute(['id' => $empNewGraceId]);
    $empStatusAfterPass = $stmtCheckEmp->fetchColumn();
    report($empStatusAfterPass === 'compliant', "Passing training successfully synchronized employee status to 'compliant'");

    // 3d. Training history
    $history = $service->getEmployeeTrainingHistory($empNewGraceId);
    report(count($history) === 2, "Employee training history retrieves both attempts (count: " . count($history) . ")");

    // ------------------------------------------------------------------
    // 4. Testing Disciplinary Sanction Logging & Life Cycle (§ 164.308(a)(1)(ii)(C))
    // ------------------------------------------------------------------
    echo "\n4. Testing Disciplinary Sanction Logging (§ 164.308(a)(1)(ii)(C))...\n";

    // 4a. Validation error checks
    $invalidSanctionCaught = false;
    try {
        $service->recordSanction(['employee_id' => 0], 1);
    } catch (\InvalidArgumentException $e) {
        $invalidSanctionCaught = true;
        report(true, "Missing employee_id on sanction correctly rejected: " . $e->getMessage());
    }
    if (!$invalidSanctionCaught) {
        report(false, "Sanction with missing employee_id was NOT rejected!");
    }

    $invalidCategoryCaught = false;
    try {
        $service->recordSanction([
            'employee_id' => $empCompliantId,
            'violation_category' => 'non_existent_category'
        ], 1);
    } catch (\InvalidArgumentException $e) {
        $invalidCategoryCaught = true;
        report(true, "Invalid violation_category correctly rejected: " . $e->getMessage());
    }
    if (!$invalidCategoryCaught) {
        report(false, "Invalid violation_category was NOT rejected!");
    }

    $missingFindingsCaught = false;
    try {
        $service->recordSanction([
            'employee_id' => $empCompliantId,
            'violation_category' => 'unauthorized_phi_snooping',
            'severity_level' => 'moderate',
            'disciplinary_action' => 'written_reprimand',
            'investigation_findings' => ''
        ], 1);
    } catch (\InvalidArgumentException $e) {
        $missingFindingsCaught = true;
        report(true, "Missing investigation findings narrative correctly rejected: " . $e->getMessage());
    }
    if (!$missingFindingsCaught) {
        report(false, "Sanction without investigation findings was NOT rejected!");
    }

    // 4b. Record valid formal sanction
    $sanctionRecord = $service->recordSanction([
        'employee_id' => $empCompliantId,
        'violation_date' => date('Y-m-d', strtotime('-5 days')),
        'reported_date' => date('Y-m-d', strtotime('-3 days')),
        'violation_category' => 'unauthorized_phi_snooping',
        'severity_level' => 'serious',
        'disciplinary_action' => 'written_reprimand',
        'investigation_findings' => 'Workforce member accessed electronic chart of high-profile acquaintance without clinical assignment or treatment relationship.',
        'disciplinary_rationale' => 'Clear violation of minimum necessary rules and hospital chart privacy directive. First-time offense warranting formal Level 2 Written Reprimand and mandatory retraining.',
        'sanctioning_officer_name' => 'Marcus Vance, JD, CHPC',
        'sanctioning_officer_role' => 'Chief Privacy Officer',
        'signoff_date' => date('Y-m-d'),
        'remediation_required' => 'mandatory_retraining',
        'remediation_deadline' => date('Y-m-d', strtotime('+14 days'))
    ], 1);
    $createdSanctionIds[] = $sanctionRecord['id'];

    report(!empty($sanctionRecord['id']), "Disciplinary sanction recorded with ID: " . $sanctionRecord['id']);
    report((bool)preg_match('/^SAN-\d{4}-\d{4}$/', $sanctionRecord['sanction_code']), "Sanction code sequentially generated: " . $sanctionRecord['sanction_code']);
    report($sanctionRecord['status'] === 'sanction_imposed', "Sanction status initialized to 'sanction_imposed'");

    // 4c. Update sanction (remediation completion & closure)
    $updatedSanction = $service->updateSanction($sanctionRecord['id'], [
        'status' => 'closed_remediated',
        'remediation_completed_date' => date('Y-m-d'),
        'appeal_status' => 'appeal_denied',
        'notes' => 'Workforce member completed 2-hour remedial chart access course with 100% score.'
    ], 1);

    report($updatedSanction['status'] === 'closed_remediated', "Sanction successfully updated to 'closed_remediated'");
    report($updatedSanction['appeal_status'] === 'appeal_denied', "Appeal status updated to 'appeal_denied'");

    // 4d. Disciplinary sanction dossier
    $dossier = $service->getSanctionDossier($sanctionRecord['id'], 1);
    report(isset($dossier['facility_name']) && !empty($dossier['facility_name']), "Sanction dossier includes facility name");
    report(str_contains($dossier['statutory_citation'], '45 CFR § 164.308(a)(1)(ii)(C)'), "Sanction dossier cites statutory authority 45 CFR § 164.308(a)(1)(ii)(C)");
    report($dossier['sanction']['sanction_code'] === $sanctionRecord['sanction_code'], "Sanction dossier contains full sanction details");

    // ------------------------------------------------------------------
    // 5. Testing Immediate Termination & Account Lockout Enforcement
    // ------------------------------------------------------------------
    echo "\n5. Testing Immediate Termination & User Account Lockout Enforcement...\n";

    // Create test user and linked employee
    $testUsername = 'sanc_lock_' . bin2hex(random_bytes(3));
    $stmtCreateUser = $pdo->prepare("
        INSERT INTO `users` (username, password, role_id, is_locked, created_at)
        VALUES (:uname, 'dummy_hash', 2, 0, NOW())
    ");
    $stmtCreateUser->execute([
        'uname' => $testUsername
    ]);
    $testUserId = (int)$pdo->lastInsertId();
    $createdUserIds[] = $testUserId;

    // Create employee linked to this user
    $empTerminatedId = $createFixtureEmployee(
        'Terminated', 'Staffer',
        date('Y-m-d', strtotime('-100 days')),
        date('Y-m-d', strtotime('-100 days')),
        date('Y-m-d', strtotime('+265 days')),
        'compliant'
    );
    // Link employee to user
    $pdo->prepare("UPDATE `employees` SET `user_id` = :uid WHERE id = :eid")->execute([
        'uid' => $testUserId,
        'eid' => $empTerminatedId
    ]);

    // Verify user is currently unlocked
    $stmtCheckUser = $pdo->prepare("SELECT is_locked, locked_until FROM `users` WHERE id = :uid");
    $stmtCheckUser->execute(['uid' => $testUserId]);
    $userBefore = $stmtCheckUser->fetch(PDO::FETCH_ASSOC);
    report($userBefore['is_locked'] == 0, "Test user account starts in unlocked state (is_locked = 0)");

    // Record sanction with action tier: immediate_termination
    $termSanction = $service->recordSanction([
        'employee_id' => $empTerminatedId,
        'violation_date' => date('Y-m-d'),
        'reported_date' => date('Y-m-d'),
        'violation_category' => 'willful_neglect_data_theft',
        'severity_level' => 'critical_gross_misconduct',
        'disciplinary_action' => 'immediate_termination',
        'investigation_findings' => 'Workforce member captured unauthorized photographs of patient records on personal smartphone and transmitted via personal messaging app.',
        'disciplinary_rationale' => 'Gross misconduct and deliberate exfiltration of ePHI. Immediate termination of employment and indefinite revocation of all hospital information system credentials.',
        'sanctioning_officer_name' => 'Elena Rostova, CHSO',
        'sanctioning_officer_role' => 'Chief Information Security Officer',
        'signoff_date' => date('Y-m-d')
    ], 1);
    $createdSanctionIds[] = $termSanction['id'];

    // Verify user account was automatically locked
    $stmtCheckUser->execute(['uid' => $testUserId]);
    $userAfter = $stmtCheckUser->fetch(PDO::FETCH_ASSOC);
    report($userAfter['is_locked'] == 1, "Immediate termination automatically triggered user account lock (is_locked = 1)");
    report(strtotime($userAfter['locked_until']) > strtotime('+50 years'), "Account locked indefinitely until: " . $userAfter['locked_until']);

    // ------------------------------------------------------------------
    // 6. Testing Telemetry & KPI Calculations
    // ------------------------------------------------------------------
    echo "\n6. Testing Governance Telemetry & KPI Calculations...\n";

    $stats = $service->getStats();
    report($stats['total_workforce'] >= 5, "Stats reflect total workforce headcount: " . $stats['total_workforce']);
    report($stats['compliant_count'] >= 1, "Stats reflect compliant staff count: " . $stats['compliant_count']);
    report($stats['approaching_count'] >= 1, "Stats reflect staff approaching deadline: " . $stats['approaching_count']);
    report($stats['overdue_count'] >= 1, "Stats reflect overdue staff count: " . $stats['overdue_count']);
    report($stats['total_sanctions'] >= 2, "Stats reflect total sanctions recorded: " . $stats['total_sanctions']);
    report($stats['severe_sanctions'] >= 1, "Stats reflect severe/termination sanctions: " . $stats['severe_sanctions']);
    report($stats['compliance_rate'] >= 0.0 && $stats['compliance_rate'] <= 100.0, "Compliance rate valid percentage: " . $stats['compliance_rate'] . "%");

    // ------------------------------------------------------------------
    // 7. Testing Regulatory RFC 4180 CSV Compliance Exports
    // ------------------------------------------------------------------
    echo "\n7. Testing Regulatory RFC 4180 CSV Compliance Exports...\n";

    // 7a. Trainings CSV
    $trainingsCsv = $service->generateTrainingsCsv(1);
    report(str_contains($trainingsCsv, '# STATUTORY COMPLIANCE REGISTRY: 45 CFR § 164.308(a)(5) - Security Awareness and Training'), "Trainings CSV includes statutory header citing 45 CFR § 164.308(a)(5)");
    report(str_contains($trainingsCsv, 'Staff Full Name') && str_contains($trainingsCsv, 'Evaluated Compliance Status'), "Trainings CSV includes required columns");
    report(str_contains($trainingsCsv, 'Grace Onboarding'), "Trainings CSV includes fixture employee name");
    report(str_contains($trainingsCsv, $passingRecord['certificate_code']), "Trainings CSV includes generated certificate code");

    // 7b. Sanctions CSV
    $sanctionsCsv = $service->generateSanctionsCsv(1);
    report(str_contains($sanctionsCsv, '# STATUTORY COMPLIANCE REGISTRY: 45 CFR § 164.308(a)(1)(ii)(C) - Workforce Sanction Policy'), "Sanctions CSV includes statutory header citing 45 CFR § 164.308(a)(1)(ii)(C)");
    report(str_contains($sanctionsCsv, 'Sanction Reference Code') && str_contains($sanctionsCsv, 'Disciplinary Action Imposed'), "Sanctions CSV includes required columns");
    report(str_contains($sanctionsCsv, $sanctionRecord['sanction_code']), "Sanctions CSV includes generated sanction code");
    report(str_contains($sanctionsCsv, 'unauthorized_phi_snooping'), "Sanctions CSV reflects violation category");
    report(str_contains($sanctionsCsv, 'IMMEDIATE TERMINATION') || stripos($sanctionsCsv, 'immediate_termination') !== false, "Sanctions CSV reflects immediate termination action");

    // ------------------------------------------------------------------
    // 8. Testing HMAC-SHA-256 Chained Audit Trail
    // ------------------------------------------------------------------
    echo "\n8. Testing HMAC-SHA-256 Chained Audit Trail & Cryptographic Chain...\n";

    $stmtAudit = $pdo->prepare("SELECT * FROM `hipaa_audit_logs` WHERE `event_category` = :cat ORDER BY `id` ASC");
    $stmtAudit->execute(['cat' => AuditLogger::CATEGORY_WORKFORCE]);
    $auditEntries = $stmtAudit->fetchAll(PDO::FETCH_ASSOC);

    report(count($auditEntries) > 0, "Audit logs found under event_category 'WORKFORCE_GOVERNANCE'");

    $auditActions = array_column($auditEntries, 'action');
    report(in_array(AuditLogger::ACTION_TRAINING_RECORDED, $auditActions, true), "Logged action " . AuditLogger::ACTION_TRAINING_RECORDED);
    report(in_array(AuditLogger::ACTION_SANCTION_RECORDED, $auditActions, true), "Logged action " . AuditLogger::ACTION_SANCTION_RECORDED);
    report(in_array(AuditLogger::ACTION_SANCTION_UPDATED, $auditActions, true), "Logged action " . AuditLogger::ACTION_SANCTION_UPDATED);
    report(in_array(AuditLogger::ACTION_SANCTION_DOSSIER_PRINT, $auditActions, true), "Logged action " . AuditLogger::ACTION_SANCTION_DOSSIER_PRINT);
    report(in_array(AuditLogger::ACTION_WORKFORCE_EXPORT_CSV, $auditActions, true), "Logged action " . AuditLogger::ACTION_WORKFORCE_EXPORT_CSV);

    // Verify entire HMAC-SHA-256 hash chain
    $integrity = AuditLogger::verifyIntegrity();
    report($integrity['valid'] === true, "Complete HIPAA audit sequential HMAC-SHA-256 hash chain is VALID (0 tampering detected)");

} catch (\Throwable $e) {
    $failed++;
    echo "\n[EXCEPTION] Fatal error during test execution:\n";
    echo $e->getMessage() . "\n" . $e->getTraceAsString() . "\n";
} finally {
    // Cleanup generated fixtures
    if (!empty($createdSanctionIds)) {
        $inSanctions = implode(',', array_map('intval', $createdSanctionIds));
        $pdo->exec("DELETE FROM `hipaa_workforce_sanctions` WHERE `id` IN ({$inSanctions})");
    }
    if (!empty($createdTrainingIds)) {
        $inTrainings = implode(',', array_map('intval', $createdTrainingIds));
        $pdo->exec("DELETE FROM `hipaa_workforce_trainings` WHERE `id` IN ({$inTrainings})");
    }
    if (!empty($createdEmployeeIds)) {
        $inEmployees = implode(',', array_map('intval', $createdEmployeeIds));
        $pdo->exec("DELETE FROM `employees` WHERE `id` IN ({$inEmployees})");
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
