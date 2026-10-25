<?php

namespace App\Modules\Attendance\Services;

use App\Core\Database;
use PDO;
use RuntimeException;
use InvalidArgumentException;
use DateTime;

class AttendanceService
{
    /**
     * Atomically generate attendance punch code ATT-YYYYMM-XXXXX
     */
    public static function generateAttendanceCode(PDO $pdo): string
    {
        $year = (int)date('Y');
        $yearMonth = date('Ym');
        $stmt = $pdo->prepare("
            INSERT INTO billing_tariff_counters (counter_type, year, last_number)
            VALUES ('ATTENDANCE_LOG', ?, 1)
            ON DUPLICATE KEY UPDATE last_number = last_number + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'ATTENDANCE_LOG' AND year = ?");
        $sel->execute([$year]);
        $seq = (int)$sel->fetchColumn();

        return sprintf("ATT-%s-%05d", $yearMonth, $seq);
    }

    /**
     * Atomically generate overtime request code OT-YYYYMM-XXXXX
     */
    public static function generateOtCode(PDO $pdo): string
    {
        $year = (int)date('Y');
        $yearMonth = date('Ym');
        $stmt = $pdo->prepare("
            INSERT INTO billing_tariff_counters (counter_type, year, last_number)
            VALUES ('OVERTIME_REQ', ?, 1)
            ON DUPLICATE KEY UPDATE last_number = last_number + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'OVERTIME_REQ' AND year = ?");
        $sel->execute([$year]);
        $seq = (int)$sel->fetchColumn();

        return sprintf("OT-%s-%05d", $yearMonth, $seq);
    }

    /**
     * Compute actual hours, regular vs overtime, tardiness, undertime, and night shift differential
     */
    public static function calculateHoursAndDiff(
        string $clockInStr,
        string $clockOutStr,
        string $schedStart = '08:00:00',
        string $schedEnd = '17:00:00',
        int $breakMinutes = 60
    ): array {
        $inTs = strtotime($clockInStr);
        $outTs = strtotime($clockOutStr);

        if ($outTs < $inTs) {
            $outTs = $inTs; // safety
        }

        $grossSecs = $outTs - $inTs;
        $netSecs = max(0, $grossSecs - ($breakMinutes * 60));
        $totalHours = round($netSecs / 3600, 2);

        // Standard hospital day = 8.00 regular hours
        if ($totalHours > 8.00) {
            $regularHours = 8.00;
            $overtimeHours = round($totalHours - 8.00, 2);
        } else {
            $regularHours = $totalHours;
            $overtimeHours = 0.00;
        }

        // Tardiness calculation: Compare clock_in time with scheduled start on that day
        $dateStr = date('Y-m-d', $inTs);
        $schedStartTs = strtotime("{$dateStr} {$schedStart}");
        $tardinessMinutes = 0;
        if ($inTs > $schedStartTs) {
            $tardinessMinutes = (int)floor(($inTs - $schedStartTs) / 60);
        }

        // Undertime calculation: Compare clock_out time with scheduled end
        $outDateStr = date('Y-m-d', $outTs);
        $schedEndTs = strtotime("{$outDateStr} {$schedEnd}");
        $undertimeMinutes = 0;
        if ($outTs < $schedEndTs) {
            $undertimeMinutes = (int)floor(($schedEndTs - $outTs) / 60);
        }

        // Night-Shift Differential (ND): Hours rendered between 22:00 (10 PM) and 06:00 (6 AM)
        $nightDiffMinutes = 0;
        // Step minute by minute or 15-min intervals for precise boundary calculation
        $curr = $inTs;
        while ($curr < $outTs) {
            $hour = (int)date('G', $curr); // 0 to 23
            // 22:00 to 23:59 or 00:00 to 05:59
            if ($hour >= 22 || $hour < 6) {
                $nightDiffMinutes++;
            }
            $curr += 60; // advance 1 minute
        }
        $nightDiffHours = round($nightDiffMinutes / 60, 2);

        // Determine attendance status
        $status = 'present';
        if ($overtimeHours > 0.5) {
            $status = 'overtime';
        } elseif ($tardinessMinutes > 15) {
            $status = 'late';
        } elseif ($undertimeMinutes > 30) {
            $status = 'undertime';
        } elseif ($totalHours < 4.0 && $totalHours > 0) {
            $status = 'half_day';
        }

        return [
            'total_hours_worked' => $totalHours,
            'regular_hours' => $regularHours,
            'overtime_hours' => $overtimeHours,
            'tardiness_minutes' => $tardinessMinutes,
            'undertime_minutes' => $undertimeMinutes,
            'night_diff_hours' => $nightDiffHours,
            'status' => $status
        ];
    }

    /**
     * Employee Clock-In Punch
     */
    public function clockIn(int $employeeId, string $method = 'web_console', ?string $ip = null, ?string $remarks = null): array
    {
        $pdo = Database::connection();

        // 1. Validate employee
        $empStmt = $pdo->prepare("
            SELECT e.id, e.first_name, e.last_name, e.department_id, d.name AS dept_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE e.id = ?
        ");
        $empStmt->execute([$employeeId]);
        $emp = $empStmt->fetch(PDO::FETCH_ASSOC);
        if (!$emp) {
            throw new InvalidArgumentException("Employee ID {$employeeId} not found.");
        }

        // 2. Check for open clock-in (not yet clocked out)
        $openStmt = $pdo->prepare("
            SELECT id, attendance_code, clock_in FROM hr_attendance_logs
            WHERE employee_id = ? AND clock_out IS NULL
            ORDER BY id DESC LIMIT 1
        ");
        $openStmt->execute([$employeeId]);
        $open = $openStmt->fetch(PDO::FETCH_ASSOC);
        if ($open) {
            throw new RuntimeException("Staff is already clocked in since {$open['clock_in']} (#{$open['attendance_code']}). Please clock out first.");
        }

        $now = date('Y-m-d H:i:s');
        $today = date('Y-m-d');
        $code = self::generateAttendanceCode($pdo);

        // Check scheduled duty roster or default
        $schedStmt = $pdo->prepare("
            SELECT start_time, end_time FROM hr_duty_rosters
            WHERE employee_id = ? AND shift_date = ? AND status NOT IN ('cancelled', 'swapped')
            ORDER BY id ASC LIMIT 1
        ");
        $schedStmt->execute([$employeeId, $today]);
        $roster = $schedStmt->fetch(PDO::FETCH_ASSOC);

        $schedStart = $roster ? $roster['start_time'] : '08:00:00';
        $schedEnd   = $roster ? $roster['end_time'] : '17:00:00';

        // Check initial tardiness
        $inTs = strtotime($now);
        $schedStartTs = strtotime("{$today} {$schedStart}");
        $tardy = ($inTs > $schedStartTs) ? (int)floor(($inTs - $schedStartTs) / 60) : 0;
        $status = ($tardy > 15) ? 'late' : 'present';

        $ins = $pdo->prepare("
            INSERT INTO hr_attendance_logs (
                attendance_code, employee_id, clock_date, scheduled_start, scheduled_end,
                clock_in, punch_method, status, tardiness_minutes, ip_address, remarks
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $ins->execute([
            $code,
            $employeeId,
            $today,
            $schedStart,
            $schedEnd,
            $now,
            $method,
            $status,
            $tardy,
            $ip,
            $remarks
        ]);

        $newId = (int)$pdo->lastInsertId();

        return [
            'id' => $newId,
            'attendance_code' => $code,
            'employee_name' => "{$emp['first_name']} {$emp['last_name']}",
            'department_name' => $emp['dept_name'] ?? 'Hospital General',
            'clock_in' => $now,
            'status' => $status,
            'tardiness_minutes' => $tardy,
            'message' => "Clock-in recorded successfully at {$now}."
        ];
    }

    /**
     * Employee Clock-Out Punch
     */
    public function clockOut(int $employeeId, ?int $logId = null, int $breakMinutes = 60, ?string $remarks = null): array
    {
        $pdo = Database::connection();

        // 1. Find active open punch
        if ($logId && $logId > 0) {
            $stmt = $pdo->prepare("SELECT * FROM hr_attendance_logs WHERE id = ? AND employee_id = ? AND clock_out IS NULL");
            $stmt->execute([$logId, $employeeId]);
        } else {
            $stmt = $pdo->prepare("SELECT * FROM hr_attendance_logs WHERE employee_id = ? AND clock_out IS NULL ORDER BY id DESC LIMIT 1");
            $stmt->execute([$employeeId]);
        }
        $log = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$log) {
            throw new RuntimeException("No active open clock-in found for this employee to clock out from.");
        }

        $now = date('Y-m-d H:i:s');
        $calc = self::calculateHoursAndDiff(
            $log['clock_in'],
            $now,
            $log['scheduled_start'] ?? '08:00:00',
            $log['scheduled_end'] ?? '17:00:00',
            $breakMinutes
        );

        $otStatus = ($calc['overtime_hours'] > 0) ? 'pending_approval' : 'none';

        $upd = $pdo->prepare("
            UPDATE hr_attendance_logs SET
                clock_out = ?,
                break_minutes = ?,
                total_hours_worked = ?,
                regular_hours = ?,
                overtime_hours = ?,
                undertime_minutes = ?,
                night_diff_hours = ?,
                overtime_status = ?,
                status = ?,
                remarks = CONCAT(COALESCE(remarks, ''), IF(? IS NOT NULL AND ? != '', CONCAT(' | Out note: ', ?), ''))
            WHERE id = ?
        ");
        $upd->execute([
            $now,
            $breakMinutes,
            $calc['total_hours_worked'],
            $calc['regular_hours'],
            $calc['overtime_hours'],
            $calc['undertime_minutes'],
            $calc['night_diff_hours'],
            $otStatus,
            $calc['status'],
            $remarks,
            $remarks,
            $remarks,
            $log['id']
        ]);

        // If overtime, record an overtime approval request
        if ($calc['overtime_hours'] > 0) {
            $otCode = self::generateOtCode($pdo);
            $otIns = $pdo->prepare("
                INSERT INTO hr_overtime_requests (
                    ot_code, employee_id, attendance_log_id, request_date, planned_ot_hours,
                    reason, status
                ) VALUES (?, ?, ?, ?, ?, 'Automated overtime threshold exceeded from time-clock punch', 'pending')
            ");
            $otIns->execute([
                $otCode,
                $employeeId,
                $log['id'],
                $log['clock_date'],
                $calc['overtime_hours']
            ]);
        }

        return [
            'id' => $log['id'],
            'attendance_code' => $log['attendance_code'],
            'clock_in' => $log['clock_in'],
            'clock_out' => $now,
            'total_hours_worked' => $calc['total_hours_worked'],
            'regular_hours' => $calc['regular_hours'],
            'overtime_hours' => $calc['overtime_hours'],
            'tardiness_minutes' => $calc['tardiness_minutes'],
            'undertime_minutes' => $calc['undertime_minutes'],
            'night_diff_hours' => $calc['night_diff_hours'],
            'status' => $calc['status'],
            'overtime_status' => $otStatus,
            'message' => "Clock-out recorded at {$now}. Worked {$calc['total_hours_worked']} hrs (Reg: {$calc['regular_hours']}h, OT: {$calc['overtime_hours']}h, Night Diff: {$calc['night_diff_hours']}h)."
        ];
    }

    /**
     * Get active clock-in status for an employee (for live console widgets)
     */
    public function getActiveClockStatus(int $employeeId): array
    {
        $pdo = Database::connection();

        $empStmt = $pdo->prepare("
            SELECT e.id, e.first_name, e.last_name, e.department_id, d.name AS dept_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE e.id = ?
        ");
        $empStmt->execute([$employeeId]);
        $emp = $empStmt->fetch(PDO::FETCH_ASSOC);

        $stmt = $pdo->prepare("
            SELECT * FROM hr_attendance_logs
            WHERE employee_id = ? AND clock_out IS NULL
            ORDER BY id DESC LIMIT 1
        ");
        $stmt->execute([$employeeId]);
        $open = $stmt->fetch(PDO::FETCH_ASSOC);

        $elapsedSeconds = 0;
        if ($open) {
            $elapsedSeconds = max(0, time() - strtotime($open['clock_in']));
        }

        // Today's total completed logs
        $todayStmt = $pdo->prepare("
            SELECT 
                COUNT(*) AS punches_today,
                COALESCE(SUM(total_hours_worked), 0) AS total_hours_today,
                COALESCE(SUM(regular_hours), 0) AS regular_hours_today,
                COALESCE(SUM(overtime_hours), 0) AS overtime_hours_today
            FROM hr_attendance_logs
            WHERE employee_id = ? AND clock_date = CURDATE()
        ");
        $todayStmt->execute([$employeeId]);
        $todayStats = $todayStmt->fetch(PDO::FETCH_ASSOC);

        return [
            'is_clocked_in' => (bool)$open,
            'employee' => $emp,
            'current_punch' => $open,
            'elapsed_seconds' => $elapsedSeconds,
            'today_stats' => $todayStats
        ];
    }

    /**
     * List attendance logs with high-density metrics and filters
     */
    public function listAttendanceLogs(array $filters, int $page = 1, int $perPage = 25): array
    {
        $pdo = Database::connection();

        $startDate = !empty($filters['start_date']) ? $filters['start_date'] : date('Y-m-01');
        $endDate = !empty($filters['end_date']) ? $filters['end_date'] : date('Y-m-t');

        $where = ["l.clock_date BETWEEN ? AND ?"];
        $params = [$startDate, $endDate];

        if (!empty($filters['employee_id'])) {
            $where[] = "l.employee_id = ?";
            $params[] = (int)$filters['employee_id'];
        }

        if (!empty($filters['department_id'])) {
            $where[] = "e.department_id = ?";
            $params[] = (int)$filters['department_id'];
        }

        if (!empty($filters['status'])) {
            $where[] = "l.status = ?";
            $params[] = $filters['status'];
        }

        if (!empty($filters['overtime_only']) && $filters['overtime_only'] == '1') {
            $where[] = "l.overtime_hours > 0";
        }

        if (!empty($filters['q'])) {
            $term = '%' . trim($filters['q']) . '%';
            $where[] = "(e.first_name LIKE ? OR e.last_name LIKE ? OR l.attendance_code LIKE ?)";
            $params[] = $term;
            $params[] = $term;
            $params[] = $term;
        }

        $whereClause = implode(' AND ', $where);

        // Count total
        $cntStmt = $pdo->prepare("
            SELECT COUNT(*) FROM hr_attendance_logs l
            INNER JOIN employees e ON l.employee_id = e.id
            WHERE {$whereClause}
        ");
        $cntStmt->execute($params);
        $total = (int)$cntStmt->fetchColumn();

        // Paginated query
        $offset = ($page - 1) * $perPage;
        $sql = "
            SELECT 
                l.id,
                l.attendance_code,
                l.employee_id,
                CONCAT(e.first_name, ' ', e.last_name) AS staff_name,
                e.department_id,
                d.name AS department_name,
                d.code AS department_code,
                l.clock_date,
                TIME_FORMAT(l.scheduled_start, '%H:%i') AS scheduled_start,
                TIME_FORMAT(l.scheduled_end, '%H:%i') AS scheduled_end,
                l.clock_in,
                l.clock_out,
                l.break_minutes,
                l.total_hours_worked,
                l.regular_hours,
                l.overtime_hours,
                l.tardiness_minutes,
                l.undertime_minutes,
                l.night_diff_hours,
                l.overtime_status,
                l.punch_method,
                l.status,
                l.remarks,
                l.created_at
            FROM hr_attendance_logs l
            INNER JOIN employees e ON l.employee_id = e.id
            LEFT JOIN departments d ON e.department_id = d.id
            WHERE {$whereClause}
            ORDER BY l.clock_date DESC, l.clock_in DESC
            LIMIT {$perPage} OFFSET {$offset}
        ";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Aggregate Metrics for executive time-clock banner
        $metStmt = $pdo->prepare("
            SELECT 
                COUNT(*) AS total_punches,
                COALESCE(SUM(l.total_hours_worked), 0) AS sum_total_hours,
                COALESCE(SUM(l.regular_hours), 0) AS sum_regular_hours,
                COALESCE(SUM(l.overtime_hours), 0) AS sum_overtime_hours,
                COALESCE(SUM(l.tardiness_minutes), 0) AS sum_tardiness_minutes,
                COALESCE(SUM(l.undertime_minutes), 0) AS sum_undertime_minutes,
                COALESCE(SUM(l.night_diff_hours), 0) AS sum_night_diff_hours,
                SUM(CASE WHEN l.status = 'late' THEN 1 ELSE 0 END) AS count_late,
                SUM(CASE WHEN l.overtime_hours > 0 THEN 1 ELSE 0 END) AS count_overtime
            FROM hr_attendance_logs l
            INNER JOIN employees e ON l.employee_id = e.id
            WHERE {$whereClause}
        ");
        $metStmt->execute($params);
        $metrics = $metStmt->fetch(PDO::FETCH_ASSOC);

        // Active currently clocked in count
        $activeStmt = $pdo->query("SELECT COUNT(*) FROM hr_attendance_logs WHERE clock_out IS NULL");
        $currentlyClockedIn = (int)$activeStmt->fetchColumn();

        return [
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'records' => $records,
            'metrics' => array_merge($metrics ?: [], [
                'currently_clocked_in' => $currentlyClockedIn
            ])
        ];
    }

    /**
     * Approve Overtime
     */
    public function approveOvertime(int $logId, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $upd = $pdo->prepare("
            UPDATE hr_attendance_logs SET
                overtime_status = 'approved',
                verified_by = ?,
                verified_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $upd->execute([$userId, $logId]);

        // Also update overtime requests table
        $updReq = $pdo->prepare("
            UPDATE hr_overtime_requests SET
                status = 'approved',
                approved_by = ?,
                approved_at = CURRENT_TIMESTAMP
            WHERE attendance_log_id = ?
        ");
        $updReq->execute([$userId, $logId]);

        return [
            'id' => $logId,
            'message' => "Overtime approved for punch #{$logId}."
        ];
    }

    /**
     * Reject Overtime
     */
    public function rejectOvertime(int $logId, string $reason, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $upd = $pdo->prepare("
            UPDATE hr_attendance_logs SET
                overtime_status = 'rejected',
                verified_by = ?,
                verified_at = CURRENT_TIMESTAMP,
                remarks = CONCAT(COALESCE(remarks, ''), ' | OT Rejected: ', ?)
            WHERE id = ?
        ");
        $upd->execute([$userId, $reason, $logId]);

        $updReq = $pdo->prepare("
            UPDATE hr_overtime_requests SET
                status = 'rejected',
                rejection_reason = ?,
                approved_by = ?,
                approved_at = CURRENT_TIMESTAMP
            WHERE attendance_log_id = ?
        ");
        $updReq->execute([$reason, $userId, $logId]);

        return [
            'id' => $logId,
            'message' => "Overtime rejected for punch #{$logId}."
        ];
    }

    /**
     * Staff Directory for Time Clock Console
     */
    public function getStaffList(): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->query("
            SELECT 
                e.id,
                CONCAT(e.first_name, ' ', e.last_name) AS full_name,
                e.email,
                e.department_id,
                d.name AS department_name
            FROM employees e
            LEFT JOIN departments d ON e.department_id = d.id
            ORDER BY e.first_name ASC, e.last_name ASC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
