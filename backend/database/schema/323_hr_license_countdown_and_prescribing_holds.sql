-- =====================================================================
-- Migration 323: Automated License Expiration Countdown & Prescribing Holds
-- Tables: hr_prescribing_holds, Alter providers
-- Automatically enforces 60-day, 30-day, and 7-day visual alerts,
-- with automatic prescribing holds if a physician's license or S2 narcotics permit lapses.
-- =====================================================================

SET NAMES utf8mb4;

-- 1. Alter providers to store license expiry and prescribing hold status
ALTER TABLE `providers`
    ADD COLUMN IF NOT EXISTS `license_expiry_date` DATE NULL AFTER `license_number`,
    ADD COLUMN IF NOT EXISTS `prescribing_hold` TINYINT(1) NOT NULL DEFAULT 0 AFTER `dea_number`,
    ADD COLUMN IF NOT EXISTS `prescribing_hold_reason` VARCHAR(255) NULL AFTER `prescribing_hold`,
    ADD COLUMN IF NOT EXISTS `prescribing_hold_at` DATETIME NULL AFTER `prescribing_hold_reason`;

-- 2. Prescribing Holds Ledger & Audit Log
CREATE TABLE IF NOT EXISTS `hr_prescribing_holds` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT NOT NULL,
    `provider_id` INT NULL,
    `doctor_name` VARCHAR(150) NOT NULL,
    `department_name` VARCHAR(100) NULL,
    `hold_type` ENUM(
        'all_prescriptions',
        'controlled_dangerous_drugs_only',
        'clinical_procedures_only'
    ) NOT NULL DEFAULT 'all_prescriptions',
    `trigger_reason` VARCHAR(255) NOT NULL,
    `trigger_credential_id` INT UNSIGNED NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `hold_started_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `override_granted` TINYINT(1) NOT NULL DEFAULT 0,
    `override_reason` VARCHAR(255) NULL,
    `override_by` VARCHAR(150) NULL,
    `override_expires_at` DATE NULL,
    `resolved_at` DATETIME NULL,
    `resolved_by` VARCHAR(150) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_hph_emp` (`employee_id`, `is_active`),
    KEY `idx_hph_type` (`hold_type`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
