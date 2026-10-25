-- =====================================================================
-- Migration 319: Hospital Non-Pharmaceutical Supply Catalog
-- Tables: supply_catalog_items, supply_catalog_departments
-- Tracks item code, unit of measure, minimum safety stock, standard cost,
-- patient billing price, sterility, burn rates, and supplier linking.
-- =====================================================================

SET NAMES utf8mb4;

-- 1. Non-Pharmaceutical Hospital Supply Master Catalog
CREATE TABLE IF NOT EXISTS `supply_catalog_items` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `item_code` VARCHAR(50) NOT NULL UNIQUE,
    `item_name` VARCHAR(255) NOT NULL,
    `category` ENUM(
        'medical_surgical',
        'ppe_infection_control',
        'wound_care',
        'respiratory_airway',
        'catheters_tubing',
        'laboratory_disposables',
        'radiology_supplies',
        'linen_bedding',
        'cleaning_disinfectants',
        'office_administrative'
    ) NOT NULL DEFAULT 'medical_surgical',
    `sub_category` VARCHAR(100) NULL,
    `brand_manufacturer` VARCHAR(150) NULL,
    `unit_of_measure` VARCHAR(50) NOT NULL DEFAULT 'piece',
    `packaging_description` VARCHAR(255) NULL,
    `standard_cost` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    `selling_price` DECIMAL(12, 4) NOT NULL DEFAULT 0.0000,
    `is_billable_to_patient` TINYINT(1) NOT NULL DEFAULT 1,
    `min_safety_stock` DECIMAL(12, 2) NOT NULL DEFAULT 20.00,
    `max_stock_level` DECIMAL(12, 2) NOT NULL DEFAULT 200.00,
    `current_stock` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `reorder_quantity` DECIMAL(12, 2) NOT NULL DEFAULT 50.00,
    `storage_requirements` VARCHAR(255) NULL DEFAULT 'Store in clean, dry area below 25°C',
    `sterility_type` ENUM('sterile', 'non_sterile', 'not_applicable') NOT NULL DEFAULT 'sterile',
    `is_single_use` TINYINT(1) NOT NULL DEFAULT 1,
    `barcode_sku` VARCHAR(100) NULL,
    `preferred_supplier_id` INT NULL,
    `preferred_supplier_name` VARCHAR(150) NULL,
    `status` ENUM('active', 'discontinued', 'backordered', 'phase_out') NOT NULL DEFAULT 'active',
    `notes` TEXT NULL,
    `created_by` INT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY `idx_sci_code` (`item_code`),
    KEY `idx_sci_category` (`category`),
    KEY `idx_sci_status` (`status`),
    KEY `idx_sci_billable` (`is_billable_to_patient`),
    KEY `idx_sci_stock` (`current_stock`, `min_safety_stock`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Department Par Stock Quotas & Daily Consumption Rates
CREATE TABLE IF NOT EXISTS `supply_catalog_departments` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `item_id` INT UNSIGNED NOT NULL,
    `department_id` INT NULL,
    `department_name` VARCHAR(100) NOT NULL,
    `par_level` DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
    `daily_burn_rate` DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_item_dept` (`item_id`, `department_name`),
    CONSTRAINT `fk_scd_item` FOREIGN KEY (`item_id`) REFERENCES `supply_catalog_items` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Initialize Counter Sequence
INSERT IGNORE INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
VALUES ('SUPPLY_ITEM', YEAR(NOW()), 0);
