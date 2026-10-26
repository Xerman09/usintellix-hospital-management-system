-- =====================================================================
-- Subsystem: Central Sterile Supply Department (CSSD / CCSD)
-- File: 322_cssd_sterilization_batches.sql
-- Description: Autoclave Sterilization Batch Validation & Thermal Label Engine
--              Tracks Autoclave / Plasma equipment, physical cycle parameters
--              (Peak Temp 134°C, Pressure 2.2 bar, Hold 18 mins), Bowie-Dick
--              air removal test, Biological Indicator spore test
--              (Geobacillus stearothermophilus), and thermal label barcode generation.
-- =====================================================================

-- 1. Sterilizer Equipment Mapping
CREATE TABLE IF NOT EXISTS `cssd_sterilizer_machines` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `machine_code` VARCHAR(50) NOT NULL UNIQUE,
    `machine_name` VARCHAR(150) NOT NULL,
    `sterilization_type` ENUM(
        'steam_autoclave',
        'hydrogen_peroxide_plasma',
        'ethylene_oxide_eto',
        'dry_heat'
    ) NOT NULL DEFAULT 'steam_autoclave',
    `location` VARCHAR(150) NOT NULL DEFAULT 'CSSD Central Sterilizer Bay',
    `serial_number` VARCHAR(100) NULL,
    `manufacturer` VARCHAR(100) NOT NULL DEFAULT 'Getinge Hospital Systems',
    `model_number` VARCHAR(100) NULL,
    `chamber_volume_liters` DECIMAL(8,2) NOT NULL DEFAULT 450.00,
    `max_operating_temp_c` DECIMAL(5,2) NOT NULL DEFAULT 138.00,
    `max_operating_pressure_bar` DECIMAL(5,2) NOT NULL DEFAULT 3.20,
    `daily_bowie_dick_passed` TINYINT(1) NOT NULL DEFAULT 1,
    `last_bowie_dick_at` DATETIME NULL,
    `status` ENUM(
        'ready',
        'in_cycle',
        'maintenance',
        'out_of_service',
        'quarantined_spore_failure'
    ) NOT NULL DEFAULT 'ready',
    `total_completed_cycles` INT NOT NULL DEFAULT 0,
    `last_preventative_maintenance` DATE NULL,
    `next_maintenance_due` DATE NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_csm_code` (`machine_code`),
    KEY `idx_csm_type` (`sterilization_type`),
    KEY `idx_csm_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Autoclave Sterilization Batches
CREATE TABLE IF NOT EXISTS `cssd_sterilization_batches` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `batch_number` VARCHAR(50) NOT NULL UNIQUE,
    `sterilizer_machine_id` INT NOT NULL,
    `cycle_number` INT NOT NULL DEFAULT 1,
    `cycle_type` ENUM(
        'wrapped_instruments_134c',
        'unwrapped_flash_134c',
        'prion_inactivation_134c',
        'delicate_plastics_121c',
        'plasma_standard',
        'plasma_advanced'
    ) NOT NULL DEFAULT 'wrapped_instruments_134c',
    `cycle_start_time` DATETIME NOT NULL,
    `cycle_end_time` DATETIME NULL,
    `operator_user_id` INT NULL,
    `operator_name` VARCHAR(150) NOT NULL,
    `supervisor_verified_by` VARCHAR(150) NULL,

    -- Physical Cycle Parameters Validation
    `peak_temperature_celsius` DECIMAL(5,2) NOT NULL DEFAULT 134.00,
    `pressure_bar` DECIMAL(5,2) NOT NULL DEFAULT 2.20,
    `hold_duration_minutes` DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    `vacuum_leak_rate_mbar_min` DECIMAL(5,2) NOT NULL DEFAULT 0.80,

    -- Quality Indicators & Biological Spore Validation
    `bowie_dick_test_result` ENUM('pass', 'fail', 'not_applicable') NOT NULL DEFAULT 'pass',
    `chemical_indicator_class` ENUM('class_4_multi_variable', 'class_5_integrator', 'class_6_emulating', 'none') NOT NULL DEFAULT 'class_5_integrator',
    `chemical_indicator_result` ENUM('pass', 'fail', 'pending') NOT NULL DEFAULT 'pass',
    `biological_indicator_lot` VARCHAR(100) NULL DEFAULT '3M-Attest-BI-4921B',
    `biological_spore_organism` VARCHAR(100) NOT NULL DEFAULT 'Geobacillus stearothermophilus',
    `biological_spore_result` ENUM('no_growth_negative', 'growth_positive', 'incubating_pending', 'not_run') NOT NULL DEFAULT 'no_growth_negative',
    `spore_incubation_hours` DECIMAL(4,1) NOT NULL DEFAULT 24.0,
    `spore_read_at` DATETIME NULL,
    `spore_read_by` VARCHAR(150) NULL,

    -- Batch Release & Sterility Expiry Lifecycle
    `batch_status` ENUM(
        'in_progress',
        'cycle_passed_quarantined_bi',
        'released_sterile',
        'cycle_aborted',
        'batch_failed_quarantined'
    ) NOT NULL DEFAULT 'released_sterile',
    `total_trays_loaded` INT NOT NULL DEFAULT 0,
    `total_packs_loaded` INT NOT NULL DEFAULT 0,
    `sterilization_date` DATE NOT NULL,
    `sterile_shelf_life_days` INT NOT NULL DEFAULT 180,
    `sterility_expiry_date` DATE NOT NULL,
    `release_notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_csb_number` (`batch_number`),
    KEY `idx_csb_machine` (`sterilizer_machine_id`),
    KEY `idx_csb_status` (`batch_status`),
    KEY `idx_csb_spore` (`biological_spore_result`),
    KEY `idx_csb_date` (`sterilization_date`),
    KEY `idx_csb_expiry` (`sterility_expiry_date`),
    CONSTRAINT `fk_csb_machine` FOREIGN KEY (`sterilizer_machine_id`) REFERENCES `cssd_sterilizer_machines` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Batch Loaded Trays & Packages Linkage
CREATE TABLE IF NOT EXISTS `cssd_sterilization_batch_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `batch_id` INT NOT NULL,
    `physical_tray_id` INT NULL,
    `item_barcode` VARCHAR(100) NOT NULL,
    `item_description` VARCHAR(255) NOT NULL,
    `item_type` ENUM('instrument_tray', 'peel_pouch', 'linen_pack', 'basin_set', 'implant_cassette') NOT NULL DEFAULT 'instrument_tray',
    `wrapper_type` VARCHAR(100) NOT NULL DEFAULT 'rigid_container',
    `load_rack_shelf` VARCHAR(50) NOT NULL DEFAULT 'Rack 1 - Middle Tier',
    `item_sterility_expiry_date` DATE NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_csbi_batch` (`batch_id`),
    KEY `idx_csbi_tray` (`physical_tray_id`),
    KEY `idx_csbi_barcode` (`item_barcode`),
    CONSTRAINT `fk_csbi_batch` FOREIGN KEY (`batch_id`) REFERENCES `cssd_sterilization_batches` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Batch Sequence Counter
INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
VALUES ('CSSD_BATCH', YEAR(CURRENT_DATE), 0)
ON DUPLICATE KEY UPDATE `counter_type` = `counter_type`;
