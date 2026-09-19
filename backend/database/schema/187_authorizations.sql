-- 187_authorizations.sql
-- OpenEMR Style Authorizations Module:
-- 1) Prior Authorizations (Insurance Pre-Cert / Authorization Tracker)
-- 2) Clinical Authorizations (Mid-level / Staff Document Sign-Off Queue)

CREATE TABLE IF NOT EXISTS `prior_authorizations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `insurance_id` INT NULL,
    `payer_name` VARCHAR(255) NOT NULL,
    `auth_number` VARCHAR(100) NOT NULL,
    `cpt_code` VARCHAR(50) NULL,
    `service_description` VARCHAR(255) NOT NULL,
    `units_approved` INT NOT NULL DEFAULT 1,
    `units_used` INT NOT NULL DEFAULT 0,
    `start_date` DATE NOT NULL,
    `end_date` DATE NOT NULL,
    `provider_name` VARCHAR(255) NULL,
    `status` ENUM('Active', 'Pending', 'Expired', 'Denied', 'Completed') NOT NULL DEFAULT 'Active',
    `notes` TEXT NULL,
    `created_by` INT NULL,
    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `deleted_at` DATETIME NULL,
    KEY `idx_pa_patient` (`patient_id`),
    KEY `idx_pa_status` (`status`),
    KEY `idx_pa_auth_no` (`auth_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `clinical_authorizations` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `encounter_id` INT NULL,
    `document_type` VARCHAR(100) NOT NULL DEFAULT 'Encounter Note',
    `document_id` INT NULL,
    `author_name` VARCHAR(255) NOT NULL,
    `author_role` VARCHAR(100) NULL DEFAULT 'Clinical Staff',
    `title` VARCHAR(255) NOT NULL,
    `service_date` DATETIME NOT NULL,
    `content` TEXT NULL,
    `status` ENUM('pending', 'authorized', 'returned') NOT NULL DEFAULT 'pending',
    `authorized_by_id` INT NULL,
    `authorized_by_name` VARCHAR(255) NULL,
    `authorized_at` DATETIME NULL,
    `comments` TEXT NULL,
    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_ca_patient` (`patient_id`),
    KEY `idx_ca_status` (`status`),
    KEY `idx_ca_date` (`service_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
