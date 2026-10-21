-- ========================================================
-- Migration: 287_inpatient_daily_rounds.sql
-- Module: Inpatient Department (IPD) Management
-- Purpose: Daily Doctor Ward Rounds (inpatient_daily_rounds).
--          Captures structured daily ward round documentation for hospitalized
--          patients: Round Date/Time, Rounding Physician, Clinical Trajectory
--          (Critical, Guarded, Stable, Improving, Discharge Ready), Subjective
--          observations, Objective physical exam, Clinical Assessment,
--          Daily Treatment Plan, Diet, Activity, and Target Discharge Date.
-- ========================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `inpatient_daily_rounds` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `round_number` VARCHAR(50) NOT NULL UNIQUE,
    `admission_id` INT UNSIGNED NOT NULL,
    `patient_id` INT UNSIGNED NOT NULL,
    `round_datetime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `rounding_physician_id` INT UNSIGNED NULL,
    `rounding_physician_name` VARCHAR(150) NOT NULL,
    
    -- Clinical Trajectory
    `clinical_trajectory` ENUM('Critical', 'Guarded', 'Stable', 'Improving', 'Discharge Ready') NOT NULL DEFAULT 'Stable',
    
    -- Clinical Documentation (SOAP / Ward Round)
    `subjective` TEXT NULL,
    `objective` TEXT NULL,
    `assessment` TEXT NOT NULL,
    `plan` TEXT NOT NULL,
    
    -- Daily Orders & Hospital Course Parameters
    `diet_order` VARCHAR(150) NULL DEFAULT 'Regular Diet',
    `activity_order` VARCHAR(150) NULL DEFAULT 'Ambulate as tolerated',
    `target_discharge_date` DATE NULL,
    
    -- Status & Audit Trail
    `is_finalized` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by` INT UNSIGNED NULL,
    `updated_by` INT UNSIGNED NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL,
    
    INDEX `idx_daily_rounds_admission` (`admission_id`),
    INDEX `idx_daily_rounds_patient` (`patient_id`),
    INDEX `idx_daily_rounds_datetime` (`round_datetime`),
    INDEX `idx_daily_rounds_trajectory` (`clinical_trajectory`),
    INDEX `idx_daily_rounds_physician` (`rounding_physician_id`),
    INDEX `idx_daily_rounds_deleted` (`deleted_at`),
    
    CONSTRAINT `fk_daily_rounds_admission`
        FOREIGN KEY (`admission_id`)
        REFERENCES `inpatient_admissions` (`id`)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
