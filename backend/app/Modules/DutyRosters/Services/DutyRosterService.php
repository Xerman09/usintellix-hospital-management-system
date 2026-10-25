<?php

namespace App\Modules\DutyRosters\Services;

use App\Core\Database;
use PDO;
use RuntimeException;
use InvalidArgumentException;

class DutyRosterService
{
    /**
     * Atomically generate duty roster shift code ROST-YYYYMM-XXXXX
     */
    public static function generateRosterCode(PDO $pdo): string
    {
        $year = (int)date('Y');
        $yearMonth = date('Ym');
        $stmt = $pdo->prepare("
            INSERT INTO billing_tariff_counters (counter_type, year, last_number)
            VALUES ('DUTY_ROSTER', ?, 1)
            ON DUPLICATE KEY UPDATE last_number = last_number + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'DUTY_ROSTER' AND year = ?");
        $sel->execute([$year]);
        $seq = (int)$sel->fetchColumn();

        return sprintf("ROST-%s-%05d", $yearMonth, $seq);
    }

    /**
     * Atomically generate shift swap code SWAP-YYYYMM-XXXXX
     */
    public static function generateSwapCode(PDO $pdo): string
    {
        $year = (int)date('Y');
        $yearMonth = date('Ym');
        $stmt = $pdo->prepare("
            INSERT INTO billing_tariff_counters (counter_type, year, last_number)
            VALUES ('ROSTER_SWAP', ?, 1)
            ON DUPLICATE KEY UPDATE last_number = last_number + 1
        ");
        $stmt->execute([$year]);

        $sel = $pdo->prepare("SELECT last_number FROM billing_tariff_counters WHERE counter_type = 'ROSTER_SWAP' AND year = ?");
        $sel->execute([$year]);
        $seq = (int)$sel->fetchColumn();

        return sprintf("SWAP-%s-%05d", $yearMonth, $seq);
    }

    /**
     * Fetch roster calendar matrix for a specific month and filters
     */
    public function getRosterCalendar(int $deptId = 0, string $month = '', string $role = '', string $status = ''): array
    {
        $pdo = Database::connection();

        if (empty($month)) {
            $month = date('Y-m');
        }

        $startDate = $month . '-01';
        $endDate = date('Y-m-t', strtotime($startDate));

        $sql = "
            SELECT 
                r.id,
                r.roster_code,
                r.department_id,
                d.name AS department_name,
                d.code AS department_code,
                r.employee_id,
                CONCAT('Dr. ', e.first_name, ' ', e.last_name) AS doctor_name,
                e.email AS doctor_email,
                e.phone AS doctor_phone,
                p.specialty,
                p.license_number,
                r.shift_date,
                r.shift_type,
                TIME_FORMAT(r.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(r.end_time, '%H:%i') AS end_time,
                r.call_role,
                COALESCE(r.contact_override_phone, e.phone) AS contact_phone,
                r.pager_number,
                r.status,
                r.notes,
                r.created_at
            FROM hr_duty_rosters r
            INNER JOIN departments d ON r.department_id = d.id
            INNER JOIN employees e ON r.employee_id = e.id
            LEFT JOIN providers p ON r.provider_id = p.id OR (p.employee_id = e.id)
            WHERE r.shift_date BETWEEN ? AND ?
        ";

        $params = [$startDate, $endDate];

        if ($deptId > 0) {
            $sql .= " AND r.department_id = ?";
            $params[] = $deptId;
        }

        if (!empty($role)) {
            $sql .= " AND r.call_role = ?";
            $params[] = $role;
        }

        if (!empty($status)) {
            $sql .= " AND r.status = ?";
            $params[] = $status;
        }

        $sql .= " ORDER BY r.shift_date ASC, FIELD(r.call_role, 'primary_on_call', 'secondary_on_call', 'er_backup', 'icu_consultant', 'rounding_physician'), r.start_time ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $shifts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Group shifts by day for rapid calendar grid rendering
        $calendarGrid = [];
        foreach ($shifts as $s) {
            $day = (int)date('j', strtotime($s['shift_date']));
            if (!isset($calendarGrid[$day])) {
                $calendarGrid[$day] = [];
            }
            $calendarGrid[$day][] = $s;
        }

        // Metrics & KPI summary
        $statsStmt = $pdo->prepare("
            SELECT 
                COUNT(*) AS total_shifts_month,
                SUM(CASE WHEN shift_date = CURDATE() THEN 1 ELSE 0 END) AS active_today,
                COUNT(DISTINCT department_id) AS covered_departments,
                SUM(CASE WHEN call_role = 'primary_on_call' THEN 1 ELSE 0 END) AS primary_on_call_count,
                SUM(CASE WHEN call_role = 'er_backup' THEN 1 ELSE 0 END) AS er_backup_count,
                SUM(CASE WHEN call_role = 'secondary_on_call' THEN 1 ELSE 0 END) AS secondary_count
            FROM hr_duty_rosters
            WHERE shift_date BETWEEN ? AND ?
        ");
        $statsStmt->execute([$startDate, $endDate]);
        $stats = $statsStmt->fetch(PDO::FETCH_ASSOC) ?: [];

        // Count pending swaps
        $swapStmt = $pdo->query("SELECT COUNT(*) FROM hr_duty_roster_swaps WHERE status = 'pending_approval'");
        $pendingSwaps = (int)$swapStmt->fetchColumn();

        return [
            'month' => $month,
            'start_date' => $startDate,
            'end_date' => $endDate,
            'total_shifts' => count($shifts),
            'stats' => array_merge($stats, ['pending_swaps' => $pendingSwaps]),
            'calendar_grid' => $calendarGrid,
            'shifts' => $shifts
        ];
    }

    /**
     * Today's Emergency Switchboard On-Call Directory
     */
    public function getTodayOnCallDirectory(?int $deptId = null): array
    {
        $pdo = Database::connection();
        $today = date('Y-m-d');

        $sql = "
            SELECT 
                r.id,
                r.roster_code,
                r.department_id,
                d.name AS department_name,
                d.code AS department_code,
                d.location AS department_location,
                r.employee_id,
                CONCAT('Dr. ', e.first_name, ' ', e.last_name) AS doctor_name,
                p.specialty,
                r.shift_type,
                TIME_FORMAT(r.start_time, '%H:%i') AS start_time,
                TIME_FORMAT(r.end_time, '%H:%i') AS end_time,
                r.call_role,
                COALESCE(r.contact_override_phone, e.phone, 'Hospital Switchboard') AS contact_phone,
                COALESCE(r.pager_number, 'None') AS pager_number,
                r.status,
                r.notes
            FROM hr_duty_rosters r
            INNER JOIN departments d ON r.department_id = d.id
            INNER JOIN employees e ON r.employee_id = e.id
            LEFT JOIN providers p ON r.provider_id = p.id OR (p.employee_id = e.id)
            WHERE r.shift_date = ?
        ";

        $params = [$today];
        if ($deptId && $deptId > 0) {
            $sql .= " AND r.department_id = ?";
            $params[] = $deptId;
        }

        $sql .= " ORDER BY d.name ASC, FIELD(r.call_role, 'primary_on_call', 'secondary_on_call', 'er_backup', 'icu_consultant', 'rounding_physician')";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Group by department
        $departments = [];
        foreach ($records as $r) {
            $deptName = $r['department_name'];
            if (!isset($departments[$deptName])) {
                $departments[$deptName] = [
                    'department_id' => $r['department_id'],
                    'department_name' => $deptName,
                    'department_code' => $r['department_code'],
                    'location' => $r['department_location'],
                    'rosters' => []
                ];
            }
            $departments[$deptName]['rosters'][] = $r;
        }

        return [
            'date' => $today,
            'total_active_today' => count($records),
            'directory' => array_values($departments)
        ];
    }

    /**
     * Create a single duty roster entry
     */
    public function createAssignment(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $deptId = (int)($data['department_id'] ?? 0);
        $empId = (int)($data['employee_id'] ?? 0);
        $shiftDate = trim($data['shift_date'] ?? '');
        $shiftType = $data['shift_type'] ?? 'full_day_24h';
        $callRole = $data['call_role'] ?? 'primary_on_call';
        $startTime = $data['start_time'] ?? '08:00:00';
        $endTime = $data['end_time'] ?? '08:00:00';
        $contactPhone = !empty($data['contact_override_phone']) ? trim($data['contact_override_phone']) : null;
        $pager = !empty($data['pager_number']) ? trim($data['pager_number']) : null;
        $notes = !empty($data['notes']) ? trim($data['notes']) : null;

        if ($deptId <= 0) {
            throw new InvalidArgumentException("Clinical department is required.");
        }
        if ($empId <= 0) {
            throw new InvalidArgumentException("Doctor assignment is required.");
        }
        if (empty($shiftDate) || !strtotime($shiftDate)) {
            throw new InvalidArgumentException("Valid shift date is required.");
        }

        // Locate provider id if exists
        $provStmt = $pdo->prepare("SELECT id FROM providers WHERE employee_id = ? LIMIT 1");
        $provStmt->execute([$empId]);
        $providerId = $provStmt->fetchColumn() ?: null;

        // Check for duplicate active entry for same doctor on the exact date and role
        $checkStmt = $pdo->prepare("
            SELECT id, roster_code FROM hr_duty_rosters 
            WHERE employee_id = ? AND shift_date = ? AND call_role = ? AND status NOT IN ('cancelled', 'swapped')
            LIMIT 1
        ");
        $checkStmt->execute([$empId, $shiftDate, $callRole]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
        if ($existing) {
            throw new InvalidArgumentException("Doctor is already assigned as {$callRole} on {$shiftDate} (#{$existing['roster_code']}).");
        }

        $code = self::generateRosterCode($pdo);

        $stmt = $pdo->prepare("
            INSERT INTO hr_duty_rosters (
                roster_code, department_id, employee_id, provider_id, shift_date,
                shift_type, start_time, end_time, call_role, contact_override_phone,
                pager_number, status, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
        ");
        $stmt->execute([
            $code,
            $deptId,
            $empId,
            $providerId,
            $shiftDate,
            $shiftType,
            $startTime,
            $endTime,
            $callRole,
            $contactPhone,
            $pager,
            $notes,
            $userId
        ]);

        $newId = (int)$pdo->lastInsertId();

        return [
            'id' => $newId,
            'roster_code' => $code,
            'message' => "Duty roster assignment #{$code} scheduled successfully."
        ];
    }

    /**
     * Update an existing duty roster assignment
     */
    public function updateAssignment(int $id, array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $sel = $pdo->prepare("SELECT * FROM hr_duty_rosters WHERE id = ?");
        $sel->execute([$id]);
        $current = $sel->fetch(PDO::FETCH_ASSOC);
        if (!$current) {
            throw new RuntimeException("Duty roster entry #{$id} not found.");
        }

        $deptId = isset($data['department_id']) ? (int)$data['department_id'] : $current['department_id'];
        $empId = isset($data['employee_id']) ? (int)$data['employee_id'] : $current['employee_id'];
        $shiftDate = !empty($data['shift_date']) ? trim($data['shift_date']) : $current['shift_date'];
        $shiftType = $data['shift_type'] ?? $current['shift_type'];
        $callRole = $data['call_role'] ?? $current['call_role'];
        $startTime = $data['start_time'] ?? $current['start_time'];
        $endTime = $data['end_time'] ?? $current['end_time'];
        $contactPhone = array_key_exists('contact_override_phone', $data) ? $data['contact_override_phone'] : $current['contact_override_phone'];
        $pager = array_key_exists('pager_number', $data) ? $data['pager_number'] : $current['pager_number'];
        $status = $data['status'] ?? $current['status'];
        $notes = array_key_exists('notes', $data) ? $data['notes'] : $current['notes'];

        $upd = $pdo->prepare("
            UPDATE hr_duty_rosters SET
                department_id = ?,
                employee_id = ?,
                shift_date = ?,
                shift_type = ?,
                start_time = ?,
                end_time = ?,
                call_role = ?,
                contact_override_phone = ?,
                pager_number = ?,
                status = ?,
                notes = ?,
                updated_by = ?
            WHERE id = ?
        ");
        $upd->execute([
            $deptId,
            $empId,
            $shiftDate,
            $shiftType,
            $startTime,
            $endTime,
            $callRole,
            $contactPhone,
            $pager,
            $status,
            $notes,
            $userId,
            $id
        ]);

        return [
            'id' => $id,
            'roster_code' => $current['roster_code'],
            'message' => "Duty roster assignment #{$current['roster_code']} updated successfully."
        ];
    }

    /**
     * Cancel / Delete an assignment
     */
    public function deleteAssignment(int $id): bool
    {
        $pdo = Database::connection();
        $del = $pdo->prepare("DELETE FROM hr_duty_rosters WHERE id = ?");
        return $del->execute([$id]);
    }

    /**
     * Request a shift swap
     */
    public function requestShiftSwap(array $data, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $originalRosterId = (int)($data['original_roster_id'] ?? 0);
        $targetEmpId = (int)($data['target_employee_id'] ?? 0);
        $reason = trim($data['reason'] ?? '');

        if ($originalRosterId <= 0 || $targetEmpId <= 0 || empty($reason)) {
            throw new InvalidArgumentException("Original roster, covering physician, and reason are required.");
        }

        $rostStmt = $pdo->prepare("SELECT * FROM hr_duty_rosters WHERE id = ?");
        $rostStmt->execute([$originalRosterId]);
        $orig = $rostStmt->fetch(PDO::FETCH_ASSOC);
        if (!$orig) {
            throw new RuntimeException("Original duty roster #{$originalRosterId} not found.");
        }

        $swapCode = self::generateSwapCode($pdo);

        $stmt = $pdo->prepare("
            INSERT INTO hr_duty_roster_swaps (
                swap_code, original_roster_id, requesting_employee_id, target_employee_id,
                reason, status, requested_by_user_id
            ) VALUES (?, ?, ?, ?, ?, 'pending_approval', ?)
        ");
        $stmt->execute([
            $swapCode,
            $originalRosterId,
            $orig['employee_id'],
            $targetEmpId,
            $reason,
            $userId
        ]);

        return [
            'id' => (int)$pdo->lastInsertId(),
            'swap_code' => $swapCode,
            'message' => "Shift swap request #{$swapCode} submitted for department head approval."
        ];
    }

    /**
     * Approve shift swap and update master roster
     */
    public function approveShiftSwap(int $swapId, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("SELECT * FROM hr_duty_roster_swaps WHERE id = ?");
        $stmt->execute([$swapId]);
        $swap = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$swap) {
            throw new RuntimeException("Swap request #{$swapId} not found.");
        }

        if ($swap['status'] === 'approved') {
            throw new RuntimeException("Swap request is already approved.");
        }

        $pdo->beginTransaction();
        try {
            // Update swap record
            $updSwap = $pdo->prepare("
                UPDATE hr_duty_roster_swaps SET
                    status = 'approved',
                    approved_by_user_id = ?,
                    actioned_at = CURRENT_TIMESTAMP
                WHERE id = ?
            ");
            $updSwap->execute([$userId, $swapId]);

            // Reassign the roster to target doctor
            $origRosterId = $swap['original_roster_id'];
            $targetEmpId = $swap['target_employee_id'];

            // Find provider id if any
            $pStmt = $pdo->prepare("SELECT id FROM providers WHERE employee_id = ? LIMIT 1");
            $pStmt->execute([$targetEmpId]);
            $pId = $pStmt->fetchColumn() ?: null;

            // Fetch target employee contact details
            $empStmt = $pdo->prepare("SELECT phone FROM employees WHERE id = ?");
            $empStmt->execute([$targetEmpId]);
            $targetPhone = $empStmt->fetchColumn() ?: null;

            $updRoster = $pdo->prepare("
                UPDATE hr_duty_rosters SET
                    employee_id = ?,
                    provider_id = ?,
                    contact_override_phone = COALESCE(?, contact_override_phone),
                    swap_with_roster_id = ?,
                    swap_reason = ?,
                    updated_by = ?
                WHERE id = ?
            ");
            $updRoster->execute([
                $targetEmpId,
                $pId,
                $targetPhone,
                $origRosterId,
                "Approved shift swap {$swap['swap_code']}: {$swap['reason']}",
                $userId,
                $origRosterId
            ]);

            $pdo->commit();

            return [
                'swap_id' => $swapId,
                'swap_code' => $swap['swap_code'],
                'message' => "Shift swap #{$swap['swap_code']} approved and roster updated."
            ];
        } catch (\Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }
    }

    /**
     * Reject shift swap
     */
    public function rejectShiftSwap(int $swapId, string $reason, ?int $userId = null): array
    {
        $pdo = Database::connection();

        $stmt = $pdo->prepare("
            UPDATE hr_duty_roster_swaps SET
                status = 'rejected',
                rejection_reason = ?,
                approved_by_user_id = ?,
                actioned_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ");
        $stmt->execute([$reason, $userId, $swapId]);

        return [
            'swap_id' => $swapId,
            'message' => "Shift swap #{$swapId} rejected."
        ];
    }

    /**
     * List Shift Swaps
     */
    public function listShiftSwaps(int $deptId = 0, string $status = ''): array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT 
                s.id,
                s.swap_code,
                s.original_roster_id,
                r.roster_code,
                r.shift_date,
                r.shift_type,
                r.call_role,
                d.name AS department_name,
                s.requesting_employee_id,
                CONCAT('Dr. ', e1.first_name, ' ', e1.last_name) AS requesting_doctor,
                s.target_employee_id,
                CONCAT('Dr. ', e2.first_name, ' ', e2.last_name) AS target_doctor,
                s.reason,
                s.status,
                s.rejection_reason,
                s.actioned_at,
                s.created_at
            FROM hr_duty_roster_swaps s
            INNER JOIN hr_duty_rosters r ON s.original_roster_id = r.id
            INNER JOIN departments d ON r.department_id = d.id
            INNER JOIN employees e1 ON s.requesting_employee_id = e1.id
            INNER JOIN employees e2 ON s.target_employee_id = e2.id
            WHERE 1=1
        ";

        $params = [];
        if ($deptId > 0) {
            $sql .= " AND r.department_id = ?";
            $params[] = $deptId;
        }
        if (!empty($status)) {
            $sql .= " AND s.status = ?";
            $params[] = $status;
        }

        $sql .= " ORDER BY s.id DESC LIMIT 100";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Active clinical departments list
     */
    public function getDepartments(): array
    {
        $pdo = Database::connection();
        $stmt = $pdo->query("
            SELECT id, name, code, type, location, operating_hours
            FROM departments
            WHERE status = 'active'
            ORDER BY name ASC
        ");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    /**
     * Doctor list available for scheduling
     */
    public function getAvailableDoctors(int $deptId = 0): array
    {
        $pdo = Database::connection();

        $sql = "
            SELECT 
                e.id AS employee_id,
                CONCAT('Dr. ', e.first_name, ' ', e.last_name) AS full_name,
                e.email,
                e.phone,
                e.department_id,
                d.name AS department_name,
                p.id AS provider_id,
                p.specialty,
                p.license_number,
                p.prescribing_hold
            FROM employees e
            INNER JOIN users u ON e.user_id = u.id
            INNER JOIN roles r ON u.role_id = r.id
            LEFT JOIN departments d ON e.department_id = d.id
            LEFT JOIN providers p ON p.employee_id = e.id
            WHERE r.name IN ('doctor', 'admin') AND e.first_name NOT LIKE 'Patient%'
        ";

        $params = [];
        if ($deptId > 0) {
            $sql .= " AND (e.department_id = ? OR e.secondary_department_id = ?)";
            $params[] = $deptId;
            $params[] = $deptId;
        }

        $sql .= " ORDER BY e.last_name ASC, e.first_name ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
}
