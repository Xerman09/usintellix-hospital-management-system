-- ============================================================================
-- Migration: 303_portal_test_explanations.sql
-- My Chart Phase 2: what a test means, in words a patient can read.
--
-- One row per analyte ("Hemoglobin") or imaging study ("Chest X-ray"), shown
-- under the result in My Chart. The hospital edits the wording itself, under
-- Laboratory settings, so the explanation a patient reads is the hospital's
-- own and can be corrected without a release.
--
-- Matching: result rows carry `name` always, and `code` only sometimes -- the
-- lab's analytes (procedure_order_configs, tier 'discrete_result') have no
-- identifying_code, while an imaging row carries the study code (CXR, CTAP).
-- So `name` is the key and `code` is an optional second way in. For the same
-- reason the unique key is on (kind, name): a UNIQUE over a nullable `code`
-- would not constrain anything in MySQL/MariaDB.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `portal_test_explanations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `kind` ENUM('lab', 'imaging') NOT NULL DEFAULT 'lab',
    `code` VARCHAR(100) NULL DEFAULT NULL,
    `name` VARCHAR(150) NOT NULL,
    `what_it_measures` TEXT NULL,
    `why_ordered` TEXT NULL,
    `high_means` TEXT NULL,
    `low_means` TEXT NULL,
    `source` VARCHAR(150) NULL DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT NULL DEFAULT NULL,
    `updated_by` INT NULL DEFAULT NULL,
    UNIQUE KEY `uq_portal_explanation` (`kind`, `name`),
    INDEX `idx_portal_explanation_code` (`code`),
    INDEX `idx_portal_explanation_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
