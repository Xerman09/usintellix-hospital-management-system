<?php

require_once __DIR__ . '/../../app/Core/Autoload.php';
\App\Core\Env::load();

$pdo = \App\Core\Database::connection();

// Clean existing for clean seed
$pdo->exec("DELETE FROM hr_overtime_requests");
$pdo->exec("DELETE FROM hr_attendance_logs");

// Get active employees
$employees = $pdo->query("
    SELECT e.id, e.first_name, e.last_name, e.department_id, d.name AS dept_name
    FROM employees e
    LEFT JOIN departments d ON e.department_id = d.id
    WHERE e.id IN (101, 102, 103, 104, 105, 108, 109, 110, 111, 112)
    LIMIT 10
")->fetchAll(PDO::FETCH_ASSOC);

$dates = [];
for ($i = 10; $i >= 0; $i--) {
    $dates[] = date('Y-m-d', strtotime("-{$i} days"));
}

$count = 0;
$otCount = 0;

foreach ($dates as $dateIdx => $date) {
    $isToday = ($date === date('Y-m-d'));

    foreach ($employees as $empIdx => $emp) {
        $empId = (int)$emp['id'];
        $code = sprintf('ATT-%s-%05d', date('Ym', strtotime($date)), ++$count);

        // Pattern variety based on index
        $patternType = ($empIdx + $dateIdx) % 5;

        $schedStart = '08:00:00';
        $schedEnd   = '17:00:00';
        $breakMin   = 60;

        if ($patternType === 0) {
            // Standard on-time 8-hour shift
            $clockIn  = "{$date} 07:55:00";
            $clockOut = $isToday ? null : "{$date} 17:05:00";
            $totalHrs = $isToday ? 0.00 : 8.17;
            $regHrs   = $isToday ? 0.00 : 8.00;
            $otHrs    = $isToday ? 0.00 : 0.17;
            $tardy    = 0;
            $under    = 0;
            $ndHrs    = 0.00;
            $status   = 'present';
            $otStatus = 'none';
        } elseif ($patternType === 1) {
            // Late arrival (Tardiness 25 mins)
            $clockIn  = "{$date} 08:25:00";
            $clockOut = $isToday ? null : "{$date} 17:00:00";
            $totalHrs = $isToday ? 0.00 : 7.58;
            $regHrs   = $isToday ? 0.00 : 7.58;
            $otHrs    = 0.00;
            $tardy    = 25;
            $under    = 0;
            $ndHrs    = 0.00;
            $status   = 'late';
            $otStatus = 'none';
        } elseif ($patternType === 2) {
            // Heavy Overtime (Code blue / Emergency surgery: 11.5 hours worked)
            $clockIn  = "{$date} 07:50:00";
            $clockOut = $isToday ? null : "{$date} 20:20:00";
            $totalHrs = $isToday ? 0.00 : 11.50;
            $regHrs   = $isToday ? 0.00 : 8.00;
            $otHrs    = $isToday ? 0.00 : 3.50;
            $tardy    = 0;
            $under    = 0;
            $ndHrs    = 0.00;
            $status   = 'overtime';
            $otStatus = 'approved';
        } elseif ($patternType === 3) {
            // Night shift with Night Differential (22:00 to 06:00 window)
            $schedStart = '22:00:00';
            $schedEnd   = '07:00:00';
            $nextDay = date('Y-m-d', strtotime("{$date} +1 day"));
            $clockIn  = "{$date} 21:55:00";
            $clockOut = $isToday ? null : "{$nextDay} 07:00:00";
            $totalHrs = $isToday ? 0.00 : 8.08;
            $regHrs   = $isToday ? 0.00 : 8.00;
            $otHrs    = $isToday ? 0.00 : 0.08;
            $tardy    = 0;
            $under    = 0;
            $ndHrs    = $isToday ? 0.00 : 8.00; // Full 8h night differential
            $status   = 'present';
            $otStatus = 'none';
        } else {
            // Undertime / Early Departure (Emergency family leave, left 90 mins early)
            $clockIn  = "{$date} 08:00:00";
            $clockOut = $isToday ? null : "{$date} 15:30:00";
            $totalHrs = $isToday ? 0.00 : 6.50;
            $regHrs   = $isToday ? 0.00 : 6.50;
            $otHrs    = 0.00;
            $tardy    = 0;
            $under    = 90;
            $ndHrs    = 0.00;
            $status   = 'undertime';
            $otStatus = 'none';
        }

        $stmt = $pdo->prepare("
            INSERT INTO hr_attendance_logs (
                attendance_code, employee_id, clock_date, scheduled_start, scheduled_end,
                clock_in, clock_out, break_minutes, total_hours_worked, regular_hours,
                overtime_hours, tardiness_minutes, undertime_minutes, night_diff_hours,
                overtime_status, punch_method, status, remarks
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'web_console', ?, ?)
        ");
        $stmt->execute([
            $code,
            $empId,
            $date,
            $schedStart,
            $schedEnd,
            $clockIn,
            $clockOut,
            $breakMin,
            $totalHrs,
            $regHrs,
            $otHrs,
            $tardy,
            $under,
            $ndHrs,
            $otStatus,
            $status,
            $status === 'overtime' ? 'Emergency trauma resuscitation overtime' : ($status === 'late' ? 'Heavy traffic delayed punch' : null)
        ]);

        $logId = (int)$pdo->lastInsertId();

        // If overtime, insert an overtime request record
        if ($otHrs > 0 && !$isToday) {
            $otCode = sprintf('OT-%s-%05d', date('Ym', strtotime($date)), ++$otCount);
            $otStmt = $pdo->prepare("
                INSERT INTO hr_overtime_requests (
                    ot_code, employee_id, attendance_log_id, request_date, planned_ot_hours,
                    reason, status, approved_by, approved_at
                ) VALUES (?, ?, ?, ?, ?, 'Clinical staffing coverage and emergency resuscitation', 'approved', 1, CURRENT_TIMESTAMP)
            ");
            $otStmt->execute([$otCode, $empId, $logId, $date, $otHrs]);
        }
    }
}

$pdo->exec("UPDATE billing_tariff_counters SET last_number = {$count} WHERE counter_type = 'ATTENDANCE_LOG' AND year = 2026");
$pdo->exec("UPDATE billing_tariff_counters SET last_number = {$otCount} WHERE counter_type = 'OVERTIME_REQ' AND year = 2026");

echo "Seeded {$count} staff attendance logs and {$otCount} overtime authorizations successfully!\n";
