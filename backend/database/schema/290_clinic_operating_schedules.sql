-- =====================================================================
-- Migration 290: Clinic Operating Schedules (Outpatient Department Timetables)
-- Defines weekly master operating hours, slot intervals, and capacity quotas
-- for hospital departments and outpatient clinics.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `clinic_operating_schedules` (
    `id` INT(11) NOT NULL AUTO_INCREMENT,
    `facility_id` INT(11) NULL DEFAULT NULL,
    `department_id` INT(11) NOT NULL,
    `day_of_week` ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday') NOT NULL,
    `start_time` TIME NOT NULL DEFAULT '08:00:00',
    `end_time` TIME NOT NULL DEFAULT '17:00:00',
    `slot_duration_minutes` INT(11) NOT NULL DEFAULT 30,
    `break_start_time` TIME NULL DEFAULT '12:00:00',
    `break_end_time` TIME NULL DEFAULT '13:00:00',
    `max_daily_capacity` INT(11) NOT NULL DEFAULT 40,
    `allow_walk_ins` TINYINT(1) NOT NULL DEFAULT 1,
    `max_walk_ins` INT(11) NOT NULL DEFAULT 10,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `notes` VARCHAR(255) NULL DEFAULT NULL,
    `created_at` DATETIME NULL DEFAULT NULL,
    `created_by` INT(11) NULL DEFAULT NULL,
    `updated_at` DATETIME NULL DEFAULT NULL,
    `updated_by` INT(11) NULL DEFAULT NULL,
    `deleted_at` DATETIME NULL DEFAULT NULL,
    `deleted_by` INT(11) NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_dept_facility_day` (`department_id`, `facility_id`, `day_of_week`),
    KEY `idx_dept_active` (`department_id`, `is_active`),
    KEY `idx_day_of_week` (`day_of_week`),
    KEY `fk_cos_facility` (`facility_id`),
    CONSTRAINT `fk_cos_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_cos_facility` FOREIGN KEY (`facility_id`) REFERENCES `facilities` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
