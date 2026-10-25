-- =====================================================================
-- Migration 325: Life Support Clinical Certifications Tracker
-- Tables: hr_life_support_certifications, hr_life_support_requirements, hr_life_support_reminders
-- Tracks BLS, ACLS, PALS, ATLS, and NRP with automatic recertification reminders and expiration alerts.
-- =====================================================================

SET NAMES utf8mb4;

-- 1. Life Support Certifications Ledger
CREATE TABLE IF NOT EXISTS `hr_life_support_certifications` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `certification_code` VARCHAR(50) NOT NULL UNIQUE,
    `employee_id` INT NOT NULL,
    `staff_name` VARCHAR(150) NOT NULL,
    `staff_role` VARCHAR(100) NOT NULL,
    `department_id` INT NULL,
    `department_name` VARCHAR(100) NULL,
    `cert_type` ENUM('BLS', 'ACLS', 'PALS', 'ATLS', 'NRP') NOT NULL,
    `issuing_organization` VARCHAR(150) NOT NULL DEFAULT 'American Heart Association (AHA)',
    `certificate_number` VARCHAR(100) NOT NULL,
    `ecard_code` VARCHAR(100) NULL,
    `issue_date` DATE NOT NULL,
    `expiry_date` DATE NOT NULL,
    `validity_years` INT NOT NULL DEFAULT 2,
    `status` ENUM('active', 'expiring_soon', 'in_grace_period', 'expired', 'revoked') NOT NULL DEFAULT 'active',
    `instructor_name` VARCHAR(150) NULL,
    `training_site` VARCHAR(150) NULL DEFAULT 'Hospital Resuscitation Simulation Center',
    `verification_status` ENUM('verified', 'pending_verification', 'unverified') NOT NULL DEFAULT 'verified',
    `verified_by_user` VARCHAR(150) NULL,
    `verified_at` DATETIME NULL,
    `document_attachment` VARCHAR(255) NULL,
    `last_reminder_sent_at` DATETIME NULL,
    `last_reminder_tier` VARCHAR(50) NULL,
    `notes` TEXT NULL,
    `created_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_lsc_emp` (`employee_id`),
    KEY `idx_lsc_type` (`cert_type`),
    KEY `idx_lsc_expiry` (`expiry_date`),
    KEY `idx_lsc_status` (`status`),
    KEY `idx_lsc_dept` (`department_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Role and Department Life Support Requirements Matrix
CREATE TABLE IF NOT EXISTS `hr_life_support_requirements` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `department_name` VARCHAR(100) NOT NULL,
    `clinical_role` VARCHAR(100) NOT NULL,
    `cert_type` ENUM('BLS', 'ACLS', 'PALS', 'ATLS', 'NRP') NOT NULL,
    `is_mandatory` TINYINT(1) NOT NULL DEFAULT 1,
    `grace_period_days` INT NOT NULL DEFAULT 30,
    `clinical_impact_on_lapse` VARCHAR(255) NOT NULL DEFAULT 'Suspension from Code Blue / Resuscitation Response Team',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_req_dept_role_cert` (`department_name`, `clinical_role`, `cert_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Life Support Recertification Reminders Audit Log
CREATE TABLE IF NOT EXISTS `hr_life_support_reminders` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `certification_id` INT UNSIGNED NOT NULL,
    `employee_id` INT NOT NULL,
    `staff_name` VARCHAR(150) NOT NULL,
    `cert_type` ENUM('BLS', 'ACLS', 'PALS', 'ATLS', 'NRP') NOT NULL,
    `reminder_tier` ENUM('90_day_notice', '60_day_notice', '30_day_urgent', '7_day_critical', 'expired_lapse') NOT NULL,
    `days_remaining` INT NOT NULL,
    `expiry_date` DATE NOT NULL,
    `notification_channel` ENUM('in_app', 'email', 'sms', 'clinical_director_alert') NOT NULL DEFAULT 'in_app',
    `recipient_email` VARCHAR(150) NULL,
    `message_title` VARCHAR(255) NOT NULL,
    `message_body` TEXT NOT NULL,
    `dispatched_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `acknowledged_at` DATETIME NULL,
    `acknowledged_by` VARCHAR(150) NULL,
    `status` ENUM('dispatched', 'delivered', 'acknowledged', 'resolved') NOT NULL DEFAULT 'dispatched',
    KEY `idx_lsr_cert` (`certification_id`),
    KEY `idx_lsr_emp` (`employee_id`),
    KEY `idx_lsr_tier` (`reminder_tier`),
    KEY `idx_lsr_dispatch` (`dispatched_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Initialize Sequence Counter
INSERT IGNORE INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
VALUES ('LIFE_SUPPORT_CERT', YEAR(NOW()), 0);
