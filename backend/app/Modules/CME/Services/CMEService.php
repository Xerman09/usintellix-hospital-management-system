<?php

namespace App\Modules\CME\Services;

use App\Core\Database;
use PDO;
use RuntimeException;
use Throwable;

class CMEService
{
    /**
     * Atomically generate unique CME Record Code CME-YYYY-XXXX
     */
    public static function generateRecordCode(PDO $pdo): string
    {
        $year = (int)date('Y');
        $stmt = $pdo->prepare("
            INSERT INTO billing_tariff_counters (counter_type, year, last_number)
            VALUES ('CME_RECORD', ?, 1)
            ON DUPLICATE KEY UPDATE last_number = last_number + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'CME_RECORD' AND year = ?");
        $sel->execute([$year]);
        $seq = (int)$sel->fetchColumn();

        return sprintf("CME-%d-%04d", $year, $seq);
    }

    /**
     * List CME / CPD activity records with search, filters, pagination, and KPI metrics
     */
    public function listRecords(array $filters = [], int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();

        $where = ["1=1"];
        $params = [];

        if (!empty($filters['employee_id'])) {
            $where[] = "r.employee_id = ?";
            $params[] = (int)$filters['employee_id'];
        }

        if (!empty($filters['department_id'])) {
            $where[] = "e.department_id = ?";
            $params[] = (int)$filters['department_id'];
        }

        if (!empty($filters['activity_type'])) {
            $where[] = "r.activity_type = ?";
            $params[] = $filters['activity_type'];
        }

        if (!empty($filters['category_type'])) {
            $where[] = "r.category_type = ?";
            $params[] = $filters['category_type'];
        }

        if (!empty($filters['verification_status'])) {
            $where[] = "r.verification_status = ?";
            $params[] = $filters['verification_status'];
        }

        if (!empty($filters['year'])) {
            $where[] = "(r.target_cycle_year = ? OR YEAR(r.activity_date) = ?)";
            $params[] = (int)$filters['year'];
            $params[] = (int)$filters['year'];
        }

        if (!empty($filters['q'])) {
            $term = '%' . trim($filters['q']) . '%';
            $where[] = "(r.activity_title LIKE ? OR r.accrediting_body LIKE ? OR r.certificate_number LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereSql = implode(' AND ', $where);

        $cntStmt = $pdo->prepare("
            SELECT COUNT(*) 
            FROM hr_cme_records r
            INNER JOIN employees e ON r.employee_id = e.id
            WHERE {$whereSql}
        ");
        $cntStmt->execute($params);
        $total = (int)$cntStmt->fetchColumn();

        $offset = ($page - 1) * $perPage;
        $sql = "
            SELECT 
                r.*,
                CONCAT(e.first_name, ' ', e.last_name) AS staff_name,
                e.employee_no,
                e.email AS staff_email,
                d.name AS department_name,
                d.code AS department_code,
                p.specialty
            FROM hr_cme_records r
            INNER JOIN employees e ON r.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN providers p ON p.employee_id = e.id
            WHERE {$whereSql}
            ORDER BY r.activity_date DESC, r.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Overall summary metrics
        $metStmt = $pdo->query("
            SELECT 
                COUNT(*) AS total_activities,
                COALESCE(SUM(credit_units), 0) AS total_credit_units,
                COUNT(DISTINCT employee_id) AS active_participants,
                SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) AS verified_activities,
                SUM(CASE WHEN verification_status = 'pending_verification' THEN 1 ELSE 0 END) AS pending_activities
            FROM hr_cme_records
        ");
        $metrics = $metStmt->fetch(PDO::FETCH_ASSOC);

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'records' => $records,
            'metrics' => $metrics ?: []
        ];
    }

    /**
     * Get Individual Staff CME Profile with Renewal Progress Bar and Quota Target
     */
    public function getStaffCMEProfile(int $employeeId, int $year = 2026): array
    {
        $pdo = Database::connection();

        // 1. Employee Info
        $empStmt = $pdo->prepare("
            SELECT 
                e.id,
                CONCAT(e.first_name, ' ', e.last_name) AS full_name,
                e.employee_no,
                e.email,
                e.phone,
                d.name AS department_name,
                p.specialty
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN providers p ON p.employee_id = e.id
            WHERE e.id = ?
        ");
        $empStmt->execute([$employeeId]);
        $employee = $empStmt->fetch(PDO::FETCH_ASSOC);

        if (!$employee) {
            throw new RuntimeException("Employee #{$employeeId} not found.");
        }

        // 2. Quota Target for the Year
        $qStmt = $pdo->prepare("
            SELECT * FROM hr_cme_quota_targets
            WHERE employee_id = ? AND target_year = ?
            LIMIT 1
        ");
        $qStmt->execute([$employeeId, $year]);
        $quota = $qStmt->fetch(PDO::FETCH_ASSOC);

        // If no quota target exists, create a default baseline target
        if (!$quota) {
            $isDoctor = !empty($employee['specialty']);
            $defaultReq = $isDoctor ? 30.00 : 20.00;
            $defaultLicense = $isDoctor ? "Medical Board Specialty Maintenance" : "Registered Professional Nurse CPD";

            $ins = $pdo->prepare("
                INSERT INTO hr_cme_quota_targets (
                    employee_id, target_year, license_type, required_units, earned_units,
                    cycle_start_date, renewal_due_date, compliance_status, notes, created_at, updated_at
                ) VALUES (
                    ?, ?, ?, ?, 0.00,
                    '2026-01-01', '2026-12-31', 'on_track', 'Auto-created baseline CME cycle', NOW(), NOW()
                )
            ");
            $ins->execute([$employeeId, $year, $defaultLicense, $defaultReq]);
            $quotaId = (int)$pdo->lastInsertId();

            $quota = [
                'id' => $quotaId,
                'employee_id' => $employeeId,
                'target_year' => $year,
                'license_type' => $defaultLicense,
                'required_units' => $defaultReq,
                'earned_units' => 0.00,
                'cycle_start_date' => '2026-01-01',
                'renewal_due_date' => '2026-12-31',
                'compliance_status' => 'on_track',
                'notes' => 'Auto-created baseline CME cycle'
            ];
        }

        // 3. Recalculate Actual Earned Units from Verified Records
        $sumStmt = $pdo->prepare("
            SELECT 
                COALESCE(SUM(credit_units), 0) AS actual_earned,
                COUNT(*) AS total_records,
                SUM(CASE WHEN category_type = 'Category 1 (Formal CME)' THEN credit_units ELSE 0 END) AS cat1_units,
                SUM(CASE WHEN category_type = 'Category 2 (Self-Directed)' THEN credit_units ELSE 0 END) AS cat2_units,
                SUM(CASE WHEN category_type = 'Ethics & Patient Safety' THEN credit_units ELSE 0 END) AS ethics_units,
                SUM(CASE WHEN category_type = 'Infection Control' THEN credit_units ELSE 0 END) AS infection_units,
                SUM(CASE WHEN category_type = 'Pharmacology / Prescribing' THEN credit_units ELSE 0 END) AS pharma_units,
                SUM(CASE WHEN category_type = 'General Clinical' THEN credit_units ELSE 0 END) AS general_units
            FROM hr_cme_records
            WHERE employee_id = ? AND target_cycle_year = ? AND verification_status = 'verified'
        ");
        $sumStmt->execute([$employeeId, $year]);
        $breakdown = $sumStmt->fetch(PDO::FETCH_ASSOC);

        $actualEarned = (float)$breakdown['actual_earned'];
        $required = (float)$quota['required_units'];
        $progressPercent = $required > 0 ? min(100.0, round(($actualEarned / $required) * 100, 1)) : 100.0;

        // Determine Compliance Status
        $complianceStatus = 'on_track';
        if ($actualEarned >= $required) {
            $complianceStatus = 'compliant';
        } elseif ($progressPercent < 50.0) {
            $complianceStatus = 'behind_schedule';
        }

        // Sync quota record if changed
        if ($actualEarned != (float)$quota['earned_units'] || $complianceStatus != $quota['compliance_status']) {
            $updQ = $pdo->prepare("
                UPDATE hr_cme_quota_targets
                SET earned_units = ?, compliance_status = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $updQ->execute([$actualEarned, $complianceStatus, $quota['id']]);
            $quota['earned_units'] = $actualEarned;
            $quota['compliance_status'] = $complianceStatus;
        }

        $quota['progress_percent'] = $progressPercent;
        $quota['remaining_units'] = max(0.0, round($required - $actualEarned, 2));

        // 4. Fetch All Activity Records for this Staff
        $recStmt = $pdo->prepare("
            SELECT * FROM hr_cme_records
            WHERE employee_id = ? AND target_cycle_year = ?
            ORDER BY activity_date DESC
        ");
        $recStmt->execute([$employeeId, $year]);
        $activities = $recStmt->fetchAll(PDO::FETCH_ASSOC);

        return [
            'employee' => $employee,
            'quota' => $quota,
            'breakdown' => $breakdown,
            'activities' => $activities
        ];
    }

    /**
     * Hospital-Wide License Renewal Compliance Overview & Progress Bars
     */
    public function getRenewalComplianceOverview(int $year = 2026): array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT 
                q.*,
                CONCAT(e.first_name, ' ', e.last_name) AS staff_name,
                e.employee_no,
                d.name AS department_name,
                p.specialty,
                DATEDIFF(q.renewal_due_date, CURDATE()) AS days_until_renewal
            FROM hr_cme_quota_targets q
            INNER JOIN employees e ON q.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN providers p ON p.employee_id = e.id
            WHERE q.target_year = ?
            ORDER BY days_until_renewal ASC, q.compliance_status ASC
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$year]);
        $targets = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $compliantCount = 0;
        $onTrackCount = 0;
        $behindCount = 0;
        $criticalCount = 0;
        $totalEarnedAll = 0.0;
        $totalRequiredAll = 0.0;

        foreach ($targets as &$t) {
            $req = (float)$t['required_units'];
            $earned = (float)$t['earned_units'];
            $pct = $req > 0 ? min(100.0, round(($earned / $req) * 100, 1)) : 100.0;
            $t['progress_percent'] = $pct;
            $t['remaining_units'] = max(0.0, round($req - $earned, 2));

            $totalEarnedAll += $earned;
            $totalRequiredAll += $req;

            if ($t['compliance_status'] === 'compliant') $compliantCount++;
            elseif ($t['compliance_status'] === 'on_track') $onTrackCount++;
            elseif ($t['compliance_status'] === 'behind_schedule') $behindCount++;
            elseif ($t['compliance_status'] === 'critical_renewal_risk') $criticalCount++;
        }

        $overallComplianceRate = $totalRequiredAll > 0 ? round(($totalEarnedAll / $totalRequiredAll) * 100, 1) : 100.0;

        return [
            'metrics' => [
                'total_tracked_staff' => count($targets),
                'compliant_count' => $compliantCount,
                'on_track_count' => $onTrackCount,
                'behind_schedule_count' => $behindCount,
                'critical_risk_count' => $criticalCount,
                'overall_compliance_rate' => $overallComplianceRate,
                'total_earned_credits' => round($totalEarnedAll, 2),
                'total_required_credits' => round($totalRequiredAll, 2)
            ],
            'targets' => $targets
        ];
    }

    /**
     * Create or Update CME Activity Record
     */
    public function saveRecord(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $id = !empty($data['id']) ? (int)$data['id'] : null;
            $empId = (int)$data['employee_id'];
            $title = trim($data['activity_title'] ?? '');
            $type = $data['activity_type'] ?? 'symposium';
            $accreditor = trim($data['accrediting_body'] ?? 'ACCME');
            $date = $data['activity_date'] ?? date('Y-m-d');
            $venue = $data['venue'] ?? null;
            $units = (float)($data['credit_units'] ?? 1.0);
            $catType = $data['category_type'] ?? 'Category 1 (Formal CME)';
            $certNo = $data['certificate_number'] ?? null;
            $certFile = $data['certificate_file_name'] ?? null;
            $targetLicense = $data['target_license_type'] ?? null;
            $targetYear = (int)($data['target_cycle_year'] ?? date('Y', strtotime($date)));
            $status = $data['verification_status'] ?? 'verified';
            $notes = $data['notes'] ?? null;

            if (empty($empId) || empty($title)) {
                throw new RuntimeException("Staff selection and Activity Title are required.");
            }

            if ($id) {
                $upd = $pdo->prepare("
                    UPDATE hr_cme_records SET
                        employee_id = ?, activity_title = ?, activity_type = ?, accrediting_body = ?,
                        activity_date = ?, venue = ?, credit_units = ?, category_type = ?,
                        certificate_number = ?, certificate_file_name = ?, verification_status = ?,
                        target_license_type = ?, target_cycle_year = ?, notes = ?, updated_at = NOW()
                    WHERE id = ?
                ");
                $upd->execute([
                    $empId, $title, $type, $accreditor,
                    $date, $venue, $units, $catType,
                    $certNo, $certFile, $status,
                    $targetLicense, $targetYear, $notes, $id
                ]);
                $recordCode = $data['record_code'] ?? "CME-#{$id}";
            } else {
                $recordCode = self::generateRecordCode($pdo);
                $ins = $pdo->prepare("
                    INSERT INTO hr_cme_records (
                        record_code, employee_id, activity_title, activity_type, accrediting_body,
                        activity_date, venue, credit_units, category_type, certificate_number,
                        certificate_file_name, verification_status, target_license_type, target_cycle_year,
                        notes, created_by, created_at, updated_at
                    ) VALUES (
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?, ?,
                        ?, ?, ?, ?,
                        ?, ?, NOW(), NOW()
                    )
                ");
                $ins->execute([
                    $recordCode, $empId, $title, $type, $accreditor,
                    $date, $venue, $units, $catType, $certNo,
                    $certFile, $status, $targetLicense, $targetYear,
                    $notes, $userId
                ]);
                $id = (int)$pdo->lastInsertId();
            }

            // Sync employee quota target
            $this->recomputeQuotaTarget($empId, $targetYear, $pdo);

            $pdo->commit();
            return [
                'id' => $id,
                'record_code' => $recordCode,
                'message' => "CME activity record #{$recordCode} saved successfully."
            ];
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Delete CME Record
     */
    public function deleteRecord(int $id): bool
    {
        $pdo = Database::connection();
        $pdo->beginTransaction();

        try {
            $stmt = $pdo->prepare("SELECT employee_id, target_cycle_year FROM hr_cme_records WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($row) {
                $del = $pdo->prepare("DELETE FROM hr_cme_records WHERE id = ?");
                $del->execute([$id]);
                $this->recomputeQuotaTarget((int)$row['employee_id'], (int)$row['target_cycle_year'], $pdo);
            }

            $pdo->commit();
            return true;
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }
    }

    /**
     * Internal helper to recalculate earned units and compliance status for an employee
     */
    private function recomputeQuotaTarget(int $empId, int $year, PDO $pdo): void
    {
        $sumStmt = $pdo->prepare("
            SELECT COALESCE(SUM(credit_units), 0) FROM hr_cme_records
            WHERE employee_id = ? AND target_cycle_year = ? AND verification_status = 'verified'
        ");
        $sumStmt->execute([$empId, $year]);
        $totalEarned = (float)$sumStmt->fetchColumn();

        $qStmt = $pdo->prepare("SELECT id, required_units FROM hr_cme_quota_targets WHERE employee_id = ? AND target_year = ?");
        $qStmt->execute([$empId, $year]);
        $quota = $qStmt->fetch(PDO::FETCH_ASSOC);

        if ($quota) {
            $required = (float)$quota['required_units'];
            $status = 'on_track';
            if ($totalEarned >= $required) {
                $status = 'compliant';
            } elseif (($totalEarned / max(1, $required)) < 0.5) {
                $status = 'behind_schedule';
            }

            $upd = $pdo->prepare("
                UPDATE hr_cme_quota_targets
                SET earned_units = ?, compliance_status = ?, updated_at = NOW()
                WHERE id = ?
            ");
            $upd->execute([$totalEarned, $status, $quota['id']]);
        }
    }

    /**
     * Dropdowns and lookup metadata
     */
    public function getMetadata(): array
    {
        $pdo = Database::connection();

        $staffStmt = $pdo->query("
            SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) AS full_name, e.employee_no, d.name AS department_name, p.specialty
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN providers p ON p.employee_id = e.id
            ORDER BY e.last_name ASC
        ");
        $staff = $staffStmt->fetchAll(PDO::FETCH_ASSOC);

        $activityTypes = [
            'conference' => 'International / National Scientific Conference',
            'symposium' => 'Clinical Specialty Symposium',
            'workshop' => 'Hands-On Skills Workshop / Wet Lab',
            'webinar' => 'Interactive Virtual CME Webinar',
            'institutional_grand_rounds' => 'Institutional Grand Rounds / M&M',
            'journal_reading' => 'Peer-Reviewed Journal Study / Self-Assessment',
            'clinical_fellowship' => 'Subspecialty Observership / Fellowship',
            'quality_improvement_training' => 'Hospital Quality & Patient Safety Training'
        ];

        $categories = [
            'Category 1 (Formal CME)',
            'Category 2 (Self-Directed)',
            'Ethics & Patient Safety',
            'Infection Control',
            'Pharmacology / Prescribing',
            'General Clinical'
        ];

        return [
            'staff' => $staff,
            'activity_types' => $activityTypes,
            'categories' => $categories
        ];
    }
}
