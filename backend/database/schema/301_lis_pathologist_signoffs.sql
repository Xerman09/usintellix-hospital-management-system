-- ========================================================
-- Migration: 301_lis_pathologist_signoffs.sql
-- Module: Laboratory Information System (LIS) > Pathologist Verification & Amendment Log
-- Purpose: Two-step lab validation workflow:
--          Step 1: Medical Technologist analytical verification -> preliminary_verified
--          Step 2: Board-certified Pathologist clinical sign-off -> pathologist_approved
--          Maintains immutable audit trail for result amendments & corrections.
-- ========================================================

SET NAMES utf8mb4;

-- 1. Master Pathologist & Analytical Verification Records
CREATE TABLE IF NOT EXISTS `lis_result_verifications` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id` INT NOT NULL,
    `result_set_id` INT NULL DEFAULT NULL,
    `patient_id` INT NOT NULL,
    `test_name` VARCHAR(255) NOT NULL,
    `verification_status` ENUM('preliminary_verified', 'pathologist_approved', 'pathologist_returned', 'amended') NOT NULL DEFAULT 'preliminary_verified',
    `medtech_user_id` INT NULL DEFAULT NULL,
    `medtech_verified_at` DATETIME NULL DEFAULT NULL,
    `medtech_license_no` VARCHAR(50) NULL DEFAULT NULL,
    `pathologist_user_id` INT NULL DEFAULT NULL,
    `pathologist_signed_at` DATETIME NULL DEFAULT NULL,
    `pathologist_license_no` VARCHAR(50) NULL DEFAULT NULL,
    `pathologist_narrative` TEXT NULL DEFAULT NULL,
    `is_critical` TINYINT(1) NOT NULL DEFAULT 0,
    `critical_alert_notes` VARCHAR(500) NULL DEFAULT NULL,
    `is_amended` TINYINT(1) NOT NULL DEFAULT 0,
    `amendment_count` SMALLINT NOT NULL DEFAULT 0,
    `amendment_reason` VARCHAR(500) NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_lrv_order` (`order_id`),
    KEY `idx_lrv_set` (`result_set_id`),
    KEY `idx_lrv_patient` (`patient_id`),
    KEY `idx_lrv_status` (`verification_status`),
    KEY `idx_lrv_pathologist` (`pathologist_user_id`),
    CONSTRAINT `fk_lrv_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Comprehensive Result Amendment & Correction Audit Trail
CREATE TABLE IF NOT EXISTS `lis_result_amendment_logs` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `verification_id` INT UNSIGNED NOT NULL,
    `order_id` INT NOT NULL,
    `amendment_number` SMALLINT NOT NULL DEFAULT 1,
    `previous_status` VARCHAR(50) NOT NULL,
    `new_status` VARCHAR(50) NOT NULL,
    `amended_by_user_id` INT NOT NULL,
    `amended_at` DATETIME NOT NULL,
    `amendment_reason` VARCHAR(500) NOT NULL,
    `previous_values_json` JSON NOT NULL,
    `new_values_json` JSON NOT NULL,
    `pathologist_reapproval_user_id` INT NULL DEFAULT NULL,
    `pathologist_reapproval_at` DATETIME NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_lral_verif` (`verification_id`),
    KEY `idx_lral_order` (`order_id`),
    CONSTRAINT `fk_lral_verif` FOREIGN KEY (`verification_id`) REFERENCES `lis_result_verifications` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Extend lab_result_sets to support two-tier verification stages
ALTER TABLE `lab_result_sets`
    ADD COLUMN IF NOT EXISTS `verification_stage` ENUM('tech_draft', 'preliminary_verified', 'pathologist_approved', 'amended', 'returned') NOT NULL DEFAULT 'tech_draft' AFTER `status`,
    ADD COLUMN IF NOT EXISTS `pathologist_user_id` INT NULL AFTER `verified_by`,
    ADD COLUMN IF NOT EXISTS `pathologist_signed_at` DATETIME NULL AFTER `pathologist_user_id`,
    ADD COLUMN IF NOT EXISTS `pathologist_notes` TEXT NULL AFTER `pathologist_signed_at`;

-- 4. Extend lab_staff to distinguish Pathologists from Medical Technologists
ALTER TABLE `lab_staff`
    ADD COLUMN IF NOT EXISTS `is_pathologist` TINYINT(1) NOT NULL DEFAULT 0 AFTER `med_tech`,
    ADD COLUMN IF NOT EXISTS `pathologist_title` VARCHAR(100) DEFAULT 'Consultant Clinical Pathologist' AFTER `license_no`;

-- 5. Seed default Pathologist and Medical Technologist staff profiles
INSERT INTO `lab_staff` (`user_id`, `med_tech`, `is_pathologist`, `license_no`, `pathologist_title`, `updated_at`)
VALUES
(1, 1, 1, 'PRC-MED-0098412', 'Chief of Clinical Pathology', NOW()),
(10, 0, 1, 'PRC-MD-0077421', 'Consultant Pathologist & Hematopathologist', NOW())
ON DUPLICATE KEY UPDATE
    `med_tech` = VALUES(`med_tech`),
    `is_pathologist` = VALUES(`is_pathologist`),
    `license_no` = VALUES(`license_no`),
    `pathologist_title` = VALUES(`pathologist_title`),
    `updated_at` = NOW();
