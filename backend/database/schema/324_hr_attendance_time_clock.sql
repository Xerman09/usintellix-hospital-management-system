-- ============================================================================
-- Migration: 324_hr_attendance_time_clock.sql
-- Description: Staff Attendance Time Clock, Web Punch Console, Hours Calculation,
--              Tardiness, Undertime, Overtime, and Night-Shift Differential Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS hr_attendance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    attendance_code VARCHAR(32) NOT NULL UNIQUE,
    employee_id INT NOT NULL,
    clock_date DATE NOT NULL,
    scheduled_start TIME NULL DEFAULT '08:00:00',
    scheduled_end TIME NULL DEFAULT '17:00:00',
    clock_in DATETIME NOT NULL,
    clock_out DATETIME NULL,
    break_start DATETIME NULL,
    break_end DATETIME NULL,
    break_minutes INT NOT NULL DEFAULT 0,
    total_hours_worked DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    regular_hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    overtime_hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    tardiness_minutes INT NOT NULL DEFAULT 0,
    undertime_minutes INT NOT NULL DEFAULT 0,
    night_diff_hours DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    overtime_status ENUM('none', 'pending_approval', 'approved', 'rejected') NOT NULL DEFAULT 'none',
    punch_method ENUM('web_console', 'biometric', 'qr_badge', 'mobile_gps', 'manual_adjustment') NOT NULL DEFAULT 'web_console',
    status ENUM('present', 'late', 'undertime', 'overtime', 'half_day', 'absent', 'on_leave') NOT NULL DEFAULT 'present',
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    remarks TEXT NULL,
    verified_by INT NULL,
    verified_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_hal_emp_date (employee_id, clock_date),
    KEY idx_hal_date (clock_date),
    KEY idx_hal_status (status),
    KEY idx_hal_ot_status (overtime_status),
    CONSTRAINT fk_hal_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_hal_ver FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_overtime_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ot_code VARCHAR(32) NOT NULL UNIQUE,
    employee_id INT NOT NULL,
    attendance_log_id INT NULL,
    request_date DATE NOT NULL,
    planned_ot_hours DECIMAL(4,2) NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    approved_by INT NULL,
    approved_at DATETIME NULL,
    rejection_reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_hor_emp (employee_id),
    KEY idx_hor_date (request_date),
    KEY idx_hor_status (status),
    CONSTRAINT fk_hor_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_hor_att FOREIGN KEY (attendance_log_id) REFERENCES hr_attendance_logs(id) ON DELETE SET NULL,
    CONSTRAINT fk_hor_appr FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Sequence Counters
INSERT INTO billing_tariff_counters (counter_type, year, last_number)
VALUES ('ATTENDANCE_LOG', 2026, 0), ('OVERTIME_REQ', 2026, 0)
ON DUPLICATE KEY UPDATE counter_type = VALUES(counter_type);
