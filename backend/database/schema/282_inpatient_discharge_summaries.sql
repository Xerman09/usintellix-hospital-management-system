-- ============================================================================
-- Migration: 282_inpatient_discharge_summaries.sql
-- Table: inpatient_discharge_summaries
-- Description: Comprehensive clinical discharge summaries for Inpatient ADT.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `inpatient_discharge_summaries` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `summary_number` VARCHAR(50) NOT NULL UNIQUE,
    `admission_id` INT UNSIGNED NOT NULL,
    `patient_id` INT UNSIGNED NOT NULL,
    `admitting_diagnosis` TEXT NOT NULL,
    `discharge_diagnosis` TEXT NOT NULL,
    `hospital_course_summary` LONGTEXT NOT NULL,
    `significant_procedures` TEXT NULL,
    `discharge_condition` ENUM('Recovered', 'Improved', 'Deteriorated', 'Against Medical Advice (AMA)', 'Expired') NOT NULL DEFAULT 'Improved',
    `discharge_disposition` VARCHAR(150) NOT NULL DEFAULT 'Discharged Home with Self-Care',
    `discharge_medications` LONGTEXT NULL,
    `diet_instructions` TEXT NULL,
    `activity_restrictions` TEXT NULL,
    `follow_up_instructions` TEXT NOT NULL,
    `attending_physician_id` INT UNSIGNED NULL,
    `attending_physician_name` VARCHAR(150) NOT NULL,
    `physician_license_number` VARCHAR(100) NULL,
    `electronic_signature` VARCHAR(255) NULL,
    `signature_date` DATETIME NULL,
    `is_finalized` TINYINT(1) NOT NULL DEFAULT 0,
    `created_by` INT UNSIGNED NULL,
    `updated_by` INT UNSIGNED NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL,
    INDEX `idx_ds_admission_id` (`admission_id`),
    INDEX `idx_ds_patient_id` (`patient_id`),
    INDEX `idx_ds_is_finalized` (`is_finalized`),
    CONSTRAINT `fk_ds_admission` FOREIGN KEY (`admission_id`) REFERENCES `inpatient_admissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
