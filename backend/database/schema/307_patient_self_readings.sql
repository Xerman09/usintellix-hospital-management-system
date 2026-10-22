-- ============================================================================
-- Migration: 307_patient_self_readings.sql
-- My Chart Phase 7: Track My Health -- the readings a patient takes at home.
--
-- These are deliberately NOT encounter_vitals. encounter_vitals is the clinical
-- record: taken by staff, on a hospital device, inside an encounter, and it feeds
-- BMI, NEWS2 and the quality measures. A number typed in by a patient from a
-- cuff of unknown accuracy must never be mistaken for that, so it lives in its
-- own table and every screen labels it "self-reported".
--
-- patient_self_readings  one row per reading. value_2 is only used by the kinds
--                        that need two numbers (blood pressure's diastolic).
-- patient_self_goals     the band the patient is aiming for, set by them or by
--                        their doctor. One active row per patient and kind.
-- portal_reading_safety_bands
--                        the hospital's own outer limits per kind. A reading
--                        outside them raises an AlertService alert to the care
--                        team rather than sitting unread in the portal, and the
--                        patient is told that it did. Thresholds are seeded (seed
--                        064) and meant to be reviewed by the hospital.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `patient_self_readings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `kind` ENUM('bp', 'weight', 'glucose', 'temperature', 'pain', 'steps', 'spo2') NOT NULL,
    `value_1` DECIMAL(8,2) NOT NULL,
    `value_2` DECIMAL(8,2) NULL DEFAULT NULL,
    `units` VARCHAR(20) NOT NULL,
    `taken_at` DATETIME NOT NULL,
    `note` VARCHAR(255) NULL DEFAULT NULL,
    `source` ENUM('patient', 'device') NOT NULL DEFAULT 'patient',
    `out_of_band` TINYINT(1) NOT NULL DEFAULT 0,
    `alert_id` INT NULL DEFAULT NULL,
    `alerted_at` DATETIME NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT NULL DEFAULT NULL,
    `updated_by` INT NULL DEFAULT NULL,
    `deleted_at` DATETIME NULL DEFAULT NULL,
    `deleted_by` INT NULL DEFAULT NULL,
    INDEX `idx_self_reading_patient_kind` (`patient_id`, `kind`, `taken_at`),
    INDEX `idx_self_reading_patient_time` (`patient_id`, `taken_at`),
    INDEX `idx_self_reading_out_of_band` (`out_of_band`, `alerted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `patient_self_goals` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `kind` ENUM('bp', 'weight', 'glucose', 'temperature', 'pain', 'steps', 'spo2') NOT NULL,
    `target_low` DECIMAL(8,2) NULL DEFAULT NULL,
    `target_high` DECIMAL(8,2) NULL DEFAULT NULL,
    `set_by` ENUM('patient', 'doctor') NOT NULL DEFAULT 'patient',
    `set_by_user_id` INT NULL DEFAULT NULL,
    `note` VARCHAR(255) NULL DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT NULL DEFAULT NULL,
    `updated_by` INT NULL DEFAULT NULL,
    INDEX `idx_self_goal_patient_kind` (`patient_id`, `kind`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per kind. A reading at or outside a *_low / *_high limit is out of band.
-- The second pair is for the kinds that carry two numbers (blood pressure), where
-- either number being out of band is enough.
CREATE TABLE IF NOT EXISTS `portal_reading_safety_bands` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `kind` ENUM('bp', 'weight', 'glucose', 'temperature', 'pain', 'steps', 'spo2') NOT NULL,
    `value_1_low` DECIMAL(8,2) NULL DEFAULT NULL,
    `value_1_high` DECIMAL(8,2) NULL DEFAULT NULL,
    `value_2_low` DECIMAL(8,2) NULL DEFAULT NULL,
    `value_2_high` DECIMAL(8,2) NULL DEFAULT NULL,
    `urgency` ENUM('info', 'urgent', 'critical') NOT NULL DEFAULT 'urgent',
    `patient_advice` VARCHAR(255) NULL DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_reading_safety_band_kind` (`kind`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
