-- ============================================================================
-- Migration: 314_hr_leave_management.sql
-- Description: Leave Requests, Covering Colleague Assignment, Supervisor Approvals,
--              and Annual Leave Quota Balances
-- ============================================================================

-- 1. Annual Leave Quota Balances Per Employee
CREATE TABLE IF NOT EXISTS hr_leave_quota_balances (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    year INT NOT NULL,
    leave_type ENUM('vacation', 'sick', 'emergency', 'study_cme', 'maternity_paternity', 'bereavement', 'unpaid') NOT NULL,
    total_entitled DECIMAL(4,1) NOT NULL DEFAULT 15.0,
    carried_over DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    used_days DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    pending_days DECIMAL(4,1) NOT NULL DEFAULT 0.0,
    remaining_balance DECIMAL(4,1) NOT NULL DEFAULT 15.0,
    notes VARCHAR(255) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_hlqb_emp_yr_type (employee_id, year, leave_type),
    KEY idx_hlqb_emp (employee_id),
    KEY idx_hlqb_year (year),
    CONSTRAINT fk_hlqb_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Master Leave Requests & Coverage Workflow
CREATE TABLE IF NOT EXISTS hr_leave_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    leave_code VARCHAR(32) NOT NULL UNIQUE,
    employee_id INT NOT NULL,
    department_id INT NOT NULL,
    leave_type ENUM('vacation', 'sick', 'emergency', 'study_cme', 'maternity_paternity', 'bereavement', 'unpaid') NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days DECIMAL(4,1) NOT NULL DEFAULT 1.0,
    covering_employee_id INT NULL,
    coverage_status ENUM('not_required', 'pending_colleague_ack', 'acknowledged', 'declined') NOT NULL DEFAULT 'pending_colleague_ack',
    coverage_notes TEXT NULL,
    reason TEXT NOT NULL,
    attachment_url VARCHAR(255) NULL,
    status ENUM('draft', 'pending_approval', 'approved', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending_approval',
    supervisor_id INT NULL,
    approved_at DATETIME NULL,
    rejection_reason VARCHAR(255) NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_hlr_emp (employee_id),
    KEY idx_hlr_dept (department_id),
    KEY idx_hlr_cov_emp (covering_employee_id),
    KEY idx_hlr_dates (start_date, end_date),
    KEY idx_hlr_status (status),
    CONSTRAINT fk_hlr_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_hlr_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_hlr_cov_emp FOREIGN KEY (covering_employee_id) REFERENCES employees(id) ON DELETE SET NULL,
    CONSTRAINT fk_hlr_sup FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_hlr_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Sequence Counter for Leave Requests
INSERT INTO billing_tariff_counters (counter_type, year, last_number)
VALUES ('LEAVE_REQUEST', 2026, 0)
ON DUPLICATE KEY UPDATE counter_type = VALUES(counter_type);
