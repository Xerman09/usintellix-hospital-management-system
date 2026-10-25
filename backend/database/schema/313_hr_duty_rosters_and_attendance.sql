-- ============================================================================
-- Migration: 313_hr_duty_rosters_and_attendance.sql
-- Description: Doctor On-Call & Duty Rostering, Shift Swaps, Staff Attendance & Leave
-- ============================================================================

-- 1. Doctor On-Call Shift Templates / Catalog
CREATE TABLE IF NOT EXISTS hr_duty_roster_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    department_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    shift_type ENUM('morning', 'evening', 'night', 'full_day_24h', 'custom') NOT NULL DEFAULT 'full_day_24h',
    call_role ENUM('primary_on_call', 'secondary_on_call', 'er_backup', 'icu_consultant', 'rounding_physician') NOT NULL DEFAULT 'primary_on_call',
    start_time TIME NOT NULL DEFAULT '08:00:00',
    end_time TIME NOT NULL DEFAULT '08:00:00',
    color_hex VARCHAR(20) NOT NULL DEFAULT '#0284c7',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_hdrt_dept (department_id),
    CONSTRAINT fk_hdrt_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Master Doctor On-Call & Duty Rosters
CREATE TABLE IF NOT EXISTS hr_duty_rosters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    roster_code VARCHAR(32) NOT NULL UNIQUE,
    department_id INT NOT NULL,
    employee_id INT NOT NULL,
    provider_id INT NULL,
    shift_date DATE NOT NULL,
    shift_type ENUM('morning', 'evening', 'night', 'full_day_24h', 'custom') NOT NULL DEFAULT 'full_day_24h',
    start_time TIME NOT NULL DEFAULT '08:00:00',
    end_time TIME NOT NULL DEFAULT '08:00:00',
    call_role ENUM('primary_on_call', 'secondary_on_call', 'er_backup', 'icu_consultant', 'rounding_physician') NOT NULL DEFAULT 'primary_on_call',
    contact_override_phone VARCHAR(50) NULL,
    pager_number VARCHAR(50) NULL,
    status ENUM('scheduled', 'confirmed', 'active', 'completed', 'swapped', 'absent', 'cancelled') NOT NULL DEFAULT 'scheduled',
    swap_with_roster_id INT NULL,
    swap_reason VARCHAR(255) NULL,
    notes TEXT NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT NULL,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_hdr_dept_date (department_id, shift_date),
    KEY idx_hdr_emp_date (employee_id, shift_date),
    KEY idx_hdr_role_date (call_role, shift_date),
    KEY idx_hdr_status (status),
    CONSTRAINT fk_hdr_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hdr_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_hdr_prov FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE SET NULL,
    CONSTRAINT fk_hdr_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Shift Swap Workflow Requests
