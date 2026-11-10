-- ============================================================================
-- Migration: 333_portal_diagnosis_guides.sql
-- My Chart: what a diagnosis means, in words a patient can read -- and what to
-- do and not do about it.
--
-- One row per condition ("Type 2 diabetes"), shown under the diagnosis wherever
-- a patient meets one: the After-Visit Summary's diagnosis list, the problem
-- list in Health Records, a discharge summary, and an ER visit. The hospital
-- edits the wording itself, so what a patient reads is the hospital's own and
-- can be corrected without a release. Same arrangement as the test explanations
-- in 303_portal_test_explanations.sql.
--
-- Matching, and why the columns look like this. A diagnosis reaches us in four
-- different shapes, only one of which is reliably coded:
--   encounter_diagnoses.code             'E11.9'                      (always coded)
--   patient_medical_problems.coding      'A01.00 - Typhoid fever, unspecified
--                                         (ICD-10-CM)', several per row, newline
--                                         separated, and often NULL
--   inpatient_discharge_summaries        'K80.00 Acute Cholecystitis with
--                                         Cholelithiasis (Post-Op Day 2)', or
--                                         'Severe Sepsis secondary to
--                                         Pyelonephritis' with no code at all
--   er_visits.er_diagnosis               free text
-- So `code` cannot be the only way in, and ICD-10 is too granular for one row
-- per code anyway: E11.9, E11.21 and E11.65 are all type 2 diabetes. Hence
-- `code` holds either an exact code or a 3-character category ('E11'), and
-- `keywords` carries the free-text way in. The service resolves exact code,
-- then category, then longest keyword.
--
-- The unique key is on `title`, not `code`: one guide deliberately covers many
-- codes, and for the same reason as 303, a UNIQUE over a nullable `code` would
-- not constrain anything in MySQL/MariaDB.
--
-- dos / donts / when_to_seek_help are TEXT with one item per line, not JSON --
-- an admin types them into a textarea and the app splits on the newline, the
-- way encounter_clinical_instruction_items.instructions is already handled.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `portal_diagnosis_guides` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `title` VARCHAR(150) NOT NULL,
    `code` VARCHAR(20) NULL DEFAULT NULL,
    `keywords` VARCHAR(500) NULL DEFAULT NULL,
    `about` TEXT NULL,
    `why_it_happens` TEXT NULL,
    `common_symptoms` TEXT NULL,
    `dos` TEXT NULL,
    `donts` TEXT NULL,
    `when_to_seek_help` TEXT NULL,
    `source` VARCHAR(150) NULL DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT NULL DEFAULT NULL,
    `updated_by` INT NULL DEFAULT NULL,
    UNIQUE KEY `uq_portal_diagnosis_guide` (`title`),
    INDEX `idx_pdg_code` (`code`),
    INDEX `idx_pdg_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
