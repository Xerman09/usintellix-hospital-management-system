-- =====================================================================
-- Migration 317: Continuing Medical Education (CME / CPD) Credit Ledger & Certifications
-- Tables: hr_cme_records, hr_cme_quota_targets
-- Tracks symposia, workshops, accrediting bodies, credit units earned,
-- certificate uploads, and license renewal progress bars.
-- =====================================================================

SET NAMES utf8mb4;

-- 1. Continuing Medical Education / CPD Credit Records Ledger
CREATE TABLE IF NOT EXISTS `hr_cme_records` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `record_code` VARCHAR(50) NOT NULL UNIQUE,
    `employee_id` INT NOT NULL,
    `credential_id` INT UNSIGNED NULL COMMENT 'Optional FK to hr_staff_credentials',
    `activity_title` VARCHAR(255) NOT NULL,
    `activity_type` ENUM(
        'symposium',
        'conference',
        'workshop',
        'webinar',
        'journal_reading',
        'clinical_fellowship',
        'board_review',
        'institutional_grand_rounds',
        'quality_improvement_training'
    ) NOT NULL DEFAULT 'symposium',
    `accrediting_body` VARCHAR(150) NOT NULL,
    `activity_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `venue` VARCHAR(255) NULL,
    `credit_units` DECIMAL(6,2) NOT NULL DEFAULT 1.00,
    `category_type` ENUM(
        'Category 1 (Formal CME)',
        'Category 2 (Self-Directed)',
        'Ethics & Patient Safety',
        'Infection Control',
        'Pharmacology / Prescribing',
        'General Clinical'
    ) NOT NULL DEFAULT 'Category 1 (Formal CME)',
    `certificate_number` VARCHAR(100) NULL,
    `certificate_file_name` VARCHAR(150) NULL,
    `certificate_file_path` VARCHAR(255) NULL,
    `verification_status` ENUM('verified', 'pending_verification', 'rejected') NOT NULL DEFAULT 'verified',
    `verified_by` INT NULL,
    `verified_at` DATETIME NULL,
    `rejection_reason` TEXT NULL,
    `target_license_type` VARCHAR(100) NULL,
    `target_cycle_year` INT NOT NULL DEFAULT 2026,
    `notes` TEXT NULL,
    `created_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_cme_employee` (`employee_id`),
    KEY `idx_cme_date` (`activity_date`),
    KEY `idx_cme_type` (`activity_type`),
    KEY `idx_cme_status` (`verification_status`),
    KEY `idx_cme_year` (`target_cycle_year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Professional License CME / CPD Quota Targets & Renewal Progress Tracker
CREATE TABLE IF NOT EXISTS `hr_cme_quota_targets` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT NOT NULL,
    `target_year` INT NOT NULL DEFAULT 2026,
    `license_type` VARCHAR(100) NOT NULL,
    `required_units` DECIMAL(6,2) NOT NULL DEFAULT 25.00,
    `earned_units` DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    `cycle_start_date` DATE NOT NULL,
    `renewal_due_date` DATE NOT NULL,
    `compliance_status` ENUM(
        'compliant',
        'on_track',
        'behind_schedule',
        'critical_renewal_risk',
        'expired'
    ) NOT NULL DEFAULT 'on_track',
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_cme_quota_emp_year` (`employee_id`, `target_year`, `license_type`),
    KEY `idx_cme_q_status` (`compliance_status`),
    KEY `idx_cme_q_due` (`renewal_due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Sequence Counter
INSERT IGNORE INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
VALUES ('CME_RECORD', YEAR(NOW()), 0);
