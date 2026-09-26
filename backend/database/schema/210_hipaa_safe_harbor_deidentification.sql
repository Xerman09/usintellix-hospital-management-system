-- ==============================================================================
-- Migration 210: Safe Harbor 18-Identifier PHI De-Identification Tool
-- Statutory Citations:
--   - 45 CFR § 164.514(a): General rule for de-identification of protected health information
--   - 45 CFR § 164.514(b): Implementation specifications: requirements for de-identification (Safe Harbor standard)
--   - 45 CFR § 164.514(c): Implementation specifications: re-identification
-- ==============================================================================

-- 1. Create hipaa_deidentified_exports master ledger
CREATE TABLE IF NOT EXISTS `hipaa_deidentified_exports` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `export_code` VARCHAR(50) NOT NULL UNIQUE,
    `dataset_type` ENUM(
        'patient_demographics',
        'clinical_encounters',
        'prescriptions_rx',
        'laboratory_results',
        'financial_billing',
        'longitudinal_cohort'
    ) NOT NULL,
    `purpose_of_use` ENUM(
        'clinical_research',
        'ai_model_training',
        'internal_quality_improvement',
        'epidemiological_study',
        'health_data_analytics',
        'other_permitted_use'
    ) NOT NULL,
    `purpose_description` TEXT NOT NULL,
    `recipient_institution` VARCHAR(255) NOT NULL,
    `recipient_investigator` VARCHAR(255) NOT NULL,
    `data_format` ENUM('rfc4180_csv', 'fhir_json', 'tabular_json') NOT NULL DEFAULT 'rfc4180_csv',
    `records_count` INT UNSIGNED NOT NULL DEFAULT 0,
    `identifiers_removed_count` INT UNSIGNED NOT NULL DEFAULT 18,
    `sha256_dataset_checksum` VARCHAR(64) NOT NULL,
    `is_safe_harbor_certified` TINYINT(1) NOT NULL DEFAULT 1,
    `attestation_officer_id` INT NULL,
    `attestation_officer_name` VARCHAR(255) NOT NULL,
    `attestation_officer_role` VARCHAR(255) NOT NULL,
    `attested_at` DATETIME NOT NULL,
    `reidentification_enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by` INT NULL,
    `created_at` DATETIME NOT NULL,
    `updated_at` DATETIME NOT NULL,
    INDEX `idx_deid_code` (`export_code`),
    INDEX `idx_deid_type` (`dataset_type`),
    INDEX `idx_deid_purpose` (`purpose_of_use`),
    INDEX `idx_deid_officer` (`attestation_officer_id`),
    INDEX `idx_deid_created` (`created_at`)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 2. Create hipaa_reidentification_vault isolated lookup key table (§ 164.514(c))
CREATE TABLE IF NOT EXISTS `hipaa_reidentification_vault` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `export_id` BIGINT UNSIGNED NOT NULL,
    `patient_id` INT NOT NULL,
    `subject_pseudonym` VARCHAR(64) NOT NULL,
    `key_hash` VARCHAR(64) NOT NULL,
    `created_at` DATETIME NOT NULL,
    UNIQUE KEY `uk_vault_export_patient` (`export_id`, `patient_id`),
    UNIQUE KEY `uk_vault_export_pseudonym` (`export_id`, `subject_pseudonym`),
    INDEX `idx_vault_patient` (`patient_id`),
    INDEX `idx_vault_pseudonym` (`subject_pseudonym`),
    INDEX `idx_vault_hash` (`key_hash`),
    CONSTRAINT `fk_vault_export`
        FOREIGN KEY (`export_id`) REFERENCES `hipaa_deidentified_exports` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_vault_patient`
        FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
