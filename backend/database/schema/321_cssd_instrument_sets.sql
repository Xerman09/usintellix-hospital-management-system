-- =====================================================================
-- Subsystem: Central Sterile Supply Department (CSSD / CCSD)
-- File: 321_cssd_instrument_sets.sql
-- Description: Surgical Instrument Sets & Trays Manifest Engine
--              Tracks Master Tray catalogs, piece-by-piece instrument manifests,
--              individual barcoded physical trays, and complete decontamination lifecycle.
-- =====================================================================

-- 1. Master Surgical Tray Catalog
CREATE TABLE IF NOT EXISTS `cssd_master_trays` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tray_code` VARCHAR(50) NOT NULL UNIQUE,
    `name` VARCHAR(150) NOT NULL,
    `department_specialty` VARCHAR(100) NOT NULL DEFAULT 'General Surgery',
    `category` ENUM(
        'major_surgical',
        'minor_surgical',
        'laparoscopic_endoscopic',
        'orthopedic_trauma',
        'maternity_obgyn',
        'specialized_micro'
    ) NOT NULL DEFAULT 'major_surgical',
    `total_pieces` INT NOT NULL DEFAULT 0,
    `sterilization_modality` ENUM(
        'steam_autoclave',
        'ethylene_oxide_eto',
        'hydrogen_peroxide_plasma',
        'dry_heat'
    ) NOT NULL DEFAULT 'steam_autoclave',
    `target_temp_celsius` DECIMAL(5,2) NOT NULL DEFAULT 134.00,
    `target_exposure_minutes` DECIMAL(5,2) NOT NULL DEFAULT 4.00,
    `target_pressure_psi` DECIMAL(5,2) NOT NULL DEFAULT 30.50,
    `standard_wrapper_type` ENUM(
        'rigid_container',
        'non_woven_sms',
        'crepe_paper',
        'tyvek_pouch'
    ) NOT NULL DEFAULT 'rigid_container',
    `shelf_life_days` INT NOT NULL DEFAULT 30,
    `instructions` TEXT NULL,
    `status` ENUM('active', 'inactive', 'retired') NOT NULL DEFAULT 'active',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_cmt_code` (`tray_code`),
    KEY `idx_cmt_specialty` (`department_specialty`),
    KEY `idx_cmt_category` (`category`),
    KEY `idx_cmt_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Master Tray Itemized Manifest (Piece-by-Piece Instrument Count)
CREATE TABLE IF NOT EXISTS `cssd_master_tray_items` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `master_tray_id` INT NOT NULL,
    `item_seq` INT NOT NULL DEFAULT 1,
    `instrument_name` VARCHAR(150) NOT NULL,
    `instrument_type` ENUM(
        'cutting_dissecting',
        'clamping_occluding',
        'grasping_holding',
        'retracting_exposing',
        'suturing_stapling',
        'suctioning_probing',
        'miscellaneous'
    ) NOT NULL DEFAULT 'clamping_occluding',
    `quantity_required` INT NOT NULL DEFAULT 1,
    `size_or_gauge` VARCHAR(50) NULL,
    `critical_inspection_point` VARCHAR(255) NULL,
    `is_critical_count` TINYINT(1) NOT NULL DEFAULT 1,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_cmti_tray` (`master_tray_id`),
    KEY `idx_cmti_type` (`instrument_type`),
    CONSTRAINT `fk_cmti_master` FOREIGN KEY (`master_tray_id`) REFERENCES `cssd_master_trays` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Individual Barcoded Physical Trays in Circulation
CREATE TABLE IF NOT EXISTS `cssd_physical_trays` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `tray_barcode` VARCHAR(50) NOT NULL UNIQUE,
    `master_tray_id` INT NOT NULL,
    `serial_number` VARCHAR(50) NULL,
    `current_status` ENUM(
        'dirty_received',
        'decontaminating',
        'assembled_wrapped',
        'sterilizing',
        'sterile_stored',
        'dispatched_surgery',
        'in_surgery',
        'returned_dirty',
        'quarantined_missing_item',
        'maintenance_repair'
    ) NOT NULL DEFAULT 'sterile_stored',
    `current_location` VARCHAR(150) NOT NULL DEFAULT 'CSSD Sterile Storage Shelf A-1',
    `assigned_or_suite` VARCHAR(100) NULL,
    `last_sterilization_batch_id` VARCHAR(50) NULL,
    `last_sterilization_cycle_no` VARCHAR(50) NULL,
    `last_sterilized_at` DATETIME NULL,
    `sterile_expiry_date` DATE NULL,
    `packaging_technician_name` VARCHAR(100) NULL,
    `assembly_verified_by` VARCHAR(100) NULL,
    `instrument_count_verified` TINYINT(1) NOT NULL DEFAULT 1,
    `missing_pieces_notes` TEXT NULL,
    `chemical_indicator_result` ENUM('passed', 'failed', 'pending', 'not_applicable') NOT NULL DEFAULT 'passed',
    `biological_spore_result` ENUM('negative_pass', 'positive_fail', 'incubating', 'not_applicable') NOT NULL DEFAULT 'negative_pass',
    `total_sterilization_cycles` INT NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY `idx_cpt_barcode` (`tray_barcode`),
    KEY `idx_cpt_master` (`master_tray_id`),
    KEY `idx_cpt_status` (`current_status`),
    KEY `idx_cpt_location` (`current_location`),
    KEY `idx_cpt_expiry` (`sterile_expiry_date`),
    CONSTRAINT `fk_cpt_master` FOREIGN KEY (`master_tray_id`) REFERENCES `cssd_master_trays` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Complete Decontamination and Lifecycle Audit Trail
CREATE TABLE IF NOT EXISTS `cssd_tray_lifecycle_events` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `physical_tray_id` INT NOT NULL,
    `event_type` ENUM(
        'dirty_intake',
        'wash_disinfection_completed',
        'assembly_manifest_verified',
        'wrapped_sealed',
        'sterilization_started',
        'sterilization_passed',
        'sterilization_failed',
        'sterile_shelved',
        'dispatched_to_or',
        'or_count_in',
        'or_count_out',
        'returned_to_cssd',
        'quarantined',
        'maintenance'
    ) NOT NULL,
    `from_status` VARCHAR(50) NULL,
    `to_status` VARCHAR(50) NOT NULL,
    `location` VARCHAR(150) NOT NULL,
    `operator_name` VARCHAR(100) NOT NULL,
    `instruments_verified_count` INT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_ctle_tray` (`physical_tray_id`),
    KEY `idx_ctle_event` (`event_type`),
    KEY `idx_ctle_date` (`created_at`),
    CONSTRAINT `fk_ctle_tray` FOREIGN KEY (`physical_tray_id`) REFERENCES `cssd_physical_trays` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Initialize Barcode Sequence Counter
INSERT INTO `billing_tariff_counters` (`counter_type`, `year`, `last_number`)
VALUES ('CSSD_TRAY', YEAR(CURRENT_DATE), 0)
ON DUPLICATE KEY UPDATE `counter_type` = `counter_type`;
