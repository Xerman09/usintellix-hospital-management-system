-- =========================================================
-- ENVIRONMENTAL SERVICES (EVS) / BED TURNOVER PIPELINE SCHEMA
-- Tracks bed lifecycle from patient vacating -> cleaning -> sanitizing -> inspection -> released to Available
-- Migration Reference: 283_bed_turnover_evs_logs.sql
-- =========================================================

CREATE TABLE IF NOT EXISTS `bed_turnover_logs` (
    `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `turnover_number` VARCHAR(50) NOT NULL UNIQUE,
    `bed_id` INT UNSIGNED NOT NULL,
    `room_id` INT UNSIGNED NULL,
    `ward_id` INT UNSIGNED NULL,
    `admission_id` INT UNSIGNED NULL,
    `vacated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `vacated_by` INT UNSIGNED NULL,
    `assigned_evs_staff_id` INT UNSIGNED NULL,
    `assigned_evs_staff_name` VARCHAR(150) NULL,
    `cleaning_priority` ENUM('Routine', 'Urgent', 'STAT') NOT NULL DEFAULT 'Routine',
    `cleaning_type` ENUM('Routine Turnover', 'Terminal Cleaning', 'Isolation Deep Sanitize', 'Biohazard / Spill') NOT NULL DEFAULT 'Routine Turnover',
    `status` ENUM('Vacated / Dirty', 'Cleaning In-Progress', 'Sanitized / Pending Inspection', 'Inspection Failed', 'Completed / Available', 'Cancelled') NOT NULL DEFAULT 'Vacated / Dirty',
    `cleaning_started_at` DATETIME NULL,
    `cleaning_completed_at` DATETIME NULL,
    `cleaned_by` VARCHAR(150) NULL,
    `checklist` JSON NULL,
    `inspected_at` DATETIME NULL,
    `inspected_by` INT UNSIGNED NULL,
    `inspector_name` VARCHAR(150) NULL,
    `inspection_status` ENUM('Pending', 'Passed', 'Failed') NOT NULL DEFAULT 'Pending',
    `released_at` DATETIME NULL,
    `cleaning_duration_minutes` INT NULL,
    `turnover_duration_minutes` INT NULL,
    `target_sla_minutes` INT NOT NULL DEFAULT 45,
    `is_sla_breached` TINYINT(1) NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_turnover_bed` (`bed_id`),
    INDEX `idx_turnover_ward` (`ward_id`),
    INDEX `idx_turnover_room` (`room_id`),
    INDEX `idx_turnover_admission` (`admission_id`),
    INDEX `idx_turnover_status` (`status`),
    INDEX `idx_turnover_priority` (`cleaning_priority`),
    INDEX `idx_turnover_vacated_at` (`vacated_at`),
    INDEX `idx_turnover_sla` (`is_sla_breached`),
    CONSTRAINT `fk_turnover_bed` FOREIGN KEY (`bed_id`) REFERENCES `hospital_beds` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
