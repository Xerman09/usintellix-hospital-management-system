-- Migration 284 / 302: Sequential Queue Token Generation for Outpatient Clinics
-- Table: appointment_queue_tokens & patient_flow queue linkages
-- Supports daily department-prefixed sequential tokens (e.g. CARD-001, OPD-015, PEDI-003)

SET NAMES utf8mb4;

-- 1. Create appointment_queue_tokens table
CREATE TABLE IF NOT EXISTS `appointment_queue_tokens` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `token_number` VARCHAR(50) NOT NULL COMMENT 'Department-prefixed daily sequential token, e.g. CARD-001, OPD-015',
    `token_date` DATE NOT NULL COMMENT 'Date the token was generated',
    `sequence_number` INT NOT NULL COMMENT 'Sequential integer for the department on that date (1, 2, 3...)',
    `department_id` INT NULL COMMENT 'FK to departments table',
    `department_code` VARCHAR(20) NOT NULL DEFAULT 'OPD' COMMENT 'Department prefix code, e.g. CARD, OPD, PEDI',
    `appointment_id` INT NULL COMMENT 'FK to appointments table if booked in advance',
    `patient_flow_id` INT NULL COMMENT 'FK to patient_flow table',
    `patient_id` INT NOT NULL COMMENT 'FK to patients table',
    `provider_id` INT NULL COMMENT 'FK to providers table',
    `facility_id` INT NULL COMMENT 'FK to facilities table',
    `room_id` INT NULL COMMENT 'FK to rooms table assigned for consultation',
    `priority` ENUM('routine', 'urgent', 'priority', 'senior_pwd', 'vip') NOT NULL DEFAULT 'routine',
    `status` ENUM('waiting', 'called', 'in_consultation', 'completed', 'no_show', 'cancelled') NOT NULL DEFAULT 'waiting',
    `call_counter` INT NOT NULL DEFAULT 0 COMMENT 'Number of times token was called on PA/display',
    `called_at` DATETIME NULL COMMENT 'Timestamp when token was first or most recently called',
    `called_by` INT NULL COMMENT 'User ID of nurse or clerk who called token',
    `service_started_at` DATETIME NULL COMMENT 'Timestamp when provider consultation started',
    `service_completed_at` DATETIME NULL COMMENT 'Timestamp when consultation was completed',
    `estimated_wait_minutes` INT NULL DEFAULT 15 COMMENT 'Estimated wait time calculated upon issuance',
    `wait_time_minutes` INT NULL COMMENT 'Actual wait time from check-in to consultation',
    `service_duration_minutes` INT NULL COMMENT 'Actual consultation duration',
    `notes` VARCHAR(255) NULL,
    `issued_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `issued_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_dept_date_seq` (`department_code`, `token_date`, `sequence_number`),
    KEY `idx_token_date` (`token_date`),
    KEY `idx_status` (`status`),
    KEY `idx_department` (`department_id`, `department_code`),
    KEY `idx_patient` (`patient_id`),
    KEY `idx_appointment` (`appointment_id`),
    KEY `idx_flow` (`patient_flow_id`),
    CONSTRAINT `fk_queue_tokens_dept` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_queue_tokens_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Add queue_token_id, token_number, and priority to patient_flow table if not present
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'patient_flow' 
    AND COLUMN_NAME = 'queue_token_id');

SET @sql := IF(@col_exists = 0, 
    "ALTER TABLE `patient_flow` 
        ADD COLUMN `queue_token_id` INT NULL AFTER `appointment_id`,
        ADD COLUMN `token_number` VARCHAR(50) NULL AFTER `queue_token_id`,
        ADD COLUMN `priority` ENUM('routine', 'urgent', 'priority', 'senior_pwd', 'vip') NOT NULL DEFAULT 'routine' AFTER `stage`,
        ADD CONSTRAINT `fk_patient_flow_queue_token` FOREIGN KEY (`queue_token_id`) REFERENCES `appointment_queue_tokens` (`id`) ON DELETE SET NULL",
    "SELECT 'Column queue_token_id already exists on patient_flow'");
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
