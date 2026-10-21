-- ============================================================================
-- Migration: 306_portal_notifications.sql
-- My Chart Phase 6: the To-Do list's notifications.
--
-- patient_notifications is the outbox and the in-app bell in one table: a row is
-- queued when something happens, the cron sends the email ones, and the in-app
-- ones are simply read in My Chart. read_at is also the portal's first real
-- server-side read marker -- until now "unread" lived in the browser.
--
-- patient_notification_preferences is what the patient wants. It can only ever
-- narrow what the hospital allows: the master switches in general_settings
-- (notification_email_enabled / _sms_enabled / _in_app_enabled) are checked
-- first, and a channel switched off there is off for everyone.
-- ============================================================================

SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS `patient_notification_preferences` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `channel` ENUM('email', 'sms', 'in_app') NOT NULL,
    `event_type` VARCHAR(60) NOT NULL,
    `is_enabled` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `updated_by` INT NULL DEFAULT NULL,
    UNIQUE KEY `uq_patient_pref` (`patient_id`, `channel`, `event_type`),
    INDEX `idx_patient_pref` (`patient_id`, `event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `patient_notifications` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `event_type` VARCHAR(60) NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `body` VARCHAR(500) NULL DEFAULT NULL,
    `link_tab` VARCHAR(60) NULL DEFAULT NULL,
    `link_id` INT NULL DEFAULT NULL,
    `channel` ENUM('email', 'sms', 'in_app') NOT NULL DEFAULT 'in_app',
    `status` ENUM('queued', 'sent', 'failed', 'read') NOT NULL DEFAULT 'queued',
    `dedupe_key` VARCHAR(120) NULL DEFAULT NULL,
    `send_after` DATETIME NULL DEFAULT NULL,
    `attempts` SMALLINT NOT NULL DEFAULT 0,
    `last_error` VARCHAR(255) NULL DEFAULT NULL,
    `sent_at` DATETIME NULL DEFAULT NULL,
    `read_at` DATETIME NULL DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- One notification per thing per channel: the cron and the event hooks can both
    -- queue without the patient getting the same message twice.
    UNIQUE KEY `uq_patient_notification` (`dedupe_key`, `channel`),
    INDEX `idx_notification_patient` (`patient_id`, `channel`, `status`),
    INDEX `idx_notification_outbox` (`status`, `send_after`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `portal_notification_types` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `event_type` VARCHAR(60) NOT NULL,
    `label` VARCHAR(150) NOT NULL,
    `description` VARCHAR(255) NULL DEFAULT NULL,
    `title_template` VARCHAR(150) NOT NULL,
    `body_template` VARCHAR(500) NULL DEFAULT NULL,
    `link_tab` VARCHAR(60) NULL DEFAULT NULL,
    `default_email` TINYINT(1) NOT NULL DEFAULT 1,
    `default_sms` TINYINT(1) NOT NULL DEFAULT 0,
    `default_in_app` TINYINT(1) NOT NULL DEFAULT 1,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `sequence` INT NOT NULL DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uq_portal_notification_type` (`event_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
