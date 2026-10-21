-- ============================================================================
-- Migration: 291_nursing_shift_handovers.sql
-- Module: Nursing and Ward Care — SBAR Nurse Shift Handovers
-- Description:
--   Implements the standardized SBAR (Situation, Background, Assessment,
--   Recommendation) shift handover protocol across Morning -> Afternoon -> Night
--   shifts with bedside safety verification and dual digital sign-offs from both
--   outgoing and incoming nurses.
-- ============================================================================

CREATE TABLE IF NOT EXISTS `nursing_shift_handovers` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `handover_number` VARCHAR(40) NOT NULL,
    `admission_id` INT UNSIGNED NOT NULL,
    `patient_id` INT UNSIGNED NULL DEFAULT NULL,
    `ward_id` INT UNSIGNED NULL DEFAULT NULL,
    `bed_id` INT UNSIGNED NULL DEFAULT NULL,
    `handover_datetime` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Shift Transition Metadata
    `shift_transition` ENUM(
        'Morning to Afternoon (07:00 → 15:00)',
        'Afternoon to Night (15:00 → 23:00)',
        'Night to Morning (23:00 → 07:00)',
        'Interim / Relief Handover'
    ) NOT NULL DEFAULT 'Morning to Afternoon (07:00 → 15:00)',
    `outgoing_shift` VARCHAR(40) NOT NULL DEFAULT 'Morning Shift (07:00-15:00)',
    `incoming_shift` VARCHAR(40) NOT NULL DEFAULT 'Afternoon Shift (15:00-23:00)',

    -- Patient Acuity & Clinical Safety Context
    `acuity_level` ENUM(
        'Level 1 - Stable',
        'Level 2 - Moderate Acuity',
        'Level 3 - High Acuity / Close Monitoring',
        'Level 4 - Critical / ICU 1:1'
    ) NOT NULL DEFAULT 'Level 2 - Moderate Acuity',
    `code_status` VARCHAR(60) NOT NULL DEFAULT 'Full Code',
    `allergies_summary` VARCHAR(255) NULL DEFAULT 'NKDA',
    `isolation_precautions` VARCHAR(80) NOT NULL DEFAULT 'Standard',
    `fall_risk_level` ENUM('Low', 'Moderate', 'High') NOT NULL DEFAULT 'Low',

    -- Standardized SBAR Protocol Fields
    `sbar_situation` TEXT NOT NULL COMMENT 'S: Current clinical condition, admitting diagnosis, acute events during outgoing shift',
    `sbar_background` TEXT NOT NULL COMMENT 'B: Relevant history, procedures, active IV lines/infusions, drains, oxygen/airway',
    `sbar_assessment` TEXT NOT NULL COMMENT 'A: Latest vitals, NEWS2, pain score, 24h fluid balance (I&O), critical lab/imaging results',
    `sbar_recommendation` TEXT NOT NULL COMMENT 'R: Action items for incoming shift, due meds/labs, pending consults, MD notification parameters',

    -- Bedside Safety Verification & Pending Shift Tasks
    `safety_checks_json` TEXT NULL DEFAULT NULL COMMENT 'JSON checklist: ID band, IV pumps, MAR review, lines/drains, fall/call bell',
    `vitals_snapshot_json` TEXT NULL DEFAULT NULL COMMENT 'JSON snapshot of latest vitals & 24h net fluid balance at shift change',

    -- Outgoing Nurse Digital Sign-Off
    `outgoing_nurse_id` INT UNSIGNED NULL DEFAULT NULL,
    `outgoing_nurse_name` VARCHAR(120) NOT NULL,
    `outgoing_nurse_signature` VARCHAR(180) NOT NULL,
    `outgoing_signed_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Incoming Nurse Digital Sign-Off (Dual Sign-Off)
    `incoming_nurse_id` INT UNSIGNED NULL DEFAULT NULL,
    `incoming_nurse_name` VARCHAR(120) NULL DEFAULT NULL,
    `incoming_nurse_signature` VARCHAR(180) NULL DEFAULT NULL,
    `incoming_signed_at` DATETIME NULL DEFAULT NULL,
    `incoming_acknowledgment_notes` TEXT NULL DEFAULT NULL,

    -- Handover Workflow Status
    `handover_status` ENUM(
        'Pending Incoming Sign-Off',
        'Dual-Signed / Completed',
        'Clarification Requested'
    ) NOT NULL DEFAULT 'Pending Incoming Sign-Off',

    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_nursing_shift_handover_number` (`handover_number`),
    KEY `idx_nsh_admission_id` (`admission_id`),
    KEY `idx_nsh_patient_id` (`patient_id`),
    KEY `idx_nsh_datetime` (`handover_datetime`),
    KEY `idx_nsh_status` (`handover_status`),
    KEY `idx_nsh_transition` (`shift_transition`),
    CONSTRAINT `fk_nsh_admission`
        FOREIGN KEY (`admission_id`) REFERENCES `inpatient_admissions` (`id`)
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
