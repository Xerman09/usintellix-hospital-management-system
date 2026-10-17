-- =====================================================================
-- Migration 291: Visual Department Organizational Mapping
-- Links Facility -> Department -> Head of Department -> Assigned Wards -> Staff
-- =====================================================================

-- 1. Ensure hospital_wards has department_id linking wards directly to clinical departments
SET @col_exists := (SELECT COUNT(*) FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'hospital_wards' 
    AND COLUMN_NAME = 'department_id');

SET @sql := IF(@col_exists = 0, 
    "ALTER TABLE `hospital_wards` 
        ADD COLUMN `department_id` INT(11) NULL AFTER `stock_warehouse_id`,
        ADD KEY `idx_hw_department` (`department_id`),
        ADD CONSTRAINT `fk_hw_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE SET NULL",
    "SELECT 'Column department_id already exists on hospital_wards'");
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2. Ensure departments foreign key head_of_department_id references employees table
-- (Note: head_of_department_id already exists in departments table)
SET @fk_exists := (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'departments' 
    AND CONSTRAINT_NAME = 'fk_departments_head');

SET @sql := IF(@fk_exists = 0,
    "ALTER TABLE `departments`
        ADD CONSTRAINT `fk_departments_head` FOREIGN KEY (`head_of_department_id`) REFERENCES `employees` (`id`) ON DELETE SET NULL",
    "SELECT 'Foreign key fk_departments_head already exists on departments'");
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
