-- Migration 288: Account Lifecycle & Department Mapping
-- Subsystem 1: User Management & Role-Based Access Control (RBAC)

-- 1. Add status and lifecycle columns to users table
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'status');

SET @sql := IF(@col_exists = 0, 
    "ALTER TABLE `users` 
        ADD COLUMN `status` ENUM('active', 'suspended', 'locked', 'decommissioned') NOT NULL DEFAULT 'active' AFTER `is_locked`,
        ADD COLUMN `status_reason` VARCHAR(255) NULL AFTER `status`,
        ADD COLUMN `status_updated_at` DATETIME NULL AFTER `status_reason`,
        ADD COLUMN `status_updated_by` INT NULL AFTER `status_updated_at`",
    "SELECT 'Column status already exists on users'");
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Sync any locked users
UPDATE `users` SET `status` = 'locked' WHERE `is_locked` = 1 AND `status` = 'active';

-- 2. Add secondary department and clinical duty tags to employees table
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'employees' 
    AND COLUMN_NAME = 'secondary_department_id');

SET @sql := IF(@col_exists = 0, 
    "ALTER TABLE `employees` 
        ADD COLUMN `secondary_department_id` INT NULL AFTER `department_id`,
        ADD COLUMN `duty_tag` VARCHAR(50) NOT NULL DEFAULT 'primary' AFTER `secondary_department_id`,
        ADD COLUMN `assignment_notes` TEXT NULL AFTER `duty_tag`,
        ADD CONSTRAINT `fk_employees_sec_dept` FOREIGN KEY (`secondary_department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL",
    "SELECT 'Column secondary_department_id already exists on employees'");
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 3. Create user_session_histories table for active session inspection and audit
CREATE TABLE IF NOT EXISTS `user_session_histories` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL,
    `session_id` VARCHAR(128) NOT NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` TEXT NULL,
    `device_type` VARCHAR(50) NULL DEFAULT 'Desktop',
    `login_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `last_activity_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `logout_at` DATETIME NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `revoked_by` INT NULL,
    `revocation_reason` VARCHAR(255) NULL,
    CONSTRAINT `fk_user_sessions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    INDEX `idx_user_sessions_user` (`user_id`, `is_active`),
    INDEX `idx_user_sessions_session` (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Create employee_department_assignments for multi-department duty mappings
CREATE TABLE IF NOT EXISTS `employee_department_assignments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `employee_id` INT NOT NULL,
    `department_id` INT NOT NULL,
    `assignment_type` ENUM('primary', 'secondary', 'on_call', 'rotation', 'consultant') NOT NULL DEFAULT 'primary',
    `is_primary` TINYINT(1) NOT NULL DEFAULT 0,
    `assigned_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `assigned_by` INT NULL,
    CONSTRAINT `fk_emp_dept_emp_id` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_emp_dept_dept_id` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE CASCADE,
    UNIQUE KEY `uq_emp_dept_assignment` (`employee_id`, `department_id`, `assignment_type`),
    INDEX `idx_emp_dept_lookup` (`employee_id`, `is_primary`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
