<?php

declare(strict_types=1);

namespace App\Modules\Workforce\Services;

use App\Core\Database;
use App\Core\AuditLogger;
use App\Modules\Workforce\Models\WorkforceTraining;
use App\Modules\Workforce\Models\WorkforceSanction;
use PDO;
use RuntimeException;
use InvalidArgumentException;

class WorkforceService
{
    /**
     * Get aggregate telemetry metrics for workforce HIPAA training and disciplinary sanctions.
     */
    public function getStats(): array
    {
        $pdo = Database::getInstance()->getConnection();

        // Total active workforce members
        $stmtEmp = $pdo->query("SELECT COUNT(*) FROM `employees` WHERE `deleted_at` IS NULL");
        $totalWorkforce = (int)$stmtEmp->fetchColumn();

        // Calculate compliance counts based on live evaluation
        $stmtAll = $pdo->query("
            SELECT id, created_at, hipaa_initial_training_date, hipaa_last_refresher_date, hipaa_next_refresher_due, hipaa_training_status
            FROM `employees`
            WHERE `deleted_at` IS NULL
        ");
        $staff = $stmtAll->fetchAll(PDO::FETCH_ASSOC);

        $compliantCount = 0;
        $approachingCount = 0;
        $overdueCount = 0;
        $exemptCount = 0;

        $today = date('Y-m-d');
        $approachingThreshold = date('Y-m-d', strtotime('+30 days'));

        foreach ($staff as $emp) {
            $status = $this->evaluateStaffStatus($emp, $today, $approachingThreshold);
            if ($status === 'compliant') {
                $compliantCount++;
            } elseif ($status === 'approaching_due') {
                $approachingCount++;
            } elseif ($status === 'exempt') {
                $exemptCount++;
            } else {
                $overdueCount++;
            }
        }

        $complianceRate = $totalWorkforce > 0
            ? round(($compliantCount / $totalWorkforce) * 100, 1)
            : 100.0;

        // Disciplinary Sanctions stats
        $stmtSanc = $pdo->query("SELECT COUNT(*) FROM `hipaa_workforce_sanctions`");
        $totalSanctions = (int)$stmtSanc->fetchColumn();

        $stmtSevere = $pdo->query("
            SELECT COUNT(*) FROM `hipaa_workforce_sanctions`
            WHERE `disciplinary_action` IN ('suspension_without_pay', 'immediate_termination', 'credential_revocation_referral')
               OR `severity_level` IN ('serious', 'critical_gross_misconduct')
        ");
        $severeSanctions = (int)$stmtSevere->fetchColumn();

        $stmtActive = $pdo->query("
            SELECT COUNT(*) FROM `hipaa_workforce_sanctions`
            WHERE `status` IN ('under_investigation', 'sanction_imposed', 'remediation_active')
        ");
        $activeSanctions = (int)$stmtActive->fetchColumn();

        return [
            'total_workforce' => $totalWorkforce,
            'compliant_count' => $compliantCount,
            'approaching_count' => $approachingCount,
            'overdue_count' => $overdueCount,
            'exempt_count' => $exemptCount,
            'compliance_rate' => $complianceRate,
            'total_sanctions' => $totalSanctions,
            'severe_sanctions' => $severeSanctions,
            'active_sanctions' => $activeSanctions,
            'evaluation_date' => $today
        ];
    }

    /**
     * List all staff members with their current HIPAA training compliance status.
     */
    public function listStaff(array $filters = []): array
    {
        $pdo = Database::getInstance()->getConnection();

        $sql = "
            SELECT 
                e.id,
                e.user_id,
                e.employee_no,
                e.first_name,
                e.middle_name,
                e.last_name,
                e.suffix,
                e.email,
                e.phone,
                e.department_id,
                e.created_at AS hire_date,
                e.hipaa_initial_training_date,
                e.hipaa_last_refresher_date,
                e.hipaa_next_refresher_due,
                e.hipaa_training_status,
                e.hipaa_training_score,
                e.hipaa_cert_ref,
                e.hipaa_curriculum_name,
                u.username,
                r.name AS role_name,
                d.name AS department_name
            FROM `employees` e
            LEFT JOIN `users` u ON u.id = e.user_id
            LEFT JOIN `roles` r ON r.id = u.role_id
            LEFT JOIN `departments` d ON d.id = e.department_id
            WHERE e.deleted_at IS NULL
        ";

        $params = [];

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $sql .= " AND (
                e.first_name LIKE :search1 OR
                e.last_name LIKE :search2 OR
                e.employee_no LIKE :search3 OR
                u.username LIKE :search4 OR
                e.email LIKE :search5
            )";
            $params['search1'] = $search;
            $params['search2'] = $search;
            $params['search3'] = $search;
            $params['search4'] = $search;
            $params['search5'] = $search;
        }

        if (!empty($filters['department_id'])) {
            $sql .= " AND e.department_id = :dept";
            $params['dept'] = (int)$filters['department_id'];
        }

        $sql .= " ORDER BY e.last_name ASC, e.first_name ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $today = date('Y-m-d');
        $approachingThreshold = date('Y-m-d', strtotime('+30 days'));

        $result = [];
        foreach ($rows as $row) {
            $evaluatedStatus = $this->evaluateStaffStatus($row, $today, $approachingThreshold);
            $row['evaluated_status'] = $evaluatedStatus;

            // Compute days remaining or overdue
            if (!empty($row['hipaa_next_refresher_due'])) {
                $dueTime = strtotime($row['hipaa_next_refresher_due']);
                $diffDays = (int)ceil(($dueTime - strtotime($today)) / 86400);
                $row['days_remaining'] = $diffDays;
            } elseif (!empty($row['hire_date'])) {
                // Initial training 30-day clock from hire
                $hireTime = strtotime($row['hire_date']);
                $initialDue = strtotime('+30 days', $hireTime);
                $diffDays = (int)ceil(($initialDue - strtotime($today)) / 86400);
                $row['days_remaining'] = $diffDays;
                $row['initial_training_deadline'] = date('Y-m-d', $initialDue);
            } else {
                $row['days_remaining'] = -999;
            }

            // Full staff name
            $row['full_name'] = trim(implode(' ', array_filter([
                $row['first_name'],
                $row['middle_name'],
                $row['last_name'],
                $row['suffix']
            ])));

            // Apply status filter if provided
            if (!empty($filters['status']) && $filters['status'] !== 'all') {
                if ($evaluatedStatus !== $filters['status']) {
                    continue;
                }
            }

            $result[] = $row;
        }

        return $result;
    }

    /**
     * Record a completed HIPAA training event for a workforce member per 45 CFR § 164.308(a)(5).
     */
    public function recordTraining(array $data, ?int $userId = null): array
    {
        $employeeId = (int)($data['employee_id'] ?? 0);
        if ($employeeId <= 0) {
            throw new InvalidArgumentException("Workforce member (employee_id) is required.");
        }

        $pdo = Database::getInstance()->getConnection();

        // Verify employee exists
        $stmtEmp = $pdo->prepare("SELECT id, user_id, first_name, last_name, employee_no, hipaa_initial_training_date FROM `employees` WHERE id = :id AND deleted_at IS NULL");
        $stmtEmp->execute(['id' => $employeeId]);
        $emp = $stmtEmp->fetch(PDO::FETCH_ASSOC);
        if (!$emp) {
            throw new RuntimeException("Workforce member #{$employeeId} not found.");
        }

        $trainingType = $data['training_type'] ?? 'annual_refresher';
        $validTypes = ['initial_orientation', 'annual_refresher', 'remedial_post_incident', 'specialized_role_based'];
        if (!in_array($trainingType, $validTypes, true)) {
            throw new InvalidArgumentException("Invalid training type: {$trainingType}.");
        }

        $curriculum = trim($data['curriculum_title'] ?? 'HIPAA Security & Privacy Omnibus Baseline 2026');
        if (empty($curriculum)) {
            throw new InvalidArgumentException("Curriculum title is required.");
        }

        $completionDate = $data['completion_date'] ?? date('Y-m-d');
        if (!strtotime($completionDate)) {
            throw new InvalidArgumentException("Valid completion date is required.");
        }

        // Annual refresher expires after 365 calendar days
        $expirationDate = $data['expiration_date'] ?? date('Y-m-d', strtotime('+1 year', strtotime($completionDate)));

        $score = isset($data['score_percent']) ? (float)$data['score_percent'] : 95.0;
        $threshold = isset($data['passing_threshold']) ? (float)$data['passing_threshold'] : 80.0;
        $passed = $score >= $threshold;
        $status = $passed ? 'passed' : 'failed';

        // Auto-generate unique certificate code: CERT-YYYY-XXXX
        $year = date('Y', strtotime($completionDate));
        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM `hipaa_workforce_trainings` WHERE `certificate_code` LIKE :prefix");
        $stmtCount->execute(['prefix' => "CERT-{$year}-%"]);
        $count = (int)$stmtCount->fetchColumn() + 1;
        $certCode = sprintf("CERT-%s-%04d", $year, $count);

        $deliveryMethod = $data['delivery_method'] ?? 'lms_elearning';
        $trainer = !empty($data['trainer_or_proctor']) ? trim($data['trainer_or_proctor']) : 'USIntellix Compliance Academy';
        $notes = !empty($data['verification_notes']) ? trim($data['verification_notes']) : "Verified compliance with 45 CFR § 164.308(a)(5). Score: {$score}% (Pass threshold: {$threshold}%).";

        // Insert into hipaa_workforce_trainings
        $trainingModel = new WorkforceTraining();
        $trainingId = $trainingModel->insert([
            'employee_id' => $employeeId,
            'user_id' => $emp['user_id'],
            'training_type' => $trainingType,
            'curriculum_title' => $curriculum,
            'completion_date' => $completionDate,
            'expiration_date' => $expirationDate,
            'score_percent' => $score,
            'passing_threshold' => $threshold,
            'status' => $status,
            'certificate_code' => $certCode,
            'delivery_method' => $deliveryMethod,
            'trainer_or_proctor' => $trainer,
            'verification_officer_id' => $userId,
            'verification_notes' => $notes,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        // If passed, update employee master record
        if ($passed) {
            $isInitial = empty($emp['hipaa_initial_training_date']) || $trainingType === 'initial_orientation';
            $initialDate = $isInitial ? $completionDate : $emp['hipaa_initial_training_date'];

            $stmtUpdateEmp = $pdo->prepare("
                UPDATE `employees`
                SET 
                    `hipaa_initial_training_date` = :initial_date,
                    `hipaa_last_refresher_date` = :completion_date,
                    `hipaa_next_refresher_due` = :expiration_date,
                    `hipaa_training_status` = 'compliant',
                    `hipaa_training_score` = :score,
                    `hipaa_cert_ref` = :cert,
                    `hipaa_curriculum_name` = :curriculum
                WHERE id = :emp_id
            ");
            $stmtUpdateEmp->execute([
                'initial_date' => $initialDate,
                'completion_date' => $completionDate,
                'expiration_date' => $expirationDate,
                'score' => $score,
                'cert' => $certCode,
                'curriculum' => $curriculum,
                'emp_id' => $employeeId
            ]);
        }

        // Audit Logging
        $empName = "{$emp['first_name']} {$emp['last_name']} ({$emp['employee_no']})";
        AuditLogger::log(
            AuditLogger::CATEGORY_WORKFORCE,
            AuditLogger::ACTION_TRAINING_RECORDED,
            "Recorded {$trainingType} for workforce member {$empName}: '{$curriculum}' ({$score}%, Code: {$certCode}, Status: {$status}) per 45 CFR § 164.308(a)(5)",
            null,
            $userId,
            'admin'
        );

        return $this->getTrainingById((int)$trainingId);
    }

    /**
     * Get training event by ID.
     */
    public function getTrainingById(int $id): array
    {
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("
            SELECT 
                t.*,
                e.first_name,
                e.last_name,
                e.employee_no,
                e.email,
                r.name AS role_name,
                d.name AS department_name
            FROM `hipaa_workforce_trainings` t
            JOIN `employees` e ON e.id = t.employee_id
            LEFT JOIN `users` u ON u.id = e.user_id
            LEFT JOIN `roles` r ON r.id = u.role_id
            LEFT JOIN `departments` d ON d.id = e.department_id
            WHERE t.id = :id
        ");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            throw new RuntimeException("Training record #{$id} not found.");
        }

        $row['full_name'] = trim("{$row['first_name']} {$row['last_name']}");
        return $row;
    }

    /**
     * Get training history for a specific employee.
     */
    public function getEmployeeTrainingHistory(int $employeeId): array
    {
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("
            SELECT * FROM `hipaa_workforce_trainings`
            WHERE `employee_id` = :emp_id
            ORDER BY `completion_date` DESC, `id` DESC
        ");
        $stmt->execute(['emp_id' => $employeeId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * List all workforce disciplinary sanctions per 45 CFR § 164.308(a)(1)(ii)(C).
     */
    public function listSanctions(array $filters = []): array
    {
        $pdo = Database::getInstance()->getConnection();

        $sql = "
            SELECT 
                s.*,
                e.first_name,
                e.last_name,
                e.employee_no,
                e.email,
                u.username,
                r.name AS role_name,
                d.name AS department_name,
                inc.incident_number,
                inc.incident_title
            FROM `hipaa_workforce_sanctions` s
            JOIN `employees` e ON e.id = s.employee_id
            LEFT JOIN `users` u ON u.id = e.user_id
            LEFT JOIN `roles` r ON r.id = u.role_id
            LEFT JOIN `departments` d ON d.id = e.department_id
            LEFT JOIN `hipaa_security_incidents` inc ON inc.id = s.incident_id
            WHERE 1=1
        ";

        $params = [];

        if (!empty($filters['search'])) {
            $search = '%' . trim($filters['search']) . '%';
            $sql .= " AND (
                s.sanction_code LIKE :s1 OR
                e.first_name LIKE :s2 OR
                e.last_name LIKE :s3 OR
                e.employee_no LIKE :s4 OR
                s.sanctioning_officer_name LIKE :s5 OR
                s.investigation_findings LIKE :s6
            )";
            $params['s1'] = $search;
            $params['s2'] = $search;
            $params['s3'] = $search;
            $params['s4'] = $search;
            $params['s5'] = $search;
            $params['s6'] = $search;
        }

        if (!empty($filters['category']) && $filters['category'] !== 'all') {
            $sql .= " AND s.violation_category = :cat";
            $params['cat'] = $filters['category'];
        }

        if (!empty($filters['severity']) && $filters['severity'] !== 'all') {
            $sql .= " AND s.severity_level = :sev";
            $params['sev'] = $filters['severity'];
        }

        if (!empty($filters['status']) && $filters['status'] !== 'all') {
            $sql .= " AND s.status = :status";
            $params['status'] = $filters['status'];
        }

        if (!empty($filters['employee_id'])) {
            $sql .= " AND s.employee_id = :emp_id";
            $params['emp_id'] = (int)$filters['employee_id'];
        }

        $sql .= " ORDER BY s.violation_date DESC, s.id DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($rows as &$row) {
            $row['full_name'] = trim("{$row['first_name']} {$row['last_name']}");
        }

        return $rows;
    }

    /**
     * Record a formal disciplinary sanction against a workforce member per 45 CFR § 164.308(a)(1)(ii)(C).
     */
    public function recordSanction(array $data, ?int $userId = null): array
    {
        $employeeId = (int)($data['employee_id'] ?? 0);
        if ($employeeId <= 0) {
            throw new InvalidArgumentException("Workforce member (employee_id) is required.");
        }

        $pdo = Database::getInstance()->getConnection();

        // Verify employee exists
        $stmtEmp = $pdo->prepare("SELECT id, user_id, first_name, last_name, employee_no FROM `employees` WHERE id = :id AND deleted_at IS NULL");
        $stmtEmp->execute(['id' => $employeeId]);
        $emp = $stmtEmp->fetch(PDO::FETCH_ASSOC);
        if (!$emp) {
            throw new RuntimeException("Workforce member #{$employeeId} not found.");
        }

        $violationDate = $data['violation_date'] ?? date('Y-m-d');
        $reportedDate = $data['reported_date'] ?? date('Y-m-d');

        $category = $data['violation_category'] ?? '';
        $validCategories = [
            'unauthorized_phi_snooping',
            'improper_phi_disclosure',
            'credential_sharing',
            'unencrypted_device',
            'failure_to_report_incident',
            'phishing_social_engineering',
            'willful_neglect_data_theft',
            'other_policy_breach'
        ];
        if (!in_array($category, $validCategories, true)) {
            throw new InvalidArgumentException("Invalid violation category: {$category}.");
        }

        $severity = $data['severity_level'] ?? 'moderate';
        $validSeverities = ['minor', 'moderate', 'serious', 'critical_gross_misconduct'];
        if (!in_array($severity, $validSeverities, true)) {
            throw new InvalidArgumentException("Invalid severity level: {$severity}.");
        }

        $action = $data['disciplinary_action'] ?? 'written_reprimand';
        $validActions = [
            'verbal_counseling',
            'written_reprimand',
            'suspension_without_pay',
            'immediate_termination',
            'credential_revocation_referral'
        ];
        if (!in_array($action, $validActions, true)) {
            throw new InvalidArgumentException("Invalid disciplinary action: {$action}.");
        }

        $findings = trim($data['investigation_findings'] ?? '');
        if (empty($findings)) {
            throw new InvalidArgumentException("Investigation findings narrative is required for disciplinary audit compliance.");
        }

        $rationale = trim($data['disciplinary_rationale'] ?? '');
        if (empty($rationale)) {
            throw new InvalidArgumentException("Disciplinary rationale is required.");
        }

        $officerName = trim($data['sanctioning_officer_name'] ?? '');
        if (empty($officerName)) {
            throw new InvalidArgumentException("Sanctioning officer name is required.");
        }

        $officerRole = trim($data['sanctioning_officer_role'] ?? 'Privacy & Security Compliance Officer');
        $signoffDate = $data['signoff_date'] ?? date('Y-m-d');

        $effectiveDate = $data['sanction_effective_date'] ?? date('Y-m-d');
        $endDate = !empty($data['sanction_end_date']) ? $data['sanction_end_date'] : null;
        $suspensionDays = isset($data['suspension_days']) ? (int)$data['suspension_days'] : 0;
        $remediation = $data['remediation_required'] ?? 'mandatory_retraining';
        $remediationDeadline = !empty($data['remediation_deadline']) ? $data['remediation_deadline'] : date('Y-m-d', strtotime('+30 days'));
        $incidentId = !empty($data['incident_id']) ? (int)$data['incident_id'] : null;

        // Auto-generate sequential sanction code: SAN-YYYY-XXXX
        $year = date('Y', strtotime($effectiveDate));
        $stmtCount = $pdo->prepare("SELECT COUNT(*) FROM `hipaa_workforce_sanctions` WHERE `sanction_code` LIKE :prefix");
        $stmtCount->execute(['prefix' => "SAN-{$year}-%"]);
        $count = (int)$stmtCount->fetchColumn() + 1;
        $sanctionCode = sprintf("SAN-%s-%04d", $year, $count);

        $sanctionModel = new WorkforceSanction();
        $sanctionId = $sanctionModel->insert([
            'sanction_code' => $sanctionCode,
            'employee_id' => $employeeId,
            'user_id' => $emp['user_id'],
            'incident_id' => $incidentId,
            'violation_date' => $violationDate,
            'reported_date' => $reportedDate,
            'violation_category' => $category,
            'severity_level' => $severity,
            'disciplinary_action' => $action,
            'investigation_findings' => $findings,
            'disciplinary_rationale' => $rationale,
            'sanction_effective_date' => $effectiveDate,
            'sanction_end_date' => $endDate,
            'suspension_days' => $suspensionDays,
            'remediation_required' => $remediation,
            'remediation_deadline' => $remediationDeadline,
            'remediation_completed_date' => null,
            'sanctioning_officer_name' => $officerName,
            'sanctioning_officer_role' => $officerRole,
            'signoff_date' => $signoffDate,
            'appeal_status' => 'none',
            'status' => 'sanction_imposed',
            'notes' => $data['notes'] ?? null,
            'created_at' => date('Y-m-d H:i:s'),
            'created_by' => $userId
        ]);

        // If termination or suspension, enforce security lockout on user account
        if ($action === 'immediate_termination' && !empty($emp['user_id'])) {
            $stmtLock = $pdo->prepare("
                UPDATE `users`
                SET `is_locked` = 1, `locked_until` = '2099-12-31 23:59:59'
                WHERE `id` = :uid
            ");
            $stmtLock->execute(['uid' => $emp['user_id']]);
        }

        // Audit Logging
        $empName = "{$emp['first_name']} {$emp['last_name']} ({$emp['employee_no']})";
        AuditLogger::log(
            AuditLogger::CATEGORY_WORKFORCE,
            AuditLogger::ACTION_SANCTION_RECORDED,
            "Recorded disciplinary sanction {$sanctionCode} against workforce member {$empName}: Action='{$action}', Category='{$category}', Severity='{$severity}', Officer='{$officerName}' per 45 CFR § 164.308(a)(1)(ii)(C)",
            null,
            $userId,
            'admin'
        );

        return $this->getSanctionById((int)$sanctionId);
    }

    /**
     * Get disciplinary sanction by ID.
     */
    public function getSanctionById(int $id): array
    {
        $pdo = Database::getInstance()->getConnection();
        $stmt = $pdo->prepare("
            SELECT 
                s.*,
                e.first_name,
                e.last_name,
                e.employee_no,
                e.email,
                u.username,
                r.name AS role_name,
                d.name AS department_name,
                inc.incident_number,
                inc.incident_title
            FROM `hipaa_workforce_sanctions` s
            JOIN `employees` e ON e.id = s.employee_id
            LEFT JOIN `users` u ON u.id = e.user_id
            LEFT JOIN `roles` r ON r.id = u.role_id
            LEFT JOIN `departments` d ON d.id = e.department_id
            LEFT JOIN `hipaa_security_incidents` inc ON inc.id = s.incident_id
            WHERE s.id = :id
        ");
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$row) {
            throw new RuntimeException("Sanction record #{$id} not found.");
        }

        $row['full_name'] = trim("{$row['first_name']} {$row['last_name']}");
        return $row;
    }

    /**
     * Update disciplinary sanction (remediation completion, appeal status, closure).
     */
    public function updateSanction(int $id, array $data, ?int $userId = null): array
    {
        $sanction = $this->getSanctionById($id);
        $pdo = Database::getInstance()->getConnection();

        $status = $data['status'] ?? $sanction['status'];
        $remediationCompleted = !empty($data['remediation_completed_date']) ? $data['remediation_completed_date'] : $sanction['remediation_completed_date'];
        $appealStatus = $data['appeal_status'] ?? $sanction['appeal_status'];
        $notes = isset($data['notes']) ? trim($data['notes']) : $sanction['notes'];

        $stmt = $pdo->prepare("
            UPDATE `hipaa_workforce_sanctions`
            SET 
                `status` = :status,
                `remediation_completed_date` = :rem_date,
                `appeal_status` = :appeal,
                `notes` = :notes
            WHERE id = :id
        ");
        $stmt->execute([
            'status' => $status,
            'rem_date' => $remediationCompleted,
            'appeal' => $appealStatus,
            'notes' => $notes,
            'id' => $id
        ]);

        AuditLogger::log(
            AuditLogger::CATEGORY_WORKFORCE,
            AuditLogger::ACTION_SANCTION_UPDATED,
            "Updated disciplinary sanction {$sanction['sanction_code']} (Status: {$status}, Appeal: {$appealStatus}) per 45 CFR § 164.308(a)(1)(ii)(C)",
            null,
            $userId,
            'admin'
        );

        return $this->getSanctionById($id);
    }

    /**
     * Generate complete printable audit dossier data for a disciplinary sanction.
     */
    public function getSanctionDossier(int $id, ?int $userId = null): array
    {
        $sanction = $this->getSanctionById($id);

        AuditLogger::log(
            AuditLogger::CATEGORY_WORKFORCE,
            AuditLogger::ACTION_SANCTION_DOSSIER_PRINT,
            "Generated printable OCR compliance audit dossier for sanction {$sanction['sanction_code']}",
            null,
            $userId,
            'admin'
        );

        return [
            'facility_name' => 'USIntellix Healthcare System',
            'facility_address' => '1000 Health System Parkway, Suite 500, Medical Plaza',
            'dossier_date' => date('Y-m-d H:i:s'),
            'statutory_citation' => '45 CFR § 164.308(a)(1)(ii)(C) - Sanction Policy',
            'sanction' => $sanction
        ];
    }

    /**
     * Generate RFC 4180 CSV export of workforce training records.
     */
    public function generateTrainingsCsv(?int $userId = null): string
    {
        $staff = $this->listStaff();

        $out = fopen('php://temp', 'r+');
        // Federal Statutory Header
        fputcsv($out, ['# STATUTORY COMPLIANCE REGISTRY: 45 CFR § 164.308(a)(5) - Security Awareness and Training']);
        fputcsv($out, ['# Generated Date: ' . date('Y-m-d H:i:s') . ' UTC | System: USIntellix Healthcare System']);
        fputcsv($out, [
            'Employee ID',
            'Employee No',
            'Staff Full Name',
            'Username',
            'Role',
            'Department',
            'Hire Date',
            'Initial Training Date',
            'Last Refresher Date',
            'Next Refresher Due Date',
            'Days Remaining / Overdue',
            'Evaluated Compliance Status',
            'Training Score (%)',
            'Certificate Reference',
            'Curriculum Name'
        ]);

        foreach ($staff as $s) {
            fputcsv($out, [
                $s['id'],
                $s['employee_no'],
                $s['full_name'],
                $s['username'] ?? 'N/A',
                $s['role_name'] ?? 'N/A',
                $s['department_name'] ?? 'N/A',
                $s['hire_date'] ?? 'N/A',
                $s['hipaa_initial_training_date'] ?? 'PENDING',
                $s['hipaa_last_refresher_date'] ?? 'PENDING',
                $s['hipaa_next_refresher_due'] ?? 'OVERDUE',
                $s['days_remaining'],
                strtoupper($s['evaluated_status']),
                $s['hipaa_training_score'] ?? 'N/A',
                $s['hipaa_cert_ref'] ?? 'N/A',
                $s['hipaa_curriculum_name'] ?? 'N/A'
            ]);
        }

        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);

        AuditLogger::log(
            AuditLogger::CATEGORY_WORKFORCE,
            AuditLogger::ACTION_WORKFORCE_EXPORT_CSV,
            "Exported workforce HIPAA training compliance registry (RFC 4180 CSV) per 45 CFR § 164.308(a)(5)",
            null,
            $userId,
            'admin'
        );

        return $csv ?: '';
    }

    /**
     * Generate RFC 4180 CSV export of workforce disciplinary sanctions.
     */
    public function generateSanctionsCsv(?int $userId = null): string
    {
        $sanctions = $this->listSanctions();

        $out = fopen('php://temp', 'r+');
        // Federal Statutory Header
        fputcsv($out, ['# STATUTORY COMPLIANCE REGISTRY: 45 CFR § 164.308(a)(1)(ii)(C) - Workforce Sanction Policy']);
        fputcsv($out, ['# Generated Date: ' . date('Y-m-d H:i:s') . ' UTC | System: USIntellix Healthcare System']);
        fputcsv($out, [
            'Sanction ID',
            'Sanction Reference Code',
            'Employee No',
            'Staff Full Name',
            'Role',
            'Department',
            'Violation Date',
            'Reported Date',
            'Violation Category',
            'Severity Level',
            'Disciplinary Action Imposed',
            'Sanction Effective Date',
            'Sanction End Date',
            'Suspension Days',
            'Remediation Required',
            'Remediation Deadline',
            'Remediation Completed Date',
            'Sanctioning Officer',
            'Officer Role',
            'Signoff Date',
            'Appeal Status',
            'Lifecycle Status',
            'Linked Incident Number',
            'Investigation Summary'
        ]);

        foreach ($sanctions as $s) {
            fputcsv($out, [
                $s['id'],
                $s['sanction_code'],
                $s['employee_no'],
                $s['full_name'],
                $s['role_name'] ?? 'N/A',
                $s['department_name'] ?? 'N/A',
                $s['violation_date'],
                $s['reported_date'],
                $s['violation_category'],
                strtoupper($s['severity_level']),
                strtoupper(str_replace('_', ' ', $s['disciplinary_action'])),
                $s['sanction_effective_date'],
                $s['sanction_end_date'] ?? 'N/A',
                $s['suspension_days'],
                $s['remediation_required'],
                $s['remediation_deadline'] ?? 'N/A',
                $s['remediation_completed_date'] ?? 'PENDING',
                $s['sanctioning_officer_name'],
                $s['sanctioning_officer_role'],
                $s['signoff_date'],
                strtoupper($s['appeal_status']),
                strtoupper($s['status']),
                $s['incident_number'] ?? 'N/A',
                $s['investigation_findings']
            ]);
        }

        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);

        AuditLogger::log(
            AuditLogger::CATEGORY_WORKFORCE,
            AuditLogger::ACTION_WORKFORCE_EXPORT_CSV,
            "Exported workforce disciplinary sanctions registry (RFC 4180 CSV) per 45 CFR § 164.308(a)(1)(ii)(C)",
            null,
            $userId,
            'admin'
        );

        return $csv ?: '';
    }

    /**
     * Stream RFC 4180 CSV of workforce trainings.
     */
    public function exportTrainingsCsv(?int $userId = null): void
    {
        $csv = $this->generateTrainingsCsv($userId);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="hipaa_workforce_training_registry_' . date('Ymd_His') . '.csv"');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        echo $csv;
        exit;
    }

    /**
     * Stream RFC 4180 CSV of disciplinary sanctions.
     */
    public function exportSanctionsCsv(?int $userId = null): void
    {
        $csv = $this->generateSanctionsCsv($userId);
        header('Content-Type: text/csv; charset=utf-8');
        header('Content-Disposition: attachment; filename="hipaa_workforce_sanctions_registry_' . date('Ymd_His') . '.csv"');
        header('Cache-Control: no-cache, no-store, must-revalidate');
        header('Pragma: no-cache');
        header('Expires: 0');
        echo $csv;
        exit;
    }

    /**
     * Evaluate live compliance status for a staff record.
     */
    private function evaluateStaffStatus(array $emp, string $today, string $approachingThreshold): string
    {
        if (($emp['hipaa_training_status'] ?? '') === 'exempt') {
            return 'exempt';
        }

        // Check if initial training completed
        if (empty($emp['hipaa_initial_training_date'])) {
            // Check hire date window
            if (!empty($emp['created_at']) || !empty($emp['hire_date'])) {
                $hireDate = !empty($emp['hire_date']) ? $emp['hire_date'] : $emp['created_at'];
                $hireTime = strtotime($hireDate);
                $thirtyDaysAfterHire = strtotime('+30 days', $hireTime);

                if (strtotime($today) <= $thirtyDaysAfterHire) {
                    return 'approaching_due'; // New hire within 30-day grace period
                }
            }
            return 'overdue'; // Exceeded 30 days without initial training
        }

        // Initial training completed: check refresher due date
        if (!empty($emp['hipaa_next_refresher_due'])) {
            if ($emp['hipaa_next_refresher_due'] < $today) {
                return 'overdue';
            }
            if ($emp['hipaa_next_refresher_due'] <= $approachingThreshold) {
                return 'approaching_due';
            }
            return 'compliant';
        }

        // Fallback to checking last refresher date
        if (!empty($emp['hipaa_last_refresher_date'])) {
            $oneYearAfter = date('Y-m-d', strtotime('+1 year', strtotime($emp['hipaa_last_refresher_date'])));
            if ($oneYearAfter < $today) {
                return 'overdue';
            }
            if ($oneYearAfter <= $approachingThreshold) {
                return 'approaching_due';
            }
            return 'compliant';
        }

        return 'overdue';
    }
}
