-- =====================================================================
-- Migration 322: Hospital Clinical Privileges & Credentials Registry
-- Tables: hr_staff_credentials, hr_staff_clinical_privileges, hr_staff_privilege_procedures
-- Catalogues Medical/Nursing Licenses, Specialty Board Certifications,
-- Hospital Privilege Tiers (Full, Provisional, Consulting, Temporary), and Authorized Procedural Lists.
-- =====================================================================

SET NAMES utf8mb4;

-- 1. Staff & Doctor Formal Professional Credentials
CREATE TABLE IF NOT EXISTS `hr_staff_credentials` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT NOT NULL,
    `provider_id` INT NULL,
    `credential_type` ENUM(
        'medical_license',
        'nursing_license',
        'specialty_board_cert',
        'dea_narcotics_permit',
        'subspecialty_fellowship',
        'bls_acls_certification',
        'hospital_privilege_grant',
        'malpractice_insurance'
    ) NOT NULL DEFAULT 'medical_license',
    `credential_title` VARCHAR(150) NOT NULL,
    `issuing_body` VARCHAR(150) NOT NULL,
    `certificate_number` VARCHAR(100) NOT NULL,
    `issue_date` DATE NOT NULL,
    `expiry_date` DATE NULL,
    `verification_status` ENUM('verified', 'pending_verification', 'expired', 'suspended', 'revoked') NOT NULL DEFAULT 'verified',
    `verified_by_user` VARCHAR(150) NULL,
    `verified_at` DATETIME NULL,
    `primary_source_verification_url` VARCHAR(255) NULL,
    `document_attachment_path` VARCHAR(255) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_hsc_employee` (`employee_id`),
    KEY `idx_hsc_type` (`credential_type`),
    KEY `idx_hsc_status` (`verification_status`),
    KEY `idx_hsc_expiry` (`expiry_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Hospital Clinical Privileges Grants (Privileging Delineation)
CREATE TABLE IF NOT EXISTS `hr_staff_clinical_privileges` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `privilege_code` VARCHAR(50) NOT NULL UNIQUE,
    `employee_id` INT NOT NULL,
    `doctor_name` VARCHAR(150) NOT NULL,
    `department_id` INT NULL,
    `department_name` VARCHAR(100) NULL,
    `privilege_tier` ENUM(
        'Full',
        'Provisional',
        'Consulting',
        'Temporary',
        'Restricted'
    ) NOT NULL DEFAULT 'Full',
    `effective_date` DATE NOT NULL,
    `review_date` DATE NOT NULL,
    `approving_committee` VARCHAR(150) NOT NULL DEFAULT 'Hospital Credentials & Privileging Committee',
    `approving_chairperson` VARCHAR(150) NOT NULL DEFAULT 'Chief Medical Officer',
    `committee_resolution_no` VARCHAR(100) NULL,
    `status` ENUM('active', 'under_review', 'expired', 'suspended', 'withdrawn') NOT NULL DEFAULT 'active',
    `proctor_supervisor_id` INT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_hcp_employee` (`employee_id`),
    KEY `idx_hcp_tier` (`privilege_tier`),
    KEY `idx_hcp_status` (`status`),
    KEY `idx_hcp_review` (`review_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Authorized Procedural Lists (Specific Surgical & Bedside Interventions)
CREATE TABLE IF NOT EXISTS `hr_staff_privilege_procedures` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `privilege_id` INT UNSIGNED NOT NULL,
    `procedure_category` ENUM(
        'Major Surgical',
        'Minor Surgical',
        'Bedside Invasive',
        'Endoscopy / Interventional',
        'Sedation / Anesthesia',
        'Diagnostic Interpretation',
        'Obstetric / Labor & Delivery'
    ) NOT NULL DEFAULT 'Major Surgical',
    `procedure_code` VARCHAR(50) NULL,
    `procedure_name` VARCHAR(200) NOT NULL,
    `supervision_level` ENUM(
        'Independent',
        'Direct Supervision',
        'Indirect Supervision',
        'Prohibited'
    ) NOT NULL DEFAULT 'Independent',
    `required_proctored_cases` INT NOT NULL DEFAULT 0,
    `completed_proctored_cases` INT NOT NULL DEFAULT 0,
    `is_authorized` TINYINT(1) NOT NULL DEFAULT 1,
    `clinical_scope_notes` VARCHAR(255) NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_hpp_privilege` (`privilege_id`),
    KEY `idx_hpp_procedure` (`procedure_code`, `procedure_name`),
    KEY `idx_hpp_auth` (`is_authorized`),
    CONSTRAINT `fk_hpp_privilege` FOREIGN KEY (`privilege_id`) REFERENCES `hr_staff_clinical_privileges` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Sequence Counter
INSERT IGNORE INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
VALUES ('CLINICAL_PRIVILEGE', YEAR(NOW()), 0);
