-- 188_batch_communication.sql
-- OpenEMR Style Batch Communication Tool
-- Logs for outbound SMS, Email, and CSV Exports, plus gateway configuration settings

CREATE TABLE IF NOT EXISTS `batch_communication_logs` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NULL,
    `recipient_name` VARCHAR(255) NULL,
    `recipient_target` VARCHAR(255) NOT NULL,
    `type` ENUM('sms', 'email', 'csv_export') NOT NULL,
    `subject` VARCHAR(255) NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('sent', 'failed', 'pending', 'exported') NOT NULL DEFAULT 'sent',
    `created_by` INT NULL,
    `created_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_bcl_patient` (`patient_id`),
    KEY `idx_bcl_type` (`type`),
    KEY `idx_bcl_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `batch_communication_settings` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `setting_key` VARCHAR(100) NOT NULL UNIQUE,
    `setting_value` TEXT NULL,
    `updated_at` DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
