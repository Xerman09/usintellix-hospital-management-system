-- ============================================================================
-- Migration: 315_hr_salary_structures.sql
-- Description: Staff & Physician Salary Structures, Base Pay, Hourly Rates,
--              Fixed Allowances, and Overtime Rate Multipliers
-- ============================================================================

CREATE TABLE IF NOT EXISTS hr_salary_structures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    structure_code VARCHAR(32) NOT NULL UNIQUE,
    employee_id INT NOT NULL,
    employment_type ENUM('regular_fulltime', 'part_time', 'consultant_physician', 'resident_physician', 'probationary', 'contractual') NOT NULL DEFAULT 'regular_fulltime',
    pay_frequency ENUM('semi_monthly', 'monthly', 'bi_weekly', 'weekly') NOT NULL DEFAULT 'semi_monthly',
    base_salary DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    hourly_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    daily_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- Fixed Allowances
    housing_allowance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    transportation_allowance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    medical_allowance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    meal_allowance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    uniform_allowance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    on_call_stipend_rate DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total_fixed_allowances DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    
    -- Overtime & Differential Multipliers
    overtime_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.25,
    night_diff_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.30,
    rest_day_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.50,
    holiday_multiplier DECIMAL(4,2) NOT NULL DEFAULT 2.00,
    emergency_recall_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.50,
    
    -- Statutory & Banking details
    tax_status VARCHAR(50) NOT NULL DEFAULT 'standard_withholding',
    tin_number VARCHAR(50) NULL,
    sss_number VARCHAR(50) NULL,
    philhealth_number VARCHAR(50) NULL,
    pagibig_number VARCHAR(50) NULL,
    bank_name VARCHAR(100) NULL,
    bank_account_no VARCHAR(50) NULL,
    payment_method ENUM('direct_deposit', 'check', 'cash') NOT NULL DEFAULT 'direct_deposit',
    
    -- Governance & Audit
    effective_date DATE NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    notes TEXT NULL,
    created_by INT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT NULL,
    updated_at DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    
    UNIQUE KEY uq_hss_emp (employee_id),
    KEY idx_hss_type (employment_type),
    KEY idx_hss_active (is_active),
    CONSTRAINT fk_hss_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    CONSTRAINT fk_hss_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS hr_salary_components (
    id INT AUTO_INCREMENT PRIMARY KEY,
    salary_structure_id INT NOT NULL,
    component_name VARCHAR(100) NOT NULL,
    component_type ENUM('earning', 'allowance', 'deduction', 'stipend') NOT NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_taxable TINYINT(1) NOT NULL DEFAULT 1,
    frequency ENUM('every_pay_period', 'monthly', 'quarterly', 'one_time') NOT NULL DEFAULT 'every_pay_period',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_hsc_struct (salary_structure_id),
    CONSTRAINT fk_hsc_struct FOREIGN KEY (salary_structure_id) REFERENCES hr_salary_structures(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Sequence Counter
INSERT INTO billing_tariff_counters (counter_type, year, last_number)
VALUES ('SALARY_STRUCTURE', 2026, 0)
ON DUPLICATE KEY UPDATE counter_type = VALUES(counter_type);
