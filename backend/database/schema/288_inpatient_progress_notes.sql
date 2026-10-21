-- ====================================================================
-- SCHEMA MIGRATION: 288_inpatient_progress_notes.sql
-- Inpatient Multidisciplinary Progress Notes & Treatment Logs
-- For Allied Health Professionals (PT/OT, Nutrition, Pharmacy, Social Work, RT)
-- ====================================================================

CREATE TABLE IF NOT EXISTS `inpatient_progress_notes` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `note_number` VARCHAR(32) NOT NULL UNIQUE,
    `admission_id` INT UNSIGNED NOT NULL,
    `patient_id` INT UNSIGNED NOT NULL,
    `note_datetime` DATETIME NOT NULL,
    `discipline` VARCHAR(60) NOT NULL COMMENT 'Physical Therapy, Clinical Nutrition, Clinical Pharmacy, Medical Social Work, Respiratory Therapy, Occupational Therapy, Speech-Language Pathology, Wound Care, General Allied Health',
    `provider_id` INT UNSIGNED NULL COMMENT 'User ID of documenting provider',
    `provider_name` VARCHAR(150) NOT NULL COMMENT 'Display name of documenting allied health provider',
    `provider_role` VARCHAR(100) NULL COMMENT 'Professional credential/title e.g. DPT, RD/LDN, PharmD, LCSW, RRT',
    `note_type` VARCHAR(60) NOT NULL DEFAULT 'Daily Intervention' COMMENT 'Initial Assessment, Daily Treatment / Intervention, Progress Review, Consultation Note, Discharge Planning',
    `subjective` TEXT NULL COMMENT 'Patient report, symptom response, functional tolerance',
    `objective` TEXT NULL COMMENT 'Objective clinical data, interventions performed, measurable metrics (reps/distance, calorie/protein intake, therapeutic drug levels, etc.)',
    `assessment` TEXT NULL COMMENT 'Clinical assessment of progress, barriers, response to therapy',
    `plan` TEXT NOT NULL COMMENT 'Ongoing multidisciplinary plan, frequency, measurable goals',
    `recommendations` TEXT NULL COMMENT 'Actionable recommendations for Attending Physician & Nursing staff',
    `is_cosigned` TINYINT(1) NOT NULL DEFAULT 0,
    `cosigned_by` INT UNSIGNED NULL,
    `cosigned_by_name` VARCHAR(150) NULL,
    `cosigned_at` DATETIME NULL,
    `created_by` INT UNSIGNED NULL,
    `updated_by` INT UNSIGNED NULL,
    `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` TIMESTAMP NULL DEFAULT NULL,
    INDEX `idx_mpn_admission` (`admission_id`),
    INDEX `idx_mpn_patient` (`patient_id`),
    INDEX `idx_mpn_discipline` (`discipline`),
    INDEX `idx_mpn_datetime` (`note_datetime`),
    INDEX `idx_mpn_deleted` (`deleted_at`),
    CONSTRAINT `fk_inpatient_progress_notes_admission`
        FOREIGN KEY (`admission_id`)
        REFERENCES `inpatient_admissions` (`id`)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