CREATE TABLE IF NOT EXISTS hr_duty_roster_swaps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    swap_code VARCHAR(32) NOT NULL UNIQUE,
    original_roster_id INT NOT NULL,
    requesting_employee_id INT NOT NULL,
    target_employee_id INT NOT NULL,
    target_roster_id INT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending_peer', 'pending_approval', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending_approval',
    requested_by_user_id INT NULL,
    approved_by_user_id INT NULL,
    actioned_at DATETIME NULL,
    rejection_reason VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_hdrs_orig (original_roster_id),
    KEY idx_hdrs_req_emp (requesting_employee_id),
    KEY idx_hdrs_tgt_emp (target_employee_id),
    KEY idx_hdrs_status (status),
    CONSTRAINT fk_hdrs_orig FOREIGN KEY (original_roster_id) REFERENCES hr_duty_rosters(id) ON DELETE CASCADE,
    CONSTRAINT fk_hdrs_req_emp FOREIGN KEY (requesting_employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_hdrs_tgt_emp FOREIGN KEY (target_employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_hdrs_appr FOREIGN KEY (approved_by_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Staff Time-Clock Attendance Logs
CREATE TABLE IF NOT EXISTS hr_staff_attendance_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    clock_date DATE NOT NULL,
    clock_in DATETIME NOT NULL,
    clock_out DATETIME NULL,
    clock_in_method ENUM('web_portal', 'biometric', 'qr_badge', 'manual_adjustment') NOT NULL DEFAULT 'web_portal',
    status ENUM('on_time', 'late', 'early_departure', 'half_day', 'overtime') NOT NULL DEFAULT 'on_time',
    remarks VARCHAR(255) NULL,
    verified_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_hsal_emp_date (employee_id, clock_date),
    KEY idx_hsal_status (status),
    CONSTRAINT fk_hsal_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_hsal_ver FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Staff Leave Management
CREATE TABLE IF NOT EXISTS hr_staff_leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    leave_code VARCHAR(32) NOT NULL UNIQUE,
    employee_id INT NOT NULL,
    leave_type ENUM('sick', 'vacation', 'emergency', 'maternity_paternity', 'cme_study', 'bereavement', 'unpaid') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4,1) NOT NULL DEFAULT 1.0,
    coverage_employee_id INT NULL,
    reason TEXT NOT NULL,
    status ENUM('pending_approval', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending_approval',
    approved_by INT NULL,
    approved_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_hslr_emp (employee_id),
    KEY idx_hslr_dates (start_date, end_date),
    KEY idx_hslr_status (status),
    CONSTRAINT fk_hslr_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_hslr_cov FOREIGN KEY (coverage_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
    CONSTRAINT fk_hslr_appr FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Sequence Counter for Roster Code and Swap Code
INSERT INTO billing_tariff_counters (counter_type, year, last_number)
VALUES ('DUTY_ROSTER', 2026, 0), ('ROSTER_SWAP', 2026, 0), ('STAFF_LEAVE', 2026, 0)
ON DUPLICATE KEY UPDATE counter_type = VALUES(counter_type);

-- Seed Default Shift Templates for Clinical Departments
INSERT INTO hr_duty_roster_templates (department_id, name, shift_type, call_role, start_time, end_time, color_hex, is_active)
VALUES
-- Cardiology (Dept 4)
(4, 'Cardiology Primary 24h Attending', 'full_day_24h', 'primary_on_call', '08:00:00', '08:00:00', '#059669', 1),
(4, 'Cardiology Fellow / Secondary On-Call', 'night', 'secondary_on_call', '17:00:00', '08:00:00', '#0284c7', 1),
(4, 'Cardiology ER Cath Lab Emergency Backup', 'evening', 'er_backup', '16:00:00', '00:00:00', '#d97706', 1),

-- General Surgery (Dept 6)
(6, 'General Surgery Primary 24h Trauma Call', 'full_day_24h', 'primary_on_call', '08:00:00', '08:00:00', '#059669', 1),
(6, 'General Surgery Secondary Attending Backup', 'night', 'secondary_on_call', '18:00:00', '08:00:00', '#0284c7', 1),
(6, 'General Surgery Acute Laparoscopy ER Backup', 'night', 'er_backup', '20:00:00', '08:00:00', '#dc2626', 1),

-- Pediatrics (Dept 5)
(5, 'Pediatrics Primary Attending On-Call', 'full_day_24h', 'primary_on_call', '08:00:00', '08:00:00', '#059669', 1),
(5, 'NICU / Pediatric ER Resuscitation Backup', 'night', 'er_backup', '18:00:00', '08:00:00', '#d97706', 1),

-- Emergency Medicine (Dept 2)
(2, 'Emergency Medicine Lead Attending Day', 'morning', 'primary_on_call', '07:00:00', '15:00:00', '#059669', 1),
(2, 'Emergency Medicine Lead Attending Evening', 'evening', 'primary_on_call', '15:00:00', '23:00:00', '#0284c7', 1),
(2, 'Emergency Medicine Lead Attending Night', 'night', 'primary_on_call', '23:00:00', '07:00:00', '#7c3aed', 1),

-- ICU (Dept 7)
(7, 'Intensive Care Unit (ICU) Primary Intensivist', 'full_day_24h', 'primary_on_call', '08:00:00', '08:00:00', '#7c3aed', 1),
(7, 'ICU Critical Care Escalation Backup', 'night', 'icu_consultant', '20:00:00', '08:00:00', '#9333ea', 1)
ON DUPLICATE KEY UPDATE name = VALUES(name);
