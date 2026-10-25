-- =====================================================================
-- Migration 321: Doctor Professional Fee (PF) Schedules & Commission Engine
-- Tables: billing_doctor_fee_schedules, billing_doctor_commission_ledger, billing_doctor_payouts
-- Automatically credits doctor revenue share & commission accounts upon bill settlement.
-- =====================================================================

SET NAMES utf8mb4;

-- 1. Doctor Professional Fee Schedules
CREATE TABLE IF NOT EXISTS `billing_doctor_fee_schedules` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `schedule_code` VARCHAR(50) NOT NULL UNIQUE,
    `schedule_name` VARCHAR(150) NOT NULL,
    `doctor_id` INT NULL COMMENT 'Points to employees.id if physician-specific, NULL if default',
    `doctor_name` VARCHAR(150) NULL,
    `department_id` INT NULL COMMENT 'Points to departments.id if department-specific, NULL for all',
    `department_name` VARCHAR(100) NULL,
    `service_category` ENUM(
        'consultation',
        'daily_ward_round',
        'surgical_lead',
        'surgical_assistant',
        'anesthesiology',
        'diagnostic_reading',
        'emergency_call',
        'all_services'
    ) NOT NULL DEFAULT 'all_services',
    `item_code` VARCHAR(50) NULL COMMENT 'Optional specific tariff/procedure code',
    `split_type` ENUM('percentage', 'fixed_amount') NOT NULL DEFAULT 'percentage',
    `doctor_percentage` DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    `hospital_percentage` DECIMAL(5,2) NOT NULL DEFAULT 30.00,
    `fixed_doctor_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `fixed_hospital_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `withholding_tax_percent` DECIMAL(5,2) NOT NULL DEFAULT 10.00 COMMENT 'EWT tax deduction rate for doctors',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `priority` INT NOT NULL DEFAULT 10 COMMENT 'Higher number evaluated first',
    `notes` TEXT NULL,
    `created_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_dfs_doctor` (`doctor_id`),
    KEY `idx_dfs_dept` (`department_id`),
    KEY `idx_dfs_category` (`service_category`),
    KEY `idx_dfs_active` (`is_active`, `priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Doctor Payout Batches
CREATE TABLE IF NOT EXISTS `billing_doctor_payouts` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `payout_number` VARCHAR(50) NOT NULL UNIQUE,
    `doctor_id` INT NOT NULL,
    `doctor_name` VARCHAR(150) NOT NULL,
    `doctor_specialty` VARCHAR(100) NULL,
    `period_start` DATE NOT NULL,
    `period_end` DATE NOT NULL,
    `items_count` INT NOT NULL DEFAULT 0,
    `total_gross_pf` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_hospital_share` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_doctor_gross` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_tax_withheld` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `total_net_payout` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `payout_method` ENUM('bank_transfer', 'check', 'direct_deposit', 'cash_voucher') NOT NULL DEFAULT 'bank_transfer',
    `payment_reference` VARCHAR(100) NULL,
    `disbursed_by_user` VARCHAR(150) NULL,
    `status` ENUM('draft', 'approved', 'disbursed', 'cancelled') NOT NULL DEFAULT 'disbursed',
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_payout_doctor` (`doctor_id`),
    KEY `idx_payout_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Doctor Commission Ledger (Individual Credited PF Line Items)
CREATE TABLE IF NOT EXISTS `billing_doctor_commission_ledger` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `voucher_number` VARCHAR(50) NOT NULL UNIQUE,
    `schedule_id` INT UNSIGNED NULL,
    `doctor_id` INT NOT NULL,
    `doctor_name` VARCHAR(150) NOT NULL,
    `doctor_specialty` VARCHAR(100) NULL,
    `patient_id` INT NOT NULL,
    `patient_name` VARCHAR(150) NOT NULL,
    `folio_id` INT UNSIGNED NULL,
    `cashier_transaction_id` INT UNSIGNED NULL,
    `source_type` ENUM('inpatient_folio', 'cashier_transaction', 'ambulatory_encounter', 'or_surgery', 'manual_adjustment') NOT NULL DEFAULT 'cashier_transaction',
    `source_reference` VARCHAR(100) NULL,
    `item_code` VARCHAR(50) NULL,
    `service_description` VARCHAR(255) NOT NULL,
    `service_category` VARCHAR(50) NOT NULL DEFAULT 'consultation',
    
    -- Financial Split Breakdown
    `gross_pf_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `split_doctor_percent` DECIMAL(5,2) NOT NULL DEFAULT 70.00,
    `split_hospital_percent` DECIMAL(5,2) NOT NULL DEFAULT 30.00,
    `hospital_share_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `doctor_share_gross` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `withholding_tax_percent` DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    `withholding_tax_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `net_commission_payable` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    
    -- Settlement & Payout Status
    `settlement_status` ENUM('earned', 'approved_for_payout', 'disbursed', 'voided', 'disputed') NOT NULL DEFAULT 'earned',
    `payout_id` INT UNSIGNED NULL,
    `disbursement_reference` VARCHAR(100) NULL,
    `disbursed_at` DATETIME NULL,
    `settlement_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    KEY `idx_dcl_doctor` (`doctor_id`, `settlement_status`),
    KEY `idx_dcl_patient` (`patient_id`),
    KEY `idx_dcl_folio` (`folio_id`),
    KEY `idx_dcl_txn` (`cashier_transaction_id`),
    KEY `idx_dcl_payout` (`payout_id`),
    CONSTRAINT `fk_dcl_payout` FOREIGN KEY (`payout_id`) REFERENCES `billing_doctor_payouts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Sequence Counters in billing_tariff_counters
INSERT IGNORE INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
VALUES 
    ('DOC_COMMISSION', YEAR(NOW()), 0),
    ('DOC_PAYOUT', YEAR(NOW()), 0),
    ('FEE_SCHEDULE', YEAR(NOW()), 0);

-- Seed Default Baseline Fee Schedules
INSERT INTO `billing_doctor_fee_schedules` (
    `schedule_code`, `schedule_name`, `doctor_id`, `doctor_name`, `department_id`, `department_name`,
    `service_category`, `split_type`, `doctor_percentage`, `hospital_percentage`, `withholding_tax_percent`,
    `priority`, `notes`
) VALUES
(
    'DFS-STD-CONS-01',
    'Standard Outpatient Consultation (70/30 Split)',
    NULL, NULL, NULL, NULL,
    'consultation', 'percentage', 70.00, 30.00, 10.00,
    10, 'Universal default: 70% Doctor, 30% Hospital with 10% Withholding Tax'
),
(
    'DFS-INP-ROUNDS-01',
    'Inpatient Daily Ward Rounds (70/30 Split)',
    NULL, NULL, NULL, NULL,
    'daily_ward_round', 'percentage', 70.00, 30.00, 10.00,
    15, 'Standard ward attending rounds: 70% Doctor, 30% Hospital'
),
(
    'DFS-SURG-LEAD-01',
    'Major Surgery Lead Surgeon PF (75/25 Split)',
    NULL, NULL, NULL, 'Surgical Services',
    'surgical_lead', 'percentage', 75.00, 25.00, 10.00,
    20, 'Lead Operating Surgeon: 75% Doctor share, 25% Hospital share'
),
(
    'DFS-SURG-ANESTH-01',
    'Anesthesiology PF Schedule (80/20 Split)',
    NULL, NULL, NULL, 'Anesthesiology Department',
    'anesthesiology', 'percentage', 80.00, 20.00, 10.00,
    25, 'Specialized Anesthesia fee schedule: 80% Doctor, 20% Hospital'
),
(
    'DFS-SURG-ASST-01',
    'Assistant Surgeon PF Schedule (70/30 Split)',
    NULL, NULL, NULL, 'Surgical Services',
    'surgical_assistant', 'percentage', 70.00, 30.00, 10.00,
    20, 'Second / Assistant surgeon professional fee schedule'
),
(
    'DFS-DIAG-READ-01',
    'Diagnostic Imaging & Pathology Interpretation Reading (60/40 Split)',
    NULL, NULL, NULL, 'Diagnostics',
    'diagnostic_reading', 'percentage', 60.00, 40.00, 10.00,
    15, 'Radiology / Pathology professional reading share'
),
(
    'DFS-EMERG-CALL-01',
    'Emergency Department On-Call Specialist (80/20 Split)',
    NULL, NULL, NULL, 'Emergency Department',
    'emergency_call', 'percentage', 80.00, 20.00, 10.00,
    30, 'Urgent / STAT emergency on-call specialist fee'
),
(
    'DFS-DOC-ROSTOVA-01',
    'Dr. Elena Rostova - Chief Surgeon Senior Split (80/20)',
    102, 'Dr. Elena Rostova', NULL, 'Surgical Services',
    'surgical_lead', 'percentage', 80.00, 20.00, 10.00,
    80, 'Custom senior faculty split agreement for Dr. Rostova'
),
(
    'DFS-DOC-HAYES-01',
    'Dr. Jonathan Hayes - Interventional Cardiology Split (75/25)',
    103, 'Dr. Jonathan Hayes', NULL, 'Cardiology',
    'all_services', 'percentage', 75.00, 25.00, 10.00,
    70, 'Custom department agreement for Dr. Hayes'
)
ON DUPLICATE KEY UPDATE `schedule_name` = VALUES(`schedule_name`);
