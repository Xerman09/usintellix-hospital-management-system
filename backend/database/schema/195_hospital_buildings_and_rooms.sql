-- =========================================================
-- HOSPITAL BUILDINGS, ROOMS & BED MANAGEMENT SCHEMA
-- Hierarchical structure: Building -> Room -> Bed
-- With real-time availability tracking and front-desk pricing
-- =========================================================

-- 1. Table: hospital_buildings
CREATE TABLE IF NOT EXISTS `hospital_buildings` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `facility_id` INT NULL,
    `building_code` VARCHAR(30) NOT NULL UNIQUE,
    `building_name` VARCHAR(100) NOT NULL,
    `total_floors` INT NOT NULL DEFAULT 1,
    `location_description` TEXT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_bldg_code` (`building_code`),
    INDEX `idx_bldg_active` (`is_active`),
    INDEX `idx_bldg_facility` (`facility_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: hospital_rooms
CREATE TABLE IF NOT EXISTS `hospital_rooms` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `building_id` INT UNSIGNED NOT NULL,
    `ward_id` INT UNSIGNED NULL,
    `floor_number` VARCHAR(50) NOT NULL DEFAULT '1st Floor',
    `room_number` VARCHAR(50) NOT NULL,
    `room_name` VARCHAR(100) NULL,
    `room_type` ENUM('General Ward', 'Semi-Private', 'Private', 'Deluxe Suite', 'ICU', 'Isolation', 'Operating Room', 'Emergency Bay') NOT NULL DEFAULT 'General Ward',
    `daily_rate` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `max_beds` INT NOT NULL DEFAULT 1,
    `gender_restriction` ENUM('All', 'Male Only', 'Female Only', 'Pediatric') NOT NULL DEFAULT 'All',
    `status` ENUM('Available', 'Occupied', 'Partially Occupied', 'Dirty / Turnover', 'Maintenance', 'Blocked') NOT NULL DEFAULT 'Available',
    `amenities` TEXT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX `idx_room_building` (`building_id`),
    INDEX `idx_room_ward` (`ward_id`),
    INDEX `idx_room_floor` (`floor_number`),
    INDEX `idx_room_type` (`room_type`),
    INDEX `idx_room_status` (`status`),
    INDEX `idx_room_active` (`is_active`),
    UNIQUE KEY `uq_building_room_number` (`building_id`, `room_number`),
    CONSTRAINT `fk_rooms_building` FOREIGN KEY (`building_id`) REFERENCES `hospital_buildings` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_rooms_ward` FOREIGN KEY (`ward_id`) REFERENCES `hospital_wards` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Alter Table: hospital_beds (safely add room_id and daily_rate if not exists)
SET @dbname = DATABASE();
SET @tablename = "hospital_beds";
SET @columnname = "room_id";
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `hospital_beds` ADD COLUMN `room_id` INT UNSIGNED NULL AFTER `ward_id`, ADD CONSTRAINT `fk_beds_room` FOREIGN KEY (`room_id`) REFERENCES `hospital_rooms` (`id`) ON DELETE SET NULL;"
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @columnname2 = "daily_rate";
SET @preparedStatement2 = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname2
  ) > 0,
  "SELECT 1",
  "ALTER TABLE `hospital_beds` ADD COLUMN `daily_rate` DECIMAL(10, 2) NULL AFTER `features`;"
));
PREPARE alterIfNotExists2 FROM @preparedStatement2;
EXECUTE alterIfNotExists2;
DEALLOCATE PREPARE alterIfNotExists2;
