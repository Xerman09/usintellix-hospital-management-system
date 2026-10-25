<?php

namespace App\Modules\LeaveManagement\Services;

use App\Core\Database;
use PDO;
use RuntimeException;
use InvalidArgumentException;

class LeaveService
{
    /**
     * Atomically generate formal leave code LV-YYYYMM-XXXXX
     */
    public static function generateLeaveCode(PDO $pdo): string
    {
        $year = (int)date('Y');
        $yearMonth = date('Ym');
        $stmt = $pdo->prepare("
            INSERT INTO billing_tariff_counters (counter_type, year, last_number)
            VALUES ('LEAVE_REQUEST', ?, 1)
            ON DUPLICATE KEY UPDATE last_number = last_number + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'LEAVE_REQUEST' AND year = ?");
        $sel->execute([$year]);
        $seq = (int)$sel->fetchColumn();

        return sprintf("LV-%s-%05d", $yearMonth, $seq);
    }

    /**
     * List leave requests with filters, pagination, and KPI metrics
     */
    public function listLeaveRequests(array $filters, int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();

        $where = ["1=1"];
        $params = [];

        if (!empty($filters['employee_id'])) {
            $where[] = "r.employee_id = ?";
            $params[] = (int)$filters['employee_id'];
        }

        if (!empty($filters['department_id'])) {
            $where[] = "r.department_id = ?";
            $params[] = (int)$filters['department_id'];
        }

        if (!empty($filters['leave_type'])) {
            $where[] = "r.leave_type = ?";
            $params[] = $filters['leave_type'];
        }

        if (!empty($filters['status'])) {
            $where[] = "r.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['coverage_pending']) && $filters['coverage_pending'] == '1') {
            $where[] = "r.coverage_status = 'pending_colleague_ack'";
        }

        if (!empty($filters['start_date']) && !empty($filters['end_date'])) {
            $where[] = "(r.start_date <= ? AND r.end_date >= ?)";
            $params[] = $filters['end_date'];
            $params[] = $filters['start_date'];
        }

        if (!empty($filters['q'])) {
            $term = '%' . trim($filters['q']) . '%';
            $where[] = "(e.first_name LIKE ? OR e.last_name LIKE ? OR r.leave_code LIKE ? OR r.reason LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = implode(' AND ', $where);

        // Count total records
        $cntStmt = $pdo->prepare("
            SELECT COUNT(*) FROM hr_leave_requests r
            INNER JOIN employees e ON r.employee_id = e.id
            WHERE {$whereClause}
        ");
        $cntStmt->execute($params);
        $total = (int)$cntStmt->fetchColumn();

        // Paginated records
        $offset = ($page - 1) * $perPage;
        $sql = "
            SELECT 
                r.id,
                r.leave_code,
                r.employee_id,
                CONCAT(e.first_name, ' ', e.last_name) AS staff_name,
                e.email AS staff_email,
                r.department_id,
                d.name AS department_name,
                d.code AS department_code,
                r.leave_type,
                r.start_date,
                r.end_date,
                r.total_days,
                r.covering_employee_id,
                CONCAT(ec.first_name, ' ', ec.last_name) AS covering_staff_name,
                r.coverage_status,
                r.coverage_notes,
                r.reason,
                r.attachment_url,
                r.status,
                r.supervisor_id,
                u.username AS supervisor_name,
                r.approved_at,
                r.rejection_reason,
                r.created_at
            FROM hr_leave_requests r
            INNER JOIN employees e ON r.employee_id = e.id
            LEFT JOIN departments d ON r.department_id = d.id
            LEFT JOIN employees ec ON r.covering_employee_id = ec.id
            LEFT JOIN users u ON r.supervisor_id = u.id
            WHERE {$whereClause}
            ORDER BY r.id DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // KPI Summary
        $metStmt = $pdo->query("
            SELECT 
                COUNT(*) AS total_requests,
                SUM(CASE WHEN status = 'pending_approval' THEN 1 ELSE 0 END) AS pending_approvals,
                SUM(CASE WHEN coverage_status = 'pending_colleague_ack' AND status != 'cancelled' THEN 1 ELSE 0 END) AS pending_coverage_acks,
                SUM(CASE WHEN status = 'approved' AND start_date <= CURDATE() AND end_date >= CURDATE() THEN 1 ELSE 0 END) AS currently_on_leave,
                SUM(CASE WHEN status = 'approved' AND YEAR(start_date) = YEAR(CURDATE()) THEN total_days ELSE 0 END) AS total_approved_days_year
            FROM hr_leave_requests
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
     * Get or initialize annual leave quota balances for an employee
     */
    public function getEmployeeQuotaBalances(int $employeeId, int $year = 0): array
    {
        $pdo = Database::connection();
        if ($year <= 0) $year = (int)date('Y');

        // Check if records exist for this year
        $stmt = $pdo->prepare("
            SELECT * FROM hr_leave_quota_balances
            WHERE employee_id = ? AND year = ?
            ORDER BY FIELD(leave_type, 'vacation', 'sick', 'study_cme', 'emergency', 'maternity_paternity', 'bereavement', 'unpaid')
        ");
        $stmt->execute([$employeeId, $year]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($rows)) {
            // Auto-initialize standard default quotas
            $defaults = [
                'vacation'  => ['entitled' => 15.0, 'carried' => 0.0],
                'sick'      => ['entitled' => 12.0, 'carried' => 0.0],
                'study_cme' => ['entitled' => 5.0,  'carried' => 0.0],
                'emergency' => ['entitled' => 3.0,  'carried' => 0.0],
                'unpaid'    => ['entitled' => 30.0, 'carried' => 0.0]
            ];

            $ins = $pdo->prepare("
                INSERT INTO hr_leave_quota_balances (
                    employee_id, year, leave_type, total_entitled, carried_over, used_days, pending_days, remaining_balance
                ) VALUES (?, ?, ?, ?, ?, 0.0, 0.0, ?)
            ");

            foreach ($defaults as $type => $q) {
                $rem = $q['entitled'] + $q['carried'];
                $ins->execute([$employeeId, $year, $type, $q['entitled'], $q['carried'], $rem]);
            }

            $stmt->execute([$employeeId, $year]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }

        return $rows;
    }

    /**
     * Create a formal leave request with covering colleague assignment
     */
    public function createLeaveRequest(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $employeeId = (int)($data['employee_id'] ?? 0);
        $leaveType = trim($data['leave_type'] ?? 'vacation');
        $startDate = trim($data['start_date'] ?? '');
        $endDate = trim($data['end_date'] ?? '');
        $coveringEmpId = !empty($data['covering_employee_id']) ? (int)$data['covering_employee_id'] : null;
        $coverageNotes = !empty($data['coverage_notes']) ? trim($data['coverage_notes']) : null;
        $reason = trim($data['reason'] ?? '');
        $attachmentUrl = !empty($data['attachment_url']) ? trim($data['attachment_url']) : null;

        if ($employeeId <= 0) {
            throw new InvalidArgumentException("Employee selection is required.");
        }
        if (empty($startDate) || empty($endDate) || !strtotime($startDate) || !strtotime($endDate)) {
            throw new InvalidArgumentException("Valid start and end dates are required.");
        }
        if (strtotime($endDate) < strtotime($startDate)) {
            throw new InvalidArgumentException("End date cannot precede start date.");
        }
        if (empty($reason)) {
            throw new InvalidArgumentException("Justification reason is required.");
        }

        // Calculate days
        $startTs = strtotime($startDate);
        $endTs = strtotime($endDate);
        $totalDays = !empty($data['total_days']) ? (float)$data['total_days'] : (float)(($endTs - $startTs) / 86400 + 1);
        if ($totalDays <= 0) $totalDays = 1.0;

        // Fetch employee's department
        $empStmt = $pdo->prepare("SELECT department_id FROM employees WHERE id = ?");
        $empStmt->execute([$employeeId]);
        $deptId = (int)$empStmt->fetchColumn();
        if ($deptId <= 0) $deptId = 1;

        // Validate quota balance
        $year = (int)date('Y', $startTs);
        $this->getEmployeeQuotaBalances($employeeId, $year); // Ensure initialized

        $qStmt = $pdo->prepare("
            SELECT remaining_balance, pending_days FROM hr_leave_quota_balances
            WHERE employee_id = ? AND year = ? AND leave_type = ?
        ");
        $qStmt->execute([$employeeId, $year, $leaveType]);
        $quota = $qStmt->fetch(PDO::FETCH_ASSOC);

        if ($quota && $leaveType !== 'unpaid' && (float)$quota['remaining_balance'] < $totalDays) {
            throw new InvalidArgumentException(
                "Insufficient {$leaveType} leave quota balance. Remaining: {$quota['remaining_balance']} days, Requested: {$totalDays} days."
            );
        }

        $code = self::generateLeaveCode($pdo);
        $covStatus = $coveringEmpId ? 'pending_colleague_ack' : 'not_required';

        $pdo->beginTransaction();
        try {
            $ins = $pdo->prepare("
                INSERT INTO hr_leave_requests (
                    leave_code, employee_id, department_id, leave_type, start_date, end_date,
                    total_days, covering_employee_id, coverage_status, coverage_notes,
                    reason, attachment_url, status, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?)
            ");
            $ins->execute([
                $code,
                $employeeId,
                $deptId,
                $leaveType,
                $startDate,
                $endDate,
                $totalDays,
                $coveringEmpId,
                $covStatus,
                $coverageNotes,
                $reason,
                $attachmentUrl,
                $userId
            ]);

            $newId = (int)$pdo->lastInsertId();

            // Increment pending days in quota ledger
            $updQuota = $pdo->prepare("
                UPDATE hr_leave_quota_balances SET
                    pending_days = pending_days + ?
                WHERE employee_id = ? AND year = ? AND leave_type = ?
            ");
            $updQuota->execute([$totalDays, $employeeId, $year, $leaveType]);

            $pdo->commit();

            return [
                'id' => $newId,
                'leave_code' => $code,
                'total_days' => $totalDays,
                'coverage_status' => $covStatus,
                'message' => "Leave request #{$code} submitted successfully for supervisor approval."
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Covering Colleague Acknowledges / Agrees to Cover Shift
     */
    public function acknowledgeCoverage(int $leaveId, bool $accepted = true, ?string $notes = null, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("SELECT * FROM hr_leave_requests WHERE id = ?");
        $stmt->execute([$leaveId]);
        $req = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$req) {
            throw new RuntimeException("Leave request #{$leaveId} not found.");
        }

        $newStatus = $accepted ? 'acknowledged' : 'declined';
        $upd = $pdo->prepare("
            UPDATE hr_leave_requests SET
                coverage_status = ?,
                coverage_notes = CONCAT(COALESCE(coverage_notes, ''), IF(? IS NOT NULL, CONCAT(' | Peer: ', ?), ''))
            WHERE id = ?
        ");
        $upd->execute([$newStatus, $notes, $notes, $leaveId]);

        return [
            'id' => $leaveId,
            'coverage_status' => $newStatus,
            'message' => $accepted ? "Coverage acknowledged by colleague." : "Colleague coverage declined."
        ];
    }

    /**
     * Supervisor Approves Leave Request & Deducts Balance
     */
    public function approveLeaveRequest(int $leaveId, ?int $supervisorId = null): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("SELECT * FROM hr_leave_requests WHERE id = ?");
        $stmt->execute([$leaveId]);
        $req = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$req) {
            throw new RuntimeException("Leave request #{$leaveId} not found.");
        }

        if ($req['status'] === 'approved') {
            throw new RuntimeException("Leave request #{$req['leave_code']} is already approved.");
        }

        $year = (int)date('Y', strtotime($req['start_date']));
        $days = (float)$req['total_days'];
        $empId = (int)$req['employee_id'];
        $type = $req['leave_type'];

        $pdo->beginTransaction();
        try {
            // Update leave request
            $upd = $pdo->prepare("
                UPDATE hr_leave_requests SET
                    status = 'approved',
                    supervisor_id = ?,
                    approved_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $upd->execute([$supervisorId, $leaveId]);

            // Deduct quota balance
            $updQuota = $pdo->prepare("
                UPDATE hr_leave_quota_balances SET
                    used_days = used_days + ?,
                    pending_days = GREATEST(0.0, pending_days - ?),
                    remaining_balance = (total_entitled + carried_over) - (used_days + ?)
                WHERE employee_id = ? AND year = ? AND leave_type = ?
            ");
            $updQuota->execute([$days, $days, $days, $empId, $year, $type]);

            $pdo->commit();

            return [
                'id' => $leaveId,
                'leave_code' => $req['leave_code'],
                'message' => "Leave request #{$req['leave_code']} approved and {$days} days deducted from {$type} quota balance."
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Supervisor Rejects Leave Request
     */
    public function rejectLeaveRequest(int $leaveId, string $reason, ?int $supervisorId = null): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("SELECT * FROM hr_leave_requests WHERE id = ?");
        $stmt->execute([$leaveId]);
        $req = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$req) {
            throw new RuntimeException("Leave request #{$leaveId} not found.");
        }

        $year = (int)date('Y', strtotime($req['start_date']));
        $days = (float)$req['total_days'];
        $empId = (int)$req['employee_id'];
        $type = $req['leave_type'];

        $pdo->beginTransaction();
        try {
            $upd = $pdo->prepare("
                UPDATE hr_leave_requests SET
                    status = 'rejected',
                    rejection_reason = ?,
                    supervisor_id = ?,
                    approved_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $upd->execute([$reason, $supervisorId, $leaveId]);

            // Release pending days back to available balance
            $updQuota = $pdo->prepare("
                UPDATE hr_leave_quota_balances SET
                    pending_days = GREATEST(0.0, pending_days - ?)
                WHERE employee_id = ? AND year = ? AND leave_type = ?
            ");
            $updQuota->execute([$days, $empId, $year, $type]);

            $pdo->commit();

            return [
                'id' => $leaveId,
                'leave_code' => $req['leave_code'],
                'message' => "Leave request #{$req['leave_code']} rejected."
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Cancel Leave Request
     */
    public function cancelLeaveRequest(int $leaveId, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("SELECT * FROM hr_leave_requests WHERE id = ?");
        $stmt->execute([$leaveId]);
        $req = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$req) {
            throw new RuntimeException("Leave request not found.");
        }

        $year = (int)date('Y', strtotime($req['start_date']));
        $days = (float)$req['total_days'];
        $empId = (int)$req['employee_id'];
        $type = $req['leave_type'];

        $pdo->beginTransaction();
        try {
            $upd = $pdo->prepare("UPDATE hr_leave_requests SET status = 'cancelled' WHERE id = ?");
            $upd->execute([$leaveId]);

            if ($req['status'] === 'approved') {
                // Return used days
                $updQuota = $pdo->prepare("
                    UPDATE hr_leave_quota_balances SET
                        used_days = GREATEST(0.0, used_days - ?),
                        remaining_balance = (total_entitled + carried_over) - (used_days - ?)
                    WHERE employee_id = ? AND year = ? AND leave_type = ?
                ");
                $updQuota->execute([$days, $days, $empId, $year, $type]);
            } else {
                // Return pending days
                $updQuota = $pdo->prepare("
                    UPDATE hr_leave_quota_balances SET
                        pending_days = GREATEST(0.0, pending_days - ?)
                    WHERE employee_id = ? AND year = ? AND leave_type = ?
                ");
                $updQuota->execute([$days, $empId, $year, $type]);
            }

            $pdo->commit();
            return ['id' => $leaveId, 'message' => "Leave request cancelled."];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Active Staff & Departments Metadata
     */
    public function getMetadata(): array
    {
        $pdo = Database::connection();

        $departments = $pdo->query("SELECT id, name, code FROM departments WHERE status = 'active' ORDER BY name ASC")->fetchAll(PDO::FETCH_ASSOC);
        $staff = $pdo->query("
            SELECT e.id, CONCAT(e.first_name, ' ', e.last_name) AS full_name, e.department_id, d.name AS department_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            ORDER BY e.first_name ASC
        ")->fetchAll(PDO::FETCH_ASSOC);

        return [
            'departments' => $departments,
            'staff' => $staff
        ];
    }
}
