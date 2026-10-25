-- =====================================================================
-- Migration 319: Hospital Master Tariff Book & Service Package Management
-- (Fulfills Schema Migration specification: 311_billing_tariffs_and_packages.sql)
-- Tables: billing_tariff_master, billing_service_packages, billing_package_items, billing_tariff_counters
-- Provides a centralized institutional price book cataloguing every chargeable
-- hospital service with standard price, emergency surcharge, night differential,
-- holiday surcharge, taxability/VAT-exempt flags, and bundled service packages.
-- =====================================================================

CREATE TABLE IF NOT EXISTS `billing_tariff_master` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `tariff_code` VARCHAR(50) NOT NULL UNIQUE,
    `service_name` VARCHAR(255) NOT NULL,
    `category` ENUM(
        'consultation',
        'nursing_care',
        'bedside_procedure',
        'operating_theater',
        'emergency_service',
        'diagnostic_lab',
        'radiology_imaging',
        'supplies_equipment',
        'room_board',
        'miscellaneous'
    ) NOT NULL DEFAULT 'bedside_procedure',

    `department_id` INT DEFAULT NULL,
    `billing_unit` ENUM(
        'per_visit',
        'per_day',
        'per_hour',
        'per_procedure',
        'per_item',
        'per_test',
        'per_session'
    ) NOT NULL DEFAULT 'per_procedure',

    -- Pricing & Surcharges
    `standard_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `emergency_surcharge_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `night_diff_surcharge_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `holiday_surcharge_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,

    -- Taxability & Insurance Coverage
    `taxability_flag` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '0 = Tax-exempt / Medical VAT-exempt, 1 = Taxable',
    `tax_rate_pct` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    `hmo_covered_flag` TINYINT(1) NOT NULL DEFAULT 1,
    `hmo_standard_reimbursement` DECIMAL(12,2) DEFAULT NULL,
    `cpt_hcpcs_code` VARCHAR(30) DEFAULT NULL,

    `description` TEXT DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,
    `effective_start_date` DATE DEFAULT NULL,
    `effective_end_date` DATE DEFAULT NULL,

    `created_by` INT DEFAULT NULL,
    `updated_by` INT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY `idx_btm_category` (`category`),
    KEY `idx_btm_dept` (`department_id`),
    KEY `idx_btm_active` (`is_active`),
    KEY `idx_btm_cpt` (`cpt_hcpcs_code`),
    KEY `idx_btm_code` (`tariff_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_service_packages` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `package_code` VARCHAR(50) NOT NULL UNIQUE,
    `package_name` VARCHAR(255) NOT NULL,
    `package_type` ENUM(
        'maternity_delivery',
        'surgical_procedure',
        'executive_checkup',
        'icu_critical_care',
        'dialysis_bundle',
        'chemotherapy_cycle',
        'wellness_screening'
    ) NOT NULL DEFAULT 'surgical_procedure',

    `department_id` INT DEFAULT NULL,
    `standard_package_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `discounted_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `included_bed_days` INT NOT NULL DEFAULT 0,
    `included_room_type` VARCHAR(100) DEFAULT NULL,

    `taxability_flag` TINYINT(1) NOT NULL DEFAULT 0,
    `hmo_covered_flag` TINYINT(1) NOT NULL DEFAULT 1,

    `description` TEXT DEFAULT NULL,
    `inclusions_summary` TEXT DEFAULT NULL,
    `exclusions_summary` TEXT DEFAULT NULL,
    `terms_and_conditions` TEXT DEFAULT NULL,
    `is_active` TINYINT(1) NOT NULL DEFAULT 1,

    `created_by` INT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    KEY `idx_bsp_type` (`package_type`),
    KEY `idx_bsp_active` (`is_active`),
    KEY `idx_bsp_code` (`package_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_package_items` (
    `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    `package_id` INT UNSIGNED NOT NULL,
    `tariff_id` INT UNSIGNED DEFAULT NULL,
    `item_code` VARCHAR(50) NOT NULL,
    `item_name` VARCHAR(255) NOT NULL,
    `category` VARCHAR(50) NOT NULL DEFAULT 'service',
    `quantity` DECIMAL(8,2) NOT NULL DEFAULT 1.00,
    `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `covered_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    `is_mandatory` TINYINT(1) NOT NULL DEFAULT 1,
    `notes` TEXT DEFAULT NULL,

    KEY `idx_bpi_package` (`package_id`),
    KEY `idx_bpi_tariff` (`tariff_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `billing_tariff_counters` (
    `counter_type` VARCHAR(30) NOT NULL,
    `year` INT NOT NULL,
    `last_number` INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (`counter_type`, `year`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize counters
INSERT IGNORE INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`) VALUES
('TARIFF', YEAR(CURRENT_DATE()), 0),
('PACKAGE', YEAR(CURRENT_DATE()), 0);
