-- ============================================================================
-- Migration: 305_portal_checkin.sql
-- My Chart Phase 5: e-check-in, done at home in the two days before a visit.
--
-- portal_checkins is one row per appointment: which steps the patient has
-- finished, and when. Nothing here is clinical and nothing here verifies the
-- patient -- identity proofing stays a staff act (patients.identity_status, see
-- migration 298), and this only ever moves someone to "Pending Verification".
--
-- portal_questionnaires holds the questions. form_definitions, which the plan
-- points at, is a registry of form names with no place to put fields, so each
-- questionnaire is registered there (so it appears with the hospital's other
-- forms) and its questions live here as JSON. portal_questionnaire_responses
-- holds what the patient answered.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `portal_checkins` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `appointment_id` INT NOT NULL,
    `patient_id` INT NOT NULL,
    `status` ENUM('started', 'completed', 'expired') NOT NULL DEFAULT 'started',
    `demographics_confirmed_at` DATETIME NULL DEFAULT NULL,
    `insurance_confirmed_at` DATETIME NULL DEFAULT NULL,
    `insurance_changed` TINYINT(1) NOT NULL DEFAULT 0,
    `insurance_note` VARCHAR(255) NULL DEFAULT NULL,
    `consents_signed_at` DATETIME NULL DEFAULT NULL,
    `questionnaire_done_at` DATETIME NULL DEFAULT NULL,
    `id_document_at` DATETIME NULL DEFAULT NULL,
    `copay_paid_at` DATETIME NULL DEFAULT NULL,
    `copay_attempt_id` INT NULL DEFAULT NULL,
    `completed_at` DATETIME NULL DEFAULT NULL,
    `arrived_flow_id` INT NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT NULL DEFAULT NULL,
    `updated_by` INT NULL DEFAULT NULL,
    UNIQUE KEY `uq_portal_checkin_appointment` (`appointment_id`),
    INDEX `idx_portal_checkin_patient` (`patient_id`, `status`),
    INDEX `idx_portal_checkin_status` (`status`, `completed_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- For a database where portal_checkins already exists from an earlier run of this
-- migration, CREATE TABLE IF NOT EXISTS does nothing, so the two insurance columns are
-- added separately. Both statements are safe to re-run.
ALTER TABLE `portal_checkins`
    ADD COLUMN IF NOT EXISTS `insurance_changed` TINYINT(1) NOT NULL DEFAULT 0 AFTER `insurance_confirmed_at`,
    ADD COLUMN IF NOT EXISTS `insurance_note` VARCHAR(255) NULL DEFAULT NULL AFTER `insurance_changed`;

-- The questions of one questionnaire, as JSON:
-- [{"key":"reason","label":"...","type":"text|textarea|yesno|choice|checkboxes","options":[...],"required":true}]
CREATE TABLE IF NOT EXISTS `portal_questionnaires` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `form_definition_id` INT NULL DEFAULT NULL,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `specialty` VARCHAR(100) NULL DEFAULT NULL,
    `intro` VARCHAR(500) NULL DEFAULT NULL,
    `questions` LONGTEXT NOT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_portal_questionnaire_code` (`code`),
    INDEX `idx_portal_questionnaire_specialty` (`specialty`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `portal_questionnaire_responses` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `appointment_id` INT NULL DEFAULT NULL,
    `form_definition_id` INT NULL DEFAULT NULL,
    `questionnaire_id` INT NULL DEFAULT NULL,
    `answers` LONGTEXT NOT NULL,
    `submitted_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_by` INT NULL DEFAULT NULL,
    INDEX `idx_pqr_patient` (`patient_id`, `submitted_at`),
    INDEX `idx_pqr_appointment` (`appointment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
