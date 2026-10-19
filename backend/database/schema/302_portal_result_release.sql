-- ============================================================================
-- Migration: 302_portal_result_release.sql
-- My Chart Phase 1: the gate between "verified by the lab" and "visible to the
-- patient in My Chart".
--
-- A result reaches patient_procedure_results only when the lab verifies it or a
-- radiologist signs the report, so nothing unverified is ever in the chart. This
-- adds a second, separate step: when the patient may read it.
--
--   portal_release_at   when it becomes visible (NULL = never, see the hold)
--   portal_released_by  the doctor who released it early, or cleared a hold
--   portal_hold_reason  why it is being withheld; set on a critical result so the
--                       doctor can telephone first. A row with a hold reason is
--                       never shown to the patient, whatever portal_release_at says.
-- ============================================================================

SET NAMES utf8mb4;

ALTER TABLE `patient_procedure_results`
    ADD COLUMN IF NOT EXISTS `portal_release_at` DATETIME NULL DEFAULT NULL AFTER `reference_range`,
    ADD COLUMN IF NOT EXISTS `portal_released_by` INT(11) NULL DEFAULT NULL AFTER `portal_release_at`,
    ADD COLUMN IF NOT EXISTS `portal_hold_reason` VARCHAR(255) NULL DEFAULT NULL AFTER `portal_released_by`;

ALTER TABLE `patient_procedure_results`
    ADD INDEX IF NOT EXISTS `idx_ppr_portal_release` (`portal_release_at`);

-- How long each kind of result waits before the patient can read it.
-- `category` is the lab section (hematology, chemistry, ...) or the imaging
-- modality (xray, ct, mri, ...); '' means "every category of this kind", and a
-- row naming a category wins over it.
--
-- '' rather than NULL on purpose: MySQL and MariaDB treat NULLs as distinct in a
-- UNIQUE key, so a NULL category would let the catch-all row be inserted twice and
-- the seed would not be idempotent. The service API still takes null for "any
-- category" and maps it to '' here.
CREATE TABLE IF NOT EXISTS `portal_release_policies` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `kind` ENUM('lab', 'imaging') NOT NULL,
    `category` VARCHAR(100) NOT NULL DEFAULT '',
    `hold_hours` SMALLINT NOT NULL DEFAULT 0,
    `auto_release_critical` TINYINT(1) NOT NULL DEFAULT 0,
    `note` VARCHAR(255) NULL DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_by` INT NULL DEFAULT NULL,
    `updated_by` INT NULL DEFAULT NULL,
    UNIQUE KEY `uq_portal_policy` (`kind`, `category`),
    INDEX `idx_portal_policy_active` (`kind`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
