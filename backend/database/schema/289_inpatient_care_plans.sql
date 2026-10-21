-- ====================================================================
-- SCHEMA MIGRATION: 289_inpatient_care_plans.sql
-- Structured Nursing Care Plans (NANDA-I, NOC Goals, NIC Interventions & Shift Evaluations)
-- Hospital Accreditation & JCAHO Nursing Documentation Standard
-- ====================================================================

CREATE TABLE IF NOT EXISTS `inpatient_care_plans` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `care_plan_number` VARCHAR(32) NOT NULL UNIQUE,
    `admission_id` INT UNSIGNED NOT NULL,
    `patient_id` INT UNSIGNED NOT NULL,
    `plan_datetime` DATETIME NOT NULL,
    `shift` VARCHAR(40) NOT NULL DEFAULT 'Day Shift (07:00-15:00)' COMMENT 'Day Shift (07:00-15:00), Evening Shift (15:00-23:00), Night Shift (23:00-07:00)',
    `nurse_id` INT UNSIGNED NULL COMMENT 'User ID of initiating nurse',
    `nurse_name` VARCHAR(150) NOT NULL COMMENT 'Display name of initiating nurse',
    `nurse_credentials` VARCHAR(80) NULL DEFAULT 'RN, BSN',
    `priority_level` ENUM('High / Acute', 'Medium / Standard', 'Low / Maintenance') NOT NULL DEFAULT 'Medium / Standard',
    `nanda_code` VARCHAR(32) NULL COMMENT 'NANDA-I taxonomy code e.g. 00132, 00032, 00004',
    `nanda_domain` VARCHAR(100) NULL COMMENT 'NANDA-I domain e.g. Comfort, Safety/Protection, Activity/Rest',
    `nursing_diagnosis` VARCHAR(255) NOT NULL COMMENT 'NANDA nursing diagnosis statement',
    `related_to` TEXT NULL COMMENT 'Etiology / Related to (R/T) factors',
    `as_evidenced_by` TEXT NULL COMMENT 'Defining characteristics / As evidenced by (AEB)',
    `measurable_goals` TEXT NOT NULL COMMENT 'SMART / NOC measurable patient outcomes and target timeframe',
    `nursing_interventions` TEXT NOT NULL COMMENT 'NIC independent and collaborative nursing interventions',
    `rationale` TEXT NULL COMMENT 'Evidence-based clinical rationale for interventions',
    `evaluation_status` ENUM('In Progress', 'Goal Met', 'Partially Met', 'Unmet/Revised') NOT NULL DEFAULT 'In Progress',
    `shift_evaluation_notes` TEXT NULL COMMENT 'Shift evaluation commentary, patient response, and care plan revisions',
    `evaluated_by` INT UNSIGNED NULL,
    `evaluated_by_name` VARCHAR(150) NULL,
    `evaluated_at` DATETIME NULL,
    `created_by` INT UNSIGNED NULL,
    `updated_by` INT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_ncp_admission` (`admission_id`),
    INDEX `idx_ncp_patient` (`patient_id`),
    INDEX `idx_ncp_eval_status` (`evaluation_status`),
    INDEX `idx_ncp_datetime` (`plan_datetime`),
    INDEX `idx_ncp_deleted` (`deleted_at`),
    CONSTRAINT `fk_inpatient_care_plans_admission`
        FOREIGN KEY (`admission_id`)
        REFERENCES `inpatient_admissions` (`id`)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
