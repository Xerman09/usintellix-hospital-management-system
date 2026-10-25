-- =====================================================================
-- Migration 316: Payroll Runs & Employee Payslips Computation Engine
-- Tables: hr_payroll_runs, hr_payslips, hr_payslip_items
-- Formula: 
--   "Gross Pay" = "Base Salary" + "Overtime" + "Night Diff" + "Allowances" + "Doctor Commissions"
--   "Net Pay" = "Gross Pay" - ("Tax Withholdings" + "Social Security/Health Ins" + "Deductions")
-- =====================================================================

SET NAMES utf8mb4;

-- 1. Master Payroll Runs Table
CREATE TABLE IF NOT EXISTS `hr_payroll_runs` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `run_number` VARCHAR(50) NOT NULL UNIQUE,
    `title` VARCHAR(150) NOT NULL,
    `pay_frequency` ENUM('semi_monthly', 'monthly', 'bi_weekly', 'weekly') NOT NULL DEFAULT 'semi_monthly',
    `period_start` DATE NOT NULL,
    `period_end` DATE NOT NULL,
    `payout_date` DATE NOT NULL,
    `department_id` INT NULL COMMENT 'NULL for Hospital-Wide Run',
    `total_employees` INT NOT NULL DEFAULT 0,
    
    -- Hospital-wide Aggregated Earnings
    `total_base_pay` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `total_overtime_pay` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `total_night_diff_pay` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `total_on_call_stipends` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `total_allowances` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `total_doctor_commissions` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `total_gross_pay` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    
    -- Hospital-wide Aggregated Deductions
    `total_withholding_tax` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `total_social_security` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `total_health_insurance` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `total_other_deductions` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    `total_deductions` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    
    -- Net Pay Outflow
    `total_net_pay` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    
    `status` ENUM('draft', 'calculated', 'approved', 'disbursed', 'cancelled') NOT NULL DEFAULT 'draft',
    `disbursed_at` DATETIME NULL,
    `disbursed_by` INT NULL,
    `approved_at` DATETIME NULL,
    `approved_by` INT NULL,
    `notes` TEXT NULL,
    `created_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_pr_period` (`period_start`, `period_end`),
    KEY `idx_pr_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Individual Employee Payslips Table
CREATE TABLE IF NOT EXISTS `hr_payslips` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `payroll_run_id` INT UNSIGNED NOT NULL,
    `payslip_number` VARCHAR(50) NOT NULL UNIQUE,
    `employee_id` INT NOT NULL,
    `salary_structure_id` INT NULL,
    `staff_name` VARCHAR(150) NOT NULL,
    `department_name` VARCHAR(100) NULL,
    `job_title` VARCHAR(100) NULL,
    `employment_type` VARCHAR(50) NOT NULL,
    `pay_frequency` VARCHAR(30) NOT NULL DEFAULT 'semi_monthly',
    `period_start` DATE NOT NULL,
    `period_end` DATE NOT NULL,
    `payout_date` DATE NOT NULL,
    `hourly_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    
    -- EARNINGS: "Gross Pay" = "Base Salary" + "Overtime" + "Night Diff" + "Allowances" + "Doctor Commissions"
    `base_salary_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `regular_hours_worked` DECIMAL(8,2) NOT NULL DEFAULT 80.00,
    `overtime_hours` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    `overtime_rate_multiplier` DECIMAL(4,2) NOT NULL DEFAULT 1.25,
    `overtime_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `night_diff_hours` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    `night_diff_rate_multiplier` DECIMAL(4,2) NOT NULL DEFAULT 1.30,
    `night_diff_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `rest_day_hours` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    `rest_day_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `holiday_hours` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    `holiday_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `on_call_shifts` INT NOT NULL DEFAULT 0,
    `on_call_stipend_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `fixed_allowances_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `housing_allowance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `transportation_allowance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `medical_allowance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `meal_allowance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `uniform_allowance` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    `doctor_commissions_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00 COMMENT 'Pulled from billing_doctor_commission_ledger',
    `other_earnings_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `gross_pay` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    
    -- DEDUCTIONS: ("Tax Withholdings" + "Social Security/Health Ins" + "Deductions")
    `withholding_tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `social_security_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `health_insurance_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `retirement_contribution_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `tardiness_deduction_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `undertime_deduction_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `cash_advance_deduction` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `other_deductions_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_deductions` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    
    -- NET PAY: "Net Pay" = "Gross Pay" - "Total Deductions"
    `net_pay` DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    
    -- Confidential & Banking Details
    `bank_name` VARCHAR(100) NULL,
    `bank_account_no` VARCHAR(50) NULL,
    `payment_method` VARCHAR(50) NOT NULL DEFAULT 'direct_deposit',
    `tin_number` VARCHAR(50) NULL,
    `verification_hash` VARCHAR(64) NULL,
    
    `status` ENUM('draft', 'generated', 'approved', 'paid', 'cancelled') NOT NULL DEFAULT 'generated',
    `paid_at` DATETIME NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_ps_run` (`payroll_run_id`),
    KEY `idx_ps_emp` (`employee_id`),
    KEY `idx_ps_period` (`period_start`, `period_end`),
    KEY `idx_ps_status` (`status`),
    CONSTRAINT `fk_ps_run` FOREIGN KEY (`payroll_run_id`) REFERENCES `hr_payroll_runs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Itemized Payslip Line Items (Auditable Earnings & Deductions)
CREATE TABLE IF NOT EXISTS `hr_payslip_items` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `payslip_id` INT UNSIGNED NOT NULL,
    `item_type` ENUM('earning', 'deduction') NOT NULL,
    `category` VARCHAR(50) NOT NULL,
    `item_name` VARCHAR(150) NOT NULL,
    `rate` DECIMAL(10,2) NULL,
    `quantity` DECIMAL(8,2) NULL,
    `amount` DECIMAL(12,2) NOT NULL,
    `notes` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_psi_payslip` (`payslip_id`),
    KEY `idx_psi_type` (`item_type`, `category`),
    CONSTRAINT `fk_psi_payslip` FOREIGN KEY (`payslip_id`) REFERENCES `hr_payslips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Sequence Counters
INSERT IGNORE INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
VALUES 
    ('PAYROLL_RUN', YEAR(NOW()), 0),
    ('PAYSLIP_NO', YEAR(NOW()), 0);
